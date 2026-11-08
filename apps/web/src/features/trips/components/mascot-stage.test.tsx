/**
 * La scène de la mascotte et sa célébration. jsdom n'applique pas le CSS : le test vérifie l'état
 * que le code pose (inclinaison suivie par le pointeur, `data-motion`), le rendu se voit dans un
 * navigateur. `prefers-reduced-motion` est simulé par un faux `matchMedia`.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { TripSite } from '@joj/shared';
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
function renderStage(compact = false) {
  render(<MascotStage compact={compact} />);
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

interface RecordedAnimation {
  element: Element;
  keyframes: Keyframe[];
  /** Termine l'animation, comme le navigateur à la fin de sa durée. */
  finish: () => Promise<void>;
}

/** jsdom n'a pas `element.animate` : ce faux enregistre chaque animation et laisse le test la finir. */
function fakeAnimations(): RecordedAnimation[] {
  const recorded: RecordedAnimation[] = [];
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value(this: HTMLElement, keyframes: Keyframe[]) {
      let resolve!: () => void;
      const finished = new Promise<void>((done) => (resolve = done));
      recorded.push({
        element: this,
        keyframes,
        finish: async () => {
          resolve();
          await finished;
          await Promise.resolve();
        },
      });
      return { finished, cancel: () => {} } as unknown as Animation;
    },
  });
  return recorded;
}

/** Un panneau de direction factice, là où la mascotte doit courir. */
function placeSign(site: TripSite, rect: DOMRect) {
  const sign = document.createElement('label');
  sign.className = 'sign';
  sign.dataset['site'] = site;
  document.body.append(sign);
  vi.spyOn(sign, 'getBoundingClientRect').mockReturnValue(rect);
  return sign;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

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

  it('005-AS6: dances by alternating the standing and flame poses under the pointer tilt', () => {
    prefersReducedMotion(false);
    const stage = renderStage();
    const part = (name: string) => stage.querySelectorAll(`[data-part="${name}"]`);

    const poses = [...stage.querySelectorAll('img[data-pose]')];
    expect(poses.map((pose) => pose.getAttribute('data-pose'))).toEqual(['standing', 'flame']);
    expect(poses.map((pose) => pose.getAttribute('src'))).toEqual([
      '/brand/mascotte-debout-800.png',
      '/brand/mascotte-flamme-800.png',
    ]);
    // Une seule mascotte pour les lecteurs d'écran : la pose à la flamme est décorative.
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(part('dance')).toHaveLength(1);
    expect(part('waves')).toHaveLength(1);
    expect(part('halo')).toHaveLength(1);

    fireEvent.pointerMove(stage, { clientX: 0, clientY: 300 });
    expect(tilt(stage)).toEqual({ x: '-1', y: '1' });
  });

  it('005-AS6: holds one still standing pose on reduced motion', () => {
    prefersReducedMotion(true);
    const stage = renderStage();

    const poses = [...stage.querySelectorAll('img[data-pose]')];
    expect(poses.map((pose) => pose.getAttribute('data-pose'))).toEqual(['standing']);
    expect(stage.querySelectorAll('[data-part="waves"], [data-part="halo"]')).toHaveLength(0);
  });

  it('005-AS6: crops both poses to the same feet line, with a soft shadow in step with the jumps', () => {
    prefersReducedMotion(false);
    const stage = renderStage();

    // Chaque pose est recadrée (sans rocher ni ellipse grise) et posée sur la même ligne de pieds.
    const frames = [...stage.querySelectorAll('[data-part="pose-frame"]')];
    expect(frames.map((frame) => frame.querySelector('img')?.getAttribute('data-pose'))).toEqual([
      'standing',
      'flame',
    ]);
    // L'ombre douce suit la danse : elle est réglée sur la même mesure.
    const shadow = stage.querySelector('[data-part="shadow"]');
    expect(shadow).toHaveAttribute('data-beat', 'dance');
  });

  it('005-AS6: only breathes in the band, standing', () => {
    prefersReducedMotion(false);
    const stage = renderStage(true);

    // Un seul grand moment : la danse est pour le hero, le bandeau ne fait que respirer.
    expect(stage).toHaveAttribute('data-dance', 'breathe');
    const poses = [...stage.querySelectorAll('img[data-pose]')];
    expect(poses.map((pose) => pose.getAttribute('data-pose'))).toEqual(['standing']);
    expect(stage.querySelectorAll('[data-part="waves"], [data-part="halo"]')).toHaveLength(0);
  });

  it('005-AS6: runs along the road to the chosen sign, then glides into the band', async () => {
    prefersReducedMotion(false);
    const animations = fakeAnimations();
    const onRunEnd = vi.fn<() => void>();
    placeSign('diamniadio', new DOMRect(300, 500, 80, 40));
    const { rerender } = render(<MascotStage onRunEnd={onRunEnd} />);
    const stage = screen
      .getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' })
      .closest('[data-motion]');
    if (!(stage instanceof HTMLElement)) throw new Error('mascot stage not found');
    const rect = vi.spyOn(stage, 'getBoundingClientRect');
    rect.mockReturnValue(new DOMRect(100, 200, 200, 300));

    // Le site est touché : la mascotte court jusqu'au pied du panneau, en `transform` seulement.
    rerender(<MascotStage runTarget="diamniadio" onRunEnd={onRunEnd} />);
    expect(stage).toHaveAttribute('data-run', 'diamniadio');
    expect(stage.style.getPropertyValue('--run-x')).toBe('140px');
    expect(stage.style.getPropertyValue('--run-y')).toBe('40px');
    const run = animations.at(-1);
    expect(run?.element).toBe(stage);
    for (const frame of run?.keyframes ?? []) {
      expect(Object.keys(frame).filter((key) => key !== 'offset' && key !== 'easing')).toEqual(
        expect.arrayContaining(['transform']),
      );
      expect(frame).not.toHaveProperty('top');
      expect(frame).not.toHaveProperty('left');
    }
    expect(onRunEnd).not.toHaveBeenCalled();
    await run?.finish();
    expect(onRunEnd).toHaveBeenCalledTimes(1);

    // Le hero se replie : la mascotte glisse de là où elle s'est arrêtée à sa place dans le bandeau.
    rect.mockReturnValue(new DOMRect(300, 20, 60, 90));
    rerender(<MascotStage compact onRunEnd={onRunEnd} />);
    const glide = animations.at(-1);
    expect(glide).not.toBe(run);
    expect(glide?.element).toBe(stage);
    expect(String(glide?.keyframes[0]?.['transform'])).toMatch(/^translate\(.+\) scale\(.+\)$/);
    expect(glide?.keyframes.at(-1)?.['transform']).toBe('none');
    expect(stage).not.toHaveAttribute('data-run');
  });

  it('005-AS6: skips the run on reduced motion and folds at once', () => {
    prefersReducedMotion(true);
    const animations = fakeAnimations();
    const onRunEnd = vi.fn<() => void>();
    placeSign('saly', new DOMRect(300, 500, 80, 40));
    const { rerender } = render(<MascotStage onRunEnd={onRunEnd} />);

    rerender(<MascotStage runTarget="saly" onRunEnd={onRunEnd} />);

    expect(onRunEnd).toHaveBeenCalledTimes(1);
    expect(animations).toHaveLength(0);
    expect(
      screen.getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' }).closest('[data-motion]'),
    ).not.toHaveAttribute('data-run');
  });
});
