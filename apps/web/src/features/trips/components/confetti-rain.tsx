import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Seize confettis : colonne, retard et durée, pour une pluie irrégulière qui ne tombe qu'une fois. */
const PIECES = Array.from({ length: 16 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 5) * 90}ms`,
  duration: `${1500 + ((index * 7) % 6) * 140}ms`,
}));

/**
 * La pluie de confettis vert, jaune et rouge qui accompagne la place réservée : une seule fois,
 * purement décorative. Rien sous moins d'animations.
 */
export function ConfettiRain() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div className="confetti-rain" data-part="confetti-rain" aria-hidden="true">
      {PIECES.map((piece) => (
        <span
          key={piece.left}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}
