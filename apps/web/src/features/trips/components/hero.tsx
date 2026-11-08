import type { TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import type { FoldPhase } from './use-fold-choreography';
import { Link } from '@tanstack/react-router';
import { useId } from 'react';
import { usePointerTilt } from '@/lib/use-pointer-tilt';
import { HeroBackdrop } from './hero-backdrop';
import { MascotStage } from './mascot-stage';
import { SitePicker } from './site-picker';

interface HeroProps {
  site: TripSite | undefined;
  /** La phase du repli : ouvert, course de la mascotte, bandeau (`use-fold-choreography.ts`). */
  fold: FoldPhase;
  /** Le panneau vers lequel la mascotte court, pendant la phase `running`. */
  runTarget: TripSite | undefined;
  onRunEnd: () => void;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/**
 * Le hero de l'accueil, bord à bord : plein écran à l'arrivée, avec le titre, la mascotte et les
 * trois boutons de site ; replié en bandeau (`data-state="band"`) une fois le site choisi, pour
 * laisser la place aux départs ; entre les deux, la mascotte court vers le panneau choisi. Trois zones : le texte, la scène de la mascotte et les boutons ;
 * sur ordinateur, texte et boutons à gauche, mascotte à droite.
 */
export function Hero({ site, fold, runTarget, onRunEnd, onSiteChange }: HeroProps) {
  const titleId = useId();
  // Le hero entier suit le pointeur : les plans du décor s'en servent pour se décaler en profondeur.
  const { tiltHandlers } = usePointerTilt();
  const folded = fold === 'band';

  return (
    <section
      aria-labelledby={titleId}
      className="hero"
      data-state={folded ? 'band' : 'open'}
      data-fold={fold}
      {...tiltHandlers}
    >
      <HeroBackdrop compact={folded} />
      <div className="hero-inner">
        <div className="hero-copy" data-slot="hero-copy">
          {/* La marque ramène au hero ouvert : l'adresse sans site. */}
          <Link to="/" className="hero-brand">
            <span className="hero-logo">
              <img src="/brand/logo.jpg" alt="" width={900} height={900} />
            </span>
            <span>
              <span className="block">Covoiturage</span> <span className="block">des JOJ</span>
            </span>
          </Link>
          <h1 id={titleId} className="hero-title">
            <span>Cap sur</span> <span>les Jeux</span>
          </h1>
          {!folded && (
            <p className="hero-lede">Trouvez une place en voiture vers votre site d’épreuve.</p>
          )}
        </div>
        <div className="hero-scene" data-slot="hero-scene">
          <MascotStage compact={folded} runTarget={runTarget} onRunEnd={onRunEnd} />
        </div>
        <div className="hero-actions" data-slot="hero-actions">
          <SitePicker value={site} onChange={onSiteChange} />
        </div>
      </div>
    </section>
  );
}
