import type { TripSite } from '@joj/shared';
import { useLayoutEffect, useRef } from 'react';
import { usePointerTilt } from '@/lib/use-pointer-tilt';
import { RUN_MS } from './use-fold-choreography';

interface MascotStageProps {
  compact?: boolean;
  /** Le panneau vers lequel la mascotte court avant le repli, s'il y en a un. */
  runTarget?: TripSite | undefined;
  onRunEnd?: () => void;
}

/** La mascotte rapetisse en courant vers le panneau : elle s'éloigne sur la route. */
const RUN_SCALE = 0.6;
const RUN_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const GLIDE_MS = 520;
const GLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Le centre du bas d'un rectangle : là où la mascotte pose les pieds. */
const feetOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.bottom });

/**
 * La course vers le panneau, en `transform` seulement : la mascotte glisse jusqu'au pied du
 * panneau en rapetissant, et la foulée (CSS, `[data-dance='run']`) la fait bondir en chemin.
 */
function runKeyframes(dx: number, dy: number): Keyframe[] {
  const steps = 6;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const scale = 1 - (1 - RUN_SCALE) * t;
    const lean = index === 0 || index === steps ? 0 : 3;
    return {
      offset: t,
      transformOrigin: '50% 100%',
      transform: `translate(${dx * t}px, ${dy * t}px) rotate(${lean}deg) scale(${scale})`,
    };
  });
}

/**
 * La mascotte au centre du hero. Elle danse sur quatre temps (balancement autour des pieds, petits
 * sauts) et change de pose sur le temps fort de chaque mesure : debout, puis la flamme levée, avec
 * les ondes du djembé derrière elle et le halo de la flamme. Par-dessus la danse, elle s'incline
 * vers le doigt ou la souris et son ombre s'éloigne d'autant. L'image n'est jamais retournée en
 * miroir : le texte DAKAR 2026 du maillot resterait à l'envers. Le JavaScript ne pose que
 * `--tilt-x` et `--tilt-y` ; le reste (transitions, entrée avec rebond, danse) est dans
 * `styles.css`, coupé sous `prefers-reduced-motion`.
 *
 * Au choix d'un site, c'est le moment signature : elle court sur la route jusqu'au panneau choisi
 * (`runTarget`), puis, le hero replié, elle glisse de là où elle s'est arrêtée à sa place dans le
 * bandeau (un FLIP : on mesure avant et après, on anime la différence en `transform`). En mode
 * compact, elle ne fait plus que respirer.
 */
export function MascotStage({ compact = false, runTarget, onRunEnd }: MascotStageProps) {
  const { reduced, tiltHandlers } = usePointerTilt();
  const stageRef = useRef<HTMLDivElement>(null);
  /** Là où la course s'est arrêtée (coordonnées de la page), pour que le glissement en reparte. */
  const runEndRect = useRef<DOMRect | null>(null);
  const running = runTarget !== undefined;
  // Un seul grand moment : la danse est pour le hero ; le bandeau respire, debout.
  const dancing = !reduced && !compact && !running;
  const dance = running ? 'run' : dancing ? 'dance' : reduced ? 'still' : 'breathe';

  // La course. En effet de mise en page : son annulation précède la mesure du glissement.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (runTarget === undefined || !stage) return;
    if (reduced) {
      onRunEnd?.();
      return;
    }
    const sign = document.querySelector<HTMLElement>(`.sign[data-site="${runTarget}"]`);
    const from = stage.getBoundingClientRect();
    const feet = feetOf(from);
    const goal = sign ? feetOf(sign.getBoundingClientRect()) : feet;
    const dx = Math.round(goal.x - feet.x);
    const dy = Math.round(goal.y - feet.y);
    stage.style.setProperty('--run-x', `${dx}px`);
    stage.style.setProperty('--run-y', `${dy}px`);
    stage.dataset['run'] = runTarget;
    const width = from.width * RUN_SCALE;
    const height = from.height * RUN_SCALE;
    runEndRect.current = new DOMRect(goal.x - width / 2, goal.y - height, width, height);

    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      onRunEnd?.();
    };
    const animation =
      typeof stage.animate === 'function'
        ? stage.animate(runKeyframes(dx, dy), {
            duration: RUN_MS,
            easing: RUN_EASING,
            fill: 'forwards',
          })
        : null;
    const timer = animation ? undefined : setTimeout(end, RUN_MS);
    animation?.finished.then(end, () => {});
    return () => {
      animation?.cancel();
      if (timer !== undefined) clearTimeout(timer);
      delete stage.dataset['run'];
    };
  }, [runTarget, reduced, onRunEnd]);

  // Le glissement vers le bandeau : de la fin de la course à la nouvelle place, en `transform`.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const first = runEndRect.current;
    runEndRect.current = null;
    if (!compact || !stage || !first || typeof stage.animate !== 'function') return;
    const last = stage.getBoundingClientRect();
    if (!last.width || !last.height) return;
    const dx = Math.round(first.left - last.left);
    const dy = Math.round(first.top - last.top);
    const sx = (first.width / last.width).toFixed(3);
    const sy = (first.height / last.height).toFixed(3);
    stage.animate(
      [
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: GLIDE_MS, easing: GLIDE_EASING },
    );
  }, [compact]);

  return (
    <div
      ref={stageRef}
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
