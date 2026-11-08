/**
 * L'accueil sur un écran de téléphone : une fois le site choisi, la scène de la mascotte se
 * resserre et les départs suivent immédiatement le choix du site. jsdom ne mesure rien : la
 * hauteur se vérifie dans un navigateur à 360 × 640 ; ici, la structure qui la rend possible.
 * Puis un audit axe-core de chaque état de l'accueil.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { problem } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { axeFindings, runAxe } from '@/test/axe';
import { renderRoute } from '@/test/utils';

const stageOf = () =>
  screen.getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' }).closest('[data-compact]');

async function openBookingForm() {
  const user = userEvent.setup();
  await renderRoute({ initialEntries: ['/?site=diamniadio'] });
  await user.click(await screen.findByRole('button', { name: 'Réserver une place depuis Pikine' }));
  const form = screen.getByRole('form', { name: 'Réserver depuis Pikine' });
  await user.type(within(form).getByLabelText('Votre nom'), 'Awa');
  await user.type(within(form).getByLabelText('Votre téléphone'), '77 123 45 67');
  return { user, form };
}

describe('home page on a phone screen', () => {
  it('005-AS7: shows the departures right after the site picker, with a compact stage', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });
    expect(stageOf()).toHaveAttribute('data-compact', 'false');

    await user.click(screen.getByRole('radio', { name: 'Diamniadio' }));

    const list = await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(stageOf()).toHaveAttribute('data-compact', 'true');
    const picker = screen.getByRole('group', { name: 'Votre site d’épreuve' });
    expect(picker.nextElementSibling).toBe(list);
  });
});

describe('home page accessibility', () => {
  it('005-AS6: the home page without a chosen site is clean', async () => {
    await renderRoute({ initialEntries: ['/'] });
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('005-AS1: the list of departures is clean', async () => {
    await renderRoute({ initialEntries: ['/?site=dakar'] });
    await screen.findByRole('list', { name: 'Départs vers Dakar' });
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('005-AS5: the booking form with a refusal is clean', async () => {
    server.use(
      http.post('*/api/trips/:tripId/bookings', () => problem(409, 'TRIP_FULL', 'Full.'), {
        once: true,
      }),
    );
    const { user, form } = await openBookingForm();
    await user.click(within(form).getByRole('button', { name: 'Confirmer la réservation' }));
    await within(form).findByRole('alert');
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('005-AS4: the booking confirmation is clean', async () => {
    const { user, form } = await openBookingForm();
    await user.click(within(form).getByRole('button', { name: 'Confirmer la réservation' }));
    await screen.findByRole('region', { name: 'Place réservée' });
    expect(axeFindings(await runAxe())).toEqual([]);
  });
});
