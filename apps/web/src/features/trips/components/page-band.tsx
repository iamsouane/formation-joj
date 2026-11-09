import { useId } from 'react';
import { BrandLink } from './brand-link';
import { HeroBackdrop } from './hero-backdrop';
import { MascotStage } from './mascot-stage';

/**
 * Le bandeau de l'accueil, replié, en tête d'une page : le ciel et la frise, la marque qui ramène
 * à l'accueil, le titre qui dit où l'on est (deux mots ou groupes de mots, un par ligne sur
 * téléphone) et la mascotte au repos, qui respire sans danser.
 */
export function PageBand({ title }: { title: readonly [string, string] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="hero" data-state="band" data-fold="band">
      <HeroBackdrop compact />
      <div className="hero-inner">
        <div className="hero-copy">
          <BrandLink />
          <h1 id={titleId} className="hero-title">
            <span>{title[0]}</span> <span>{title[1]}</span>
          </h1>
        </div>
        <div className="hero-scene">
          <div className="publish-mascot" data-pose="rest">
            <MascotStage compact />
          </div>
        </div>
      </div>
    </section>
  );
}
