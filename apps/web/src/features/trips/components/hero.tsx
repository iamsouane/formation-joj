import type { TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import { useId } from 'react';
import { HeroBackdrop } from './hero-backdrop';
import { MascotStage } from './mascot-stage';
import { SitePicker } from './site-picker';

interface HeroProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/**
 * Le hero de l'accueil, bord à bord : plein écran à l'arrivée, avec le titre, la mascotte et les
 * trois boutons de site ; replié en bandeau (`data-state="band"`) une fois le site choisi, pour
 * laisser la place aux départs.
 */
export function Hero({ site, onSiteChange }: HeroProps) {
  const titleId = useId();
  const folded = site !== undefined;

  return (
    <section aria-labelledby={titleId} className="hero" data-state={folded ? 'band' : 'open'}>
      <HeroBackdrop />
      <div className="hero-inner">
        <div className="hero-brand">
          <span className="hero-logo">
            <img
              src="/brand/logo.jpg"
              alt="Dakar 2026, Jeux Olympiques de la Jeunesse"
              width={900}
              height={900}
            />
          </span>
          <span>
            Covoiturage
            <br />
            des JOJ
          </span>
        </div>
        <h1 id={titleId} className="hero-title">
          <span>Cap sur</span> <span>les Jeux</span>
        </h1>
        {!folded && (
          <p className="hero-lede">Trouvez une place en voiture vers votre site d’épreuve.</p>
        )}
        <MascotStage compact={folded} />
        <SitePicker value={site} onChange={onSiteChange} />
      </div>
    </section>
  );
}
