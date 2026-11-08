/**
 * Le décor du hero : un paysage sahélien au coucher du soleil, dessiné en SVG et CSS. jsdom
 * n'applique pas le CSS : le test vérifie ce que le code rend (les plans du paysage, hors de l'arbre
 * d'accessibilité, et la vie discrète qui n'existe qu'avec le mouvement permis) ; la lumière et la
 * profondeur se voient dans un navigateur. `prefers-reduced-motion` est simulé par un faux `matchMedia`.
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

/** Les plans du paysage, du plus lointain au plus proche. */
const LANDSCAPE = ['sky', 'sun', 'ocean', 'trees-far', 'trees-mid', 'trees-near', 'grass', 'road'];
/** La vie discrète : elle n'existe qu'avec le mouvement permis, dans le hero ouvert. */
const LIFE = ['birds', 'dust', 'heat'];

afterEach(() => vi.unstubAllGlobals());

describe('HeroBackdrop', () => {
  it('005-AS6: paints a Sahel sunset in depth: sky, sun, ocean, trees by distance, grass, laterite road', () => {
    prefersReducedMotion(false);
    const { backdrop, parts } = renderBackdrop();

    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveAttribute('data-motion', 'full');
    for (const part of LANDSCAPE) expect(parts(part)).toBe(1);
    // Les arbres pâlissent avec la distance : chaque plan dit sa profondeur, et chacun a ses arbres.
    const depths = [...backdrop.querySelectorAll('[data-part^="trees-"]')].map((layer) => ({
      depth: layer.getAttribute('data-depth'),
      trees: layer.querySelectorAll('use').length,
    }));
    expect(depths.map((layer) => layer.depth)).toEqual(['far', 'mid', 'near']);
    for (const layer of depths) expect(layer.trees).toBeGreaterThanOrEqual(3);
    // Un paysage, pas un décor de fête : ni voitures ni confettis ; la frise des Jeux reste.
    expect(parts('car')).toBe(0);
    expect(parts('confetto')).toBe(0);
    expect(parts('frieze')).toBe(1);
  });

  it('005-AS6: keeps the discreet life (birds, dust, heat) only with motion allowed', () => {
    prefersReducedMotion(false);
    const lively = renderBackdrop();
    for (const part of LIFE) expect(lively.parts(part)).toBe(1);
    expect(lively.parts('dust-mote')).toBeGreaterThanOrEqual(6);
    expect(
      lively.backdrop.querySelectorAll('[data-part="birds"] path').length,
    ).toBeGreaterThanOrEqual(4);
  });

  it('005-AS6: stands still on reduced motion: the landscape, none of its life', () => {
    prefersReducedMotion(true);
    const { backdrop, parts } = renderBackdrop();

    expect(backdrop).toHaveAttribute('data-motion', 'reduced');
    for (const part of LANDSCAPE) expect(parts(part)).toBe(1);
    for (const part of LIFE) expect(parts(part)).toBe(0);
  });

  it('005-AS7: keeps the same scene in the band, at rest', () => {
    prefersReducedMotion(false);
    const { backdrop, parts } = renderBackdrop(true);

    expect(backdrop).toHaveAttribute('data-compact', 'true');
    for (const part of [
      'sky',
      'sun',
      'ocean',
      'trees-far',
      'trees-mid',
      'trees-near',
      'road',
      'frieze',
    ]) {
      expect(parts(part)).toBe(1);
    }
    for (const part of LIFE) expect(parts(part)).toBe(0);
  });
});
