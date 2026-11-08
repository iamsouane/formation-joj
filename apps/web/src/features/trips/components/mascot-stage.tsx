import type { TripSite } from '@joj/shared';
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
interface MascotStageProps {
  compact?: boolean;
  /** Le panneau vers lequel la mascotte court avant le repli, s'il y en a un (voir T27). */
  runTarget?: TripSite | undefined;
  onRunEnd?: () => void;
}

export function MascotStage({ compact = false, runTarget, onRunEnd }: MascotStageProps) {
  void runTarget;
  void onRunEnd;
  const { reduced, tiltHandlers } = usePointerTilt();
  // Un seul grand moment : la danse est pour le hero ; le bandeau respire, debout.
  const dancing = !reduced && !compact;
  const dance = dancing ? 'dance' : reduced ? 'still' : 'breathe';

  return (
    <div
      className="mascot-stage"
      data-motion={reduced ? 'reduced' : 'full'}
      data-compact={compact}
      data-dance={dance}
      {...tiltHandlers}
    >
      {dancing && (
        <div className="mascot-waves" data-part="waves" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <div className="mascot-shadow" data-part="shadow" data-beat={dance} aria-hidden="true" />
      <div className="mascot-tilt">
        <div className="mascot-enter">
          <div className="mascot-dance" data-part="dance">
            {/* Chaque pose dans son cadre : recadrée sous les pieds, posée sur la même ligne. */}
            <div className="mascot-frame mascot-frame-standing" data-part="pose-frame">
              <img
                src="/brand/mascotte-debout-800.png"
                alt="La mascotte des JOJ Dakar 2026"
                width={388}
                height={800}
                data-pose="standing"
                className="mascot-pose"
              />
            </div>
            {dancing && (
              <div className="mascot-frame mascot-frame-flame" data-part="pose-frame">
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
