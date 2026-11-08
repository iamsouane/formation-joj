/**
 * L'accueil sur un écran de téléphone : un hero plein écran porte le titre et les boutons de site ;
 * une fois le site choisi, il se replie en bandeau et les départs le suivent immédiatement. jsdom
 * ne mesure rien : la hauteur se vérifie dans un navigateur à 360 × 640 ; ici, la structure qui
 * la rend possible.
 * Puis un audit axe-core de chaque état de l'accueil.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { problem } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { axeFindings, runAxe } from '@/test/axe';
import { renderRoute } from '@/test/utils';

/** Le hero de l'accueil : la région qui porte le titre et le choix du site. */
const heroOf = () => screen.getByRole('region', { name: 'Cap sur les Jeux' });

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
  it('005-AS7: opens on a full-screen hero holding the title and the site buttons, then folds it into a band above the departures', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });

    const hero = heroOf();
    expect(hero).toHaveAttribute('data-state', 'open');
    expect(within(hero).getByRole('heading', { level: 1, name: 'Cap sur les Jeux' })).toBeVisible();
    expect(
      within(hero)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['dakar', 'diamniadio', 'saly']);

    await user.click(within(hero).getByRole('radio', { name: 'Diamniadio' }));

    const list = await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(heroOf()).toHaveAttribute('data-state', 'band');
    expect(heroOf().nextElementSibling).toContainElement(list);
  });
});

describe('hero layout', () => {
  it('005-AS7: lays the hero out as a copy column and a scene column', async () => {
    await renderRoute({ initialEntries: ['/'] });
    const slot = (name: string) => heroOf().querySelector(`[data-slot="${name}"]`);

    // Sur ordinateur, titre et boutons forment la colonne de gauche, la mascotte celle de droite.
    expect(slot('hero-copy')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(slot('hero-actions')).toContainElement(screen.getByRole('radio', { name: 'Saly' }));
    expect(slot('hero-scene')).toContainElement(
      screen.getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' }),
    );
  });
});

describe('direction signs', () => {
  it('005-AS7: on a phone, the mascot is the star and the chosen sign stands out', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });
    const signs = () => [...heroOf().querySelectorAll<HTMLElement>('.sign')];

    // Hero ouvert : la scène de la mascotte occupe sa propre rangée, entière, entre le texte et les
    // panneaux ; aucun panneau n'est choisi ni atténué.
    const scene = heroOf().querySelector('[data-slot="hero-scene"]');
    expect(scene?.children).toHaveLength(1);
    expect(scene?.firstElementChild).toHaveClass('mascot-stage');
    expect(signs().map((sign) => sign.dataset['selected'])).toEqual(['false', 'false', 'false']);
    expect(signs().map((sign) => sign.dataset['dimmed'])).toEqual(['false', 'false', 'false']);
    expect(heroOf().querySelector('[data-part="sign-mark"]')).toBeNull();

    within(heroOf()).getByRole('radio', { name: 'Saly' }).focus();
    await user.keyboard(' ');
    await screen.findByRole('list', { name: 'Départs vers Saly' });

    // Site choisi : son panneau porte la marque, les deux autres sont atténués.
    expect(signs().map((sign) => sign.dataset['selected'])).toEqual(['false', 'false', 'true']);
    expect(signs().map((sign) => sign.dataset['dimmed'])).toEqual(['true', 'true', 'false']);
    const marks = heroOf().querySelectorAll('[data-part="sign-mark"]');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.closest('.sign')).toHaveAttribute('data-site', 'saly');
    expect(marks[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('005-AS7: turns the site buttons into the direction signs of the scene', async () => {
    await renderRoute({ initialEntries: ['/'] });
    const hero = heroOf();

    // Les trois boutons de site sont les panneaux du poteau, dans la scène ; le décor n'en a pas d'autre.
    const signpost = within(hero).getByRole('group', { name: 'Votre site d’épreuve' });
    expect(signpost).toHaveAttribute('data-part', 'signpost');
    const signs = within(signpost).getAllByRole('radio');
    expect(
      signs.map((sign) => sign.closest('[data-direction]')?.getAttribute('data-direction')),
    ).toEqual(['left', 'right', 'right']);
    expect(hero.querySelectorAll('.hero-backdrop [data-part="signpost"]')).toHaveLength(0);
  });
});

describe('back to the hero', () => {
  it('005-AS7: the brand in the band leads back to the opened hero, at the address without a site', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/?site=saly'] });
    expect(heroOf()).toHaveAttribute('data-state', 'band');

    await user.click(within(heroOf()).getByRole('link', { name: 'Covoiturage des JOJ' }));

    expect(router.state.location.search).toEqual({});
    expect(heroOf()).toHaveAttribute('data-state', 'open');
    expect(screen.queryByRole('list', { name: /Départs vers/ })).not.toBeInTheDocument();
  });
});

describe('hero depth', () => {
  it('005-AS6: shifts the backdrop planes in depth with the pointer, over the whole hero', async () => {
    await renderRoute({ initialEntries: ['/'] });
    const hero = heroOf();
    vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 640));
    const tilt = () => ({
      x: hero.style.getPropertyValue('--tilt-x'),
      y: hero.style.getPropertyValue('--tilt-y'),
    });

    // Le décor est dans le hero : il hérite de l'inclinaison que le hero porte.
    expect(hero.querySelector('[data-part="sun"]')).not.toBeNull();
    fireEvent.pointerMove(hero, { clientX: 360, clientY: 160 });
    expect(tilt()).toEqual({ x: '1', y: '-0.5' });

    fireEvent.pointerLeave(hero);
    expect(tilt()).toEqual({ x: '0', y: '0' });
  });
});

describe('folding the hero', () => {
  /**
   * jsdom n'a pas `document.startViewTransition` : ce faux enregistre chaque transition de vue
   * demandée et applique tout de suite le changement, comme un navigateur sans animation.
   */
  function recordViewTransitions() {
    const startViewTransition = vi.fn<(update: unknown) => Partial<ViewTransition>>((update) => {
      const done = Promise.resolve().then(() => {
        if (typeof update === 'function') update();
      });
      return { finished: done, ready: done, updateCallbackDone: done, skipTransition: () => {} };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    return startViewTransition;
  }

  afterEach(() => {
    Reflect.deleteProperty(document, 'startViewTransition');
  });

  it('005-AS7: renders one hero state at a time, never a snapshot of the previous one', async () => {
    const transitions = recordViewTransitions();
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });
    // Le plus grand nombre de hero présents en même temps, à chaque changement du DOM.
    let mostHeroesAtOnce = 0;
    const observer = new MutationObserver(() => {
      mostHeroesAtOnce = Math.max(
        mostHeroesAtOnce,
        document.querySelectorAll('section.hero').length,
      );
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    expect(heroOf()).toHaveAttribute('data-fold', 'open');

    await user.click(within(heroOf()).getByRole('radio', { name: 'Diamniadio' }));

    // Au toucher, le repli est une chorégraphie à phases, tenue par l'application elle-même…
    expect(heroOf()).toHaveAttribute('data-fold', 'running');
    expect(heroOf()).toHaveAttribute('data-state', 'open');
    expect(screen.queryByRole('list', { name: /Départs vers/ })).not.toBeInTheDocument();
    await waitFor(() => expect(heroOf()).toHaveAttribute('data-fold', 'band'));
    expect(heroOf()).toHaveAttribute('data-state', 'band');
    await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    // …jamais une transition de vue du navigateur, dont l'instantané traverserait le bandeau.
    expect(transitions).not.toHaveBeenCalled();
    observer.disconnect();
    expect(mostHeroesAtOnce).toBe(1);
  });

  it('005-AS7: folds the hero at once when the site is chosen from the keyboard', async () => {
    const transitions = recordViewTransitions();
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });

    within(heroOf()).getByRole('radio', { name: 'Dakar' }).focus();
    await user.keyboard(' ');
    await screen.findByRole('list', { name: 'Départs vers Dakar' });
    await user.keyboard('{ArrowRight}');

    await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(heroOf()).toHaveAttribute('data-state', 'band');
    expect(heroOf()).toHaveAttribute('data-fold', 'band');
    expect(transitions).not.toHaveBeenCalled();
  });

  it('005-AS7: still folds at once from the keyboard after tapping the site already chosen', async () => {
    const transitions = recordViewTransitions();
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/?site=dakar'] });
    await screen.findByRole('list', { name: 'Départs vers Dakar' });

    // Toucher le site déjà choisi ne change rien…
    await user.click(within(heroOf()).getByRole('radio', { name: 'Dakar' }));
    // …et le choix suivant, au clavier, ne doit pas être pris pour un toucher.
    await user.keyboard('{ArrowRight}');

    await screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(transitions).not.toHaveBeenCalled();
  });
});

describe('home page accessibility', () => {
  it('005-AS6: the opened hero is clean', async () => {
    await renderRoute({ initialEntries: ['/'] });
    expect(heroOf()).toHaveAttribute('data-state', 'open');
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('005-AS7: the folded hero is clean', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/'] });
    await user.click(within(heroOf()).getByRole('radio', { name: 'Saly' }));
    await screen.findByRole('list', { name: 'Départs vers Saly' });
    expect(heroOf()).toHaveAttribute('data-state', 'band');
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
