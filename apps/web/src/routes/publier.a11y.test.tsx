/**
 * La page de publication auditée par axe-core dans chacun de ses états : l'annonce, la
 * confirmation, puis le formulaire où l'annonce incomplète a mené le conducteur. Le contraste se
 * vérifie dans un navigateur (`test/axe.ts`). Quand ce que le conducteur vient d'actionner
 * disparaît, le focus le suit : sans cela, il retomberait au début de la page.
 */
import type { TripDraft } from '@joj/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockControl } from '@/mocks/control';
import { axeFindings, runAxe } from '@/test/axe';
import { renderRoute } from '@/test/utils';

/** « AAAA-MM-JJT08:00 » à Dakar (UTC+0), demain. */
const tomorrowAt8 = () =>
  `${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}T08:00`;

const understood = (draft: Partial<TripDraft> = {}): TripDraft => ({
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt: tomorrowAt8(),
  seats: 3,
  pricePerSeat: 1000,
  ...draft,
});

async function publishAnnouncement(announcement: string) {
  const user = userEvent.setup();
  await renderRoute({ initialEntries: ['/publier'] });
  await user.type(screen.getByLabelText('Votre annonce WhatsApp'), announcement);
  await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');
  await user.click(screen.getByRole('button', { name: 'Publier' }));
}

describe('publication page accessibility', () => {
  it('006-AS1: the announcement and the confirmation are clean', async () => {
    mockControl.setTripDraft(understood());
    await renderRoute({ initialEntries: ['/publier'] });
    expect(axeFindings(await runAxe())).toEqual([]);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText('Votre annonce WhatsApp'),
      'je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F',
    );
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    await screen.findByRole('region', { name: 'Trajet publié' });

    // Le bouton « Publier » a disparu : le focus passe au billet, lu en premier.
    expect(screen.getByRole('heading', { name: 'Trajet publié' })).toHaveFocus();
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('006-AS3: the form with missing fields is clean', async () => {
    mockControl.setTripDraft(
      understood({ departurePlace: null, site: null, departureAt: null, seats: null }),
    );
    await publishAnnouncement('je vais aux Jeux, qui vient ?');
    const form = await screen.findByRole('form', { name: 'Publier avec le formulaire' });

    // L'annonce a laissé place au formulaire : le focus va au premier champ à compléter.
    expect(within(form).getByLabelText('Lieu de départ')).toHaveFocus();
    expect(axeFindings(await runAxe())).toEqual([]);
  });
});
