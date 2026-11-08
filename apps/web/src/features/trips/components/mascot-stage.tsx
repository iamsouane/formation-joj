import { usePointerTilt } from '@/lib/use-pointer-tilt';

/**
 * La mascotte au centre du hero. Elle danse sur quatre temps (balancement autour des pieds, petits
 * sauts) et change de pose sur le temps fort de chaque mesure : debout, puis la flamme levée, avec
 * les ondes du djembé derrière elle et le halo de la flamme. Par-dessus la danse, elle s'incline
 * vers le doigt ou la souris et son ombre s'éloigne d'autant. L'image n'est jamais retournée en
 * miroir : le texte DAKAR 2026 du maillot resterait à l'envers. Le JavaScript ne pose que `--tilt-x` et `--tilt-y` ; le reste
 * (transitions, entrée avec rebond, danse) est dans `styles.css`, coupé sous
 * `prefers-reduced-motion`. En mode compact, une fois le site choisi, la mascotte se range en petit
 * dans le bandeau du hero.
 */
export function MascotStage({ compact = false }: { compact?: boolean }) {
  const { reduced, tiltHandlers } = usePointerTilt();

  return (
    <div
      className="mascot-stage"
      data-motion={reduced ? 'reduced' : 'full'}
      data-compact={compact}
      {...tiltHandlers}
    >
      {!reduced && (
        <div className="mascot-waves" data-part="waves" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <div className="mascot-shadow" aria-hidden="true" />
      <div className="mascot-tilt">
        <div className="mascot-enter">
          <div className="mascot-dance" data-part="dance">
            <img
              src="/brand/mascotte-debout-800.png"
              alt="La mascotte des JOJ Dakar 2026"
              width={388}
              height={800}
              data-pose="standing"
              className="mascot-pose mascot-pose-standing"
            />
            {!reduced && (
              <div className="mascot-flame">
                <img
                  src="/brand/mascotte-flamme-800.png"
                  alt=""
                  width={504}
                  height={800}
                  data-pose="flame"
                  className="mascot-pose"
                />
                <span className="mascot-halo" data-part="halo" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
