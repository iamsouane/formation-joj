import type { TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import type { FoldPhase } from './use-fold-choreography';
import { Link } from '@tanstack/react-router';
import { BrandLink } from './brand-link';
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
  // Le conducteur, lui, ne cherche pas de place : il en propose. Le supporter qui a déjà réservé
  // revient avec son code. Sous les sites dans le hero ouvert ; dans le bandeau replié, plus
  // discrets, sous le titre, à côté de la mascotte : la place y est libre, et les départs ne
  // descendent pas. C'est là que le supporter se trouve juste après avoir réservé.
  const links = (
    <p className="hero-links" data-tone={folded ? 'quiet' : undefined}>
      <Link to="/publier" className="hero-drive-link">
        Vous conduisez ? Proposez un trajet
      </Link>
      <Link to="/reservation" className="hero-drive-link">
        Retrouver ma réservation
      </Link>
    </p>
  );

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
          <BrandLink />
          <h1 id={titleId} className="hero-title">
            <span>Cap sur</span> <span>les Jeux</span>
          </h1>
          {!folded && (
            <p className="hero-lede">Trouvez une place en voiture vers votre site d’épreuve.</p>
          )}
          {folded && links}
        </div>
        <div className="hero-scene" data-slot="hero-scene">
          <MascotStage compact={folded} runTarget={runTarget} onRunEnd={onRunEnd} />
        </div>
        <div className="hero-actions" data-slot="hero-actions">
          <SitePicker value={site} onChange={onSiteChange} />
          {!folded && links}
        </div>
      </div>
    </section>
  );
}
