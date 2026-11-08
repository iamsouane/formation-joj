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

/** Une route vide sous le soleil, dessinée : pas de seconde mascotte, la scène est au hero. */
function EmptyRoad() {
  return (
    <svg
      viewBox="0 0 120 90"
      className="no-departures-road"
      data-part="empty-road"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="120" height="54" fill="var(--joj-yellow)" />
      <circle cx="60" cy="54" r="22" fill="#fff1b8" />
      <rect y="54" width="120" height="36" fill="#e9820f" />
      <path d="M57 54 H63 L104 90 H16 Z" fill="#262626" />
      <path d="M57 54 L16 90 M63 54 L104 90" stroke="var(--joj-yellow)" strokeWidth="2" />
      <path d="M60 58 V62 M60 67 V73 M60 79 V88" stroke="#fff" strokeWidth="1.6" />
      <path d="M0 54 H120" stroke="var(--joj-black)" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Aucun départ vers ce site : une route vide l'annonce, et propose les autres sites qui ont des
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
      <EmptyRoad />
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
