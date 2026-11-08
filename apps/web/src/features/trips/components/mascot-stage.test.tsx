/**
 * La scène de la mascotte et sa célébration. jsdom n'applique pas le CSS : le test vérifie l'état
 * que le code pose (inclinaison suivie par le pointeur, `data-motion`), le rendu se voit dans un
 * navigateur. `prefers-reduced-motion` est simulé par un faux `matchMedia`.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlameCelebration } from './flame-celebration';
import { MascotStage } from './mascot-stage';

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** La scène rendue, avec une taille : 200 × 300 px à l'origine de la page. */
function renderStage() {
  render(<MascotStage />);
  const stage = screen
    .getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' })
    .closest('[data-motion]');
  if (!(stage instanceof HTMLElement)) throw new Error('mascot stage not found');
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 300));
  return stage;
}

const tilt = (stage: HTMLElement) => ({
  x: stage.style.getPropertyValue('--tilt-x'),
  y: stage.style.getPropertyValue('--tilt-y'),
});

afterEach(() => vi.unstubAllGlobals());

describe('MascotStage', () => {
  it('005-AS6: tilts the mascot toward the pointer, then settles back', () => {
    prefersReducedMotion(false);
    const stage = renderStage();
    expect(stage).toHaveAttribute('data-motion', 'full');

    fireEvent.pointerMove(stage, { clientX: 200, clientY: 75 });
    expect(tilt(stage)).toEqual({ x: '1', y: '-0.5' });

    fireEvent.pointerLeave(stage);
    expect(tilt(stage)).toEqual({ x: '0', y: '0' });
  });

  it('005-AS6: keeps the mascot still when less motion is requested', () => {
    prefersReducedMotion(true);
    const stage = renderStage();
    expect(stage).toHaveAttribute('data-motion', 'reduced');

    fireEvent.pointerMove(stage, { clientX: 200, clientY: 75 });
    expect(tilt(stage)).toEqual({ x: '', y: '' });
  });

  it('005-AS6: the flame mascot does not jump when less motion is requested', () => {
    prefersReducedMotion(true);
    render(<FlameCelebration />);
    expect(screen.getByRole('img', { name: 'La mascotte des JOJ saute de joie' })).toHaveAttribute(
      'data-motion',
      'reduced',
    );
  });
});
