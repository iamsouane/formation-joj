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

  it('005-AS1: lets the departures of a site leave before those of the next one enter', async () => {
    const { user } = await open('/?site=dakar');
    await screen.findByRole('list', { name: 'Départs vers Dakar' });
    // Le plus grand nombre de listes présentes en même temps, à chaque changement du DOM.
    let mostListsAtOnce = 0;
    const observer = new MutationObserver(() => {
      const lists = document.querySelectorAll('ul[aria-label^="Départs vers"]').length;
      mostListsAtOnce = Math.max(mostListsAtOnce, lists);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    await user.click(screen.getByRole('radio', { name: 'Diamniadio' }));

    // D'abord, l'ancienne liste sort, seule…
    const leaving = screen.getByRole('list', { name: 'Départs vers Dakar' });
    expect(leaving.closest('[data-phase]')).toHaveAttribute('data-phase', 'leaving');
    expect(screen.queryByRole('list', { name: 'Départs vers Diamniadio' })).not.toBeInTheDocument();
    // …puis la nouvelle entre, et les deux ne sont jamais à l'écran ensemble.
    const entering = await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(entering.closest('[data-phase]')).toHaveAttribute('data-phase', 'entering');
    expect(screen.queryByRole('list', { name: 'Départs vers Dakar' })).not.toBeInTheDocument();
    observer.disconnect();
    expect(mostListsAtOnce).toBe(1);
  });

  it('005-AS1: shares one wide content column under the hero, footer rule across the page', async () => {
    await open('/?site=diamniadio');
    await screen.findByRole('list', { name: 'Départs vers Diamniadio' });

    // Les départs et le texte du pied de page partagent une même colonne (environ 1 100 px) ;
    // le pied de page lui-même, qui porte le trait, occupe toute la largeur.
    const departures = document.querySelector('[data-slot="departures"]');
    const footer = screen.getByRole('contentinfo');
    expect(departures).toHaveAttribute('data-column', 'content');
    expect(footer).not.toHaveAttribute('data-column');
    expect(footer.querySelector('[data-column="content"]')).toHaveTextContent(
      'Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic',
    );
  });

  it('005-AS2: shows an empty road instead of a second mascot', async () => {
    fixture.trips = fixture.trips.filter((trip) => trip.site !== 'saly');
    const { user } = await open();

    await user.click(screen.getByRole('radio', { name: 'Saly' }));

    const empty = await screen.findByRole('region', {
      name: 'Aucun départ pour l’instant vers Saly',
    });
    // Pas de seconde mascotte : la scène appartient au hero. Une route vide, dessinée.
    expect(empty.querySelector('img')).toBeNull();
    expect(empty.querySelector('[data-part="empty-road"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('list', { name: 'Départs vers Saly' })).not.toBeInTheDocument();
  });

  it('005-AS2: offers the other sites that have departures', async () => {
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
