import type { PointerEvent } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** -1 au bord gauche (ou haut), 0 au centre, 1 au bord droit (ou bas), au centième. */
function axis(position: number, start: number, size: number): string {
  if (size <= 0) return '0';
  const ratio = Math.min(1, Math.max(-1, ((position - start) / size) * 2 - 1));
  return String(Math.round(ratio * 100) / 100);
}

function setTilt(stage: HTMLElement, x: string, y: string) {
  stage.style.setProperty('--tilt-x', x);
  stage.style.setProperty('--tilt-y', y);
}

/**
 * La mascotte debout, au centre du hero : elle s'incline vers le doigt ou la souris et son ombre
 * s'éloigne d'autant. Le JavaScript ne pose que `--tilt-x` et `--tilt-y` ; le reste
 * (transitions, entrée avec rebond, respiration) est dans `styles.css`, coupé sous
 * `prefers-reduced-motion`. En mode compact, une fois le site choisi, la mascotte se range en petit
 * dans le bandeau du hero.
 */
export function MascotStage({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion();

  function follow(event: PointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const stage = event.currentTarget;
    const box = stage.getBoundingClientRect();
    setTilt(
      stage,
      axis(event.clientX, box.left, box.width),
      axis(event.clientY, box.top, box.height),
    );
  }

  function settle(event: PointerEvent<HTMLDivElement>) {
    if (!reduced) setTilt(event.currentTarget, '0', '0');
  }

  return (
    <div
      className="mascot-stage"
      data-motion={reduced ? 'reduced' : 'full'}
      data-compact={compact}
      onPointerMove={follow}
      onPointerLeave={settle}
      onPointerCancel={settle}
    >
      <div className="mascot-shadow" aria-hidden="true" />
      <div className="mascot-tilt">
        <div className="mascot-enter">
          <img
            src="/brand/mascotte-debout-800.png"
            alt="La mascotte des JOJ Dakar 2026"
            width={388}
            height={800}
            className="mascot-figure"
          />
        </div>
      </div>
    </div>
  );
}
