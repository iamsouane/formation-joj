import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** `matchMedia` manque dans certains environnements (jsdom) : on suppose alors le mouvement permis. */
const mediaQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : undefined;

function subscribe(onChange: () => void) {
  const query = mediaQuery();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** Vrai quand le système de l'utilisateur demande moins d'animations ; suit ses changements. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mediaQuery()?.matches ?? false,
    () => false,
  );
}
