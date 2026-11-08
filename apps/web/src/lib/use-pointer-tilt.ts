import type { PointerEvent } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/** -1 au bord gauche (ou haut), 0 au centre, 1 au bord droit (ou bas), au centième. */
function axis(position: number, start: number, size: number): string {
  if (size <= 0) return '0';
  const ratio = Math.min(1, Math.max(-1, ((position - start) / size) * 2 - 1));
  return String(Math.round(ratio * 100) / 100);
}

function setTilt(element: HTMLElement, x: string, y: string) {
  element.style.setProperty('--tilt-x', x);
  element.style.setProperty('--tilt-y', y);
}

/**
 * Suit le doigt ou la souris sur un élément : pose `--tilt-x` et `--tilt-y` (de -1 à 1) sur lui,
 * que ses descendants lisent dans `styles.css` pour s'incliner ou se décaler à leur profondeur.
 * Rien n'est posé quand l'utilisateur demande moins d'animations.
 */
export function usePointerTilt() {
  const reduced = useReducedMotion();

  function follow(event: PointerEvent<HTMLElement>) {
    if (reduced) return;
    const element = event.currentTarget;
    const box = element.getBoundingClientRect();
    setTilt(
      element,
      axis(event.clientX, box.left, box.width),
      axis(event.clientY, box.top, box.height),
    );
  }

  function settle(event: PointerEvent<HTMLElement>) {
    if (!reduced) setTilt(event.currentTarget, '0', '0');
  }

  return {
    reduced,
    tiltHandlers: { onPointerMove: follow, onPointerLeave: settle, onPointerCancel: settle },
  };
}
