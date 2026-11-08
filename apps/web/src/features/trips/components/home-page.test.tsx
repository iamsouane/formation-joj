/**
 * L'accueil `/`, monté par sa vraie route sur la fausse API (`mocks/handlers.ts`) : choisir un
 * site, puis voir ses départs à venir, triés par heure. Chaque test vérifie ce que l'écran montre.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockControl } from '@/mocks/control';
import { fixture, guediawayeToDiamniadio, pikineToDiamniadio } from '@/mocks/fixture';
import { renderRoute } from '@/test/utils';
import { formatDeparture } from './format';

async function open(path = '/') {
  const user = userEvent.setup();
  const rendered = await renderRoute({ initialEntries: [path] });
  return { user, ...rendered };
}

describe('HomePage', () => {
  it('005-AS1: lists the upcoming departures of the chosen site by time', async () => {
    const { user, router } = await open();

    await user.click(screen.getByRole('radio', { name: 'Diamniadio' }));

    const list = await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Pikine',
      'Guédiawaye',
    ]);
    expect(items[0]).toHaveTextContent(formatDeparture(pikineToDiamniadio.departureAt));
    expect(items[0]).toHaveTextContent('3 places restantes');
    expect(items[0]).toHaveTextContent(/1\s000\sFCFA/);
    expect(items[1]).toHaveTextContent(formatDeparture(guediawayeToDiamniadio.departureAt));
    expect(items[1]).toHaveTextContent('4 places restantes');
    expect(items[1]).toHaveTextContent(/1\s500\sFCFA/);
    expect(router.state.location.search).toEqual({ site: 'diamniadio' });
  });

  it('005-AS1: opens on the site given in the address', async () => {
    await open('/?site=saly');

    expect(screen.getByRole('radio', { name: 'Saly' })).toBeChecked();
    const list = await screen.findByRole('list', { name: 'Départs vers Saly' });
    expect(within(list).getByRole('heading', { name: 'Plateau' })).toBeInTheDocument();
    expect(within(list).getByRole('listitem')).toHaveTextContent('2 places restantes');
  });

  it('005-AS1: shows an error when the departures cannot be loaded', async () => {
    mockControl.failPersistently('GET /api/trips');
    await open('/?site=dakar');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les départs. Réessayez dans un instant.',
    );
  });

  it('005-AS1: lays the departures out in a grid on wide screens', async () => {
    await open('/?site=diamniadio');

    const list = await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    // Une colonne sur téléphone, deux ou trois sur grand écran : `styles.css` décide selon la largeur.
    expect(list).toHaveAttribute('data-layout', 'grid');
    expect(list.closest('[data-slot="departures"]')).not.toBeNull();
  });

  it('005-AS2: says when no departure is planned', async () => {
    fixture.trips = fixture.trips.filter((trip) => trip.site !== 'saly');
    const { user } = await open();

    await user.click(screen.getByRole('radio', { name: 'Saly' }));

    const empty = await screen.findByRole('region', {
      name: 'Aucun départ pour l’instant vers Saly',
    });
    expect(empty.querySelector('img[src="/brand/mascotte-debout-800.png"]')).not.toBeNull();
    expect(screen.queryByRole('list', { name: 'Départs vers Saly' })).not.toBeInTheDocument();
  });

  it('005-AS2: offers the other sites that have departures, next to the mascot', async () => {
    fixture.trips = fixture.trips.filter((trip) => trip.site === 'dakar');
    const { user, router } = await open('/?site=saly');

    const empty = await screen.findByRole('region', {
      name: 'Aucun départ pour l’instant vers Saly',
    });
    const offer = await within(empty).findByRole('button', { name: 'Voir les départs vers Dakar' });
    // Diamniadio n'a aucun départ : il n'est pas proposé.
    expect(within(empty).getAllByRole('button')).toHaveLength(1);

    await user.click(offer);

    expect(await screen.findByRole('list', { name: 'Départs vers Dakar' })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ site: 'dakar' });
  });
});
