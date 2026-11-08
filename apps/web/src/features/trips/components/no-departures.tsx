import { TRIP_SITES, type TripSite } from '@joj/shared';
import { useQueries } from '@tanstack/react-query';
import { type MouseEvent, useId } from 'react';
import { Button } from '@/components/ui/button';
import { upcomingTripsQueryOptions } from '../api/trips.queries';
import { SITE_LABELS } from './format';
import type { SiteChoiceGesture } from './site-picker';

interface NoDeparturesProps {
  site: TripSite;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/**
 * Aucun départ vers ce site : la mascotte l'annonce, et propose les autres sites qui ont des
 * départs à venir. Un site sans départ n'est pas proposé, pour ne pas mener à un autre écran vide.
 */
export function NoDepartures({ site, onSiteChange }: NoDeparturesProps) {
  const titleId = useId();
  const otherSites = TRIP_SITES.filter((other) => other !== site);
  const others = useQueries({ queries: otherSites.map(upcomingTripsQueryOptions) });
  const withDepartures = otherSites.filter((_, index) => (others[index]?.data?.length ?? 0) > 0);

  function choose(other: TripSite, event: MouseEvent<HTMLButtonElement>) {
    // Un clic au clavier (Entrée, Espace) a `detail` à 0 : il ne s'anime pas.
    onSiteChange(other, event.detail === 0 ? 'keyboard' : 'pointer');
  }

  return (
    <section aria-labelledby={titleId} className="no-departures">
      <img
        src="/brand/mascotte-debout-800.png"
        alt=""
        width={388}
        height={800}
        className="no-departures-mascot"
      />
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="font-display text-3xl leading-none font-extrabold">
          Aucun départ pour l’instant vers {SITE_LABELS[site]}
        </h2>
        {withDepartures.length > 0 && (
          <>
            <p>Des conducteurs partent déjà vers :</p>
            <div className="flex flex-wrap gap-2">
              {withDepartures.map((other) => (
                <Button
                  key={other}
                  size="lg"
                  aria-label={`Voir les départs vers ${SITE_LABELS[other]}`}
                  onClick={(event) => choose(other, event)}
                >
                  {SITE_LABELS[other]}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
