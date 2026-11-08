/**
 * Le décor vivant du hero. jsdom n'applique pas le CSS : le test vérifie ce que le code rend
 * (le décor hors de l'arbre d'accessibilité, ses pièces mobiles) ; le mouvement se voit dans un
 * navigateur. `prefers-reduced-motion` est simulé par un faux `matchMedia`.
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroBackdrop } from './hero-backdrop';

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderBackdrop(compact = false) {
  const { container } = render(<HeroBackdrop compact={compact} />);
  const backdrop = container.firstElementChild;
  if (!(backdrop instanceof HTMLElement)) throw new Error('backdrop not found');
  const parts = (name: string) => backdrop.querySelectorAll(`[data-part="${name}"]`).length;
  return { backdrop, parts };
}

afterEach(() => vi.unstubAllGlobals());

describe('HeroBackdrop', () => {
  it('005-AS6: draws a living backdrop out of the accessibility tree', () => {
    prefersReducedMotion(false);
    const { backdrop, parts } = renderBackdrop();

    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveAttribute('data-motion', 'full');
    for (const part of ['sun-rays', 'sun', 'road', 'frieze']) expect(parts(part)).toBe(1);
    expect(parts('car')).toBeGreaterThanOrEqual(2);
    expect(parts('confetto')).toBeGreaterThanOrEqual(8);
    // Les panneaux de direction ne sont plus un décor : ce sont les boutons de site (site-picker.tsx).
    expect(parts('signpost')).toBe(0);
  });

  it('005-AS6: drops the confetti and the moving cars on reduced motion', () => {
    prefersReducedMotion(true);
    const { backdrop, parts } = renderBackdrop();

    expect(backdrop).toHaveAttribute('data-motion', 'reduced');
    expect(parts('confetto')).toBe(0);
    expect(parts('car')).toBe(0);
    expect(parts('road')).toBe(1);
  });

  it('005-AS6: draws the road and its cars in 2D, the same in every browser', () => {
    prefersReducedMotion(false);
    const { backdrop, parts } = renderBackdrop();

    const road = backdrop.querySelector('[data-part="road"]');
    for (const part of ['road-edge', 'road-surface', 'road-line']) {
      expect(road?.querySelectorAll(`[data-part="${part}"]`)).toHaveLength(1);
    }
    // Chaque voiture file sur sa piste, qui rapetisse vers le point de fuite.
    const tracks = [...backdrop.querySelectorAll('[data-part="car-track"]')];
    expect(tracks).toHaveLength(parts('car'));
    for (const track of tracks) expect(track.querySelector('[data-part="car"]')).not.toBeNull();
  });

  it('005-AS7: keeps the same scene in the band, without confetti nor cars', () => {
    prefersReducedMotion(false);
    const { backdrop, parts } = renderBackdrop(true);

    expect(backdrop).toHaveAttribute('data-compact', 'true');
    for (const part of ['sun', 'sun-rays', 'road', 'frieze']) expect(parts(part)).toBe(1);
    expect(parts('confetto')).toBe(0);
    expect(parts('car')).toBe(0);
  });
});
