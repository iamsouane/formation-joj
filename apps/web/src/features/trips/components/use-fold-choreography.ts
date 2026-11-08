import type { TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import { useCallback, useEffect, useState } from 'react';

/** Les phases du repli du hero : ouvert, la course de la mascotte vers le panneau, le bandeau. */
export type FoldPhase = 'open' | 'running' | 'band';

/** La durée de la course, et le garde-fou si l'animation ne signale pas sa fin. */
export const RUN_MS = 900;

/**
 * Le repli du hero est une chorégraphie tenue par l'application, jamais une transition de vue du
 * navigateur : l'instantané de l'ancien hero traversait le bandeau et la carte sur iPhone. Un
 * seul état est rendu à la fois. Au toucher d'un premier site, la mascotte court vers le panneau
 * (`running`), puis le hero devient un bandeau (`band`). Au clavier, sous moins d'animations, ou
 * quand le site change depuis le bandeau, le repli est immédiat.
 */
export function useFoldChoreography(
  site: TripSite | undefined,
  gesture: SiteChoiceGesture | undefined,
  reduced: boolean,
) {
  const [seenSite, setSeenSite] = useState(site);
  const [fold, setFold] = useState<FoldPhase>(site === undefined ? 'open' : 'band');
  const [runTarget, setRunTarget] = useState<TripSite>();

  // Le site a changé : on l'ajuste pendant le rendu (pas dans un effet), comme le recommande React.
  if (site !== seenSite) {
    setSeenSite(site);
    if (site === undefined) {
      setFold('open');
      setRunTarget(undefined);
    } else if (seenSite === undefined && gesture === 'pointer' && !reduced) {
      setFold('running');
      setRunTarget(site);
    } else {
      setFold('band');
      setRunTarget(undefined);
    }
  }

  /** La course est finie : le hero se replie. */
  const endRun = useCallback(() => {
    setFold((current) => (current === 'running' ? 'band' : current));
    setRunTarget(undefined);
  }, []);

  // Garde-fou : même sans signal de fin, la course ne dure jamais plus que prévu.
  useEffect(() => {
    if (fold !== 'running') return;
    const timer = setTimeout(endRun, RUN_MS + 100);
    return () => clearTimeout(timer);
  }, [fold, endRun]);

  return { fold, runTarget, endRun };
}
