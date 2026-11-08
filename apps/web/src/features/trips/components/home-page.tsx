import type { BookingConfirmationResponse, TripResponse, TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useUpcomingTrips } from '../api/trips.queries';
import { BookingConfirmation } from './booking-confirmation';
import { BookingForm } from './booking-form';
import { DepartureList } from './departure-list';
import { DeparturesLoading } from './departures-loading';
import { Hero } from './hero';
import { NoDepartures } from './no-departures';
import { useFoldChoreography } from './use-fold-choreography';

interface HomePageProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/** L'accueil : choisir son site, voir ses départs à venir, puis réserver une place. */
export function HomePage({ site, onSiteChange }: HomePageProps) {
  const reduced = useReducedMotion();
  // Le geste du dernier choix, posé avant la navigation : il décide si le repli se joue ou non.
  const [gesture, setGesture] = useState<SiteChoiceGesture>();
  const { fold, runTarget, endRun } = useFoldChoreography(site, gesture, reduced);
  // Les départs attendent la fin de la course : ils entrent une fois le bandeau en place.
  const { shownSite, phase } = useSiteSwap(fold === 'running' ? undefined : site);

  function chooseSite(next: TripSite, how: SiteChoiceGesture) {
    setGesture(how);
    onSiteChange(next, how);
  }

  return (
    <>
      <Hero
        site={site}
        fold={fold}
        runTarget={runTarget}
        onRunEnd={endRun}
        onSiteChange={chooseSite}
      />
      <div
        data-slot="departures"
        data-column="content"
        data-phase={phase}
        className="departures content-column"
      >
        {/* Un autre site repart de zéro : ni trajet choisi, ni confirmation. Pendant la course
            de la mascotte, les départs attendent : des cartes d'attente tiennent leur place. */}
        {shownSite ? (
          <UpcomingDepartures key={shownSite} site={shownSite} onSiteChange={chooseSite} />
        ) : (
          site && <DeparturesLoading />
        )}
      </div>
    </>
  );
}

/** Le temps de sortie des départs d'un site, avant que ceux du suivant entrent. */
const LEAVE_MS = 180;

type SwapPhase = 'idle' | 'leaving' | 'entering';

/**
 * Au changement de site, les départs affichés sortent complètement avant que les nouveaux
 * entrent : jamais les deux listes ensemble. Sous moins d'animations, l'échange est immédiat.
 */
function useSiteSwap(site: TripSite | undefined) {
  const reduced = useReducedMotion();
  const [shownSite, setShownSite] = useState(site);
  const [nextSite, setNextSite] = useState(site);
  const [phase, setPhase] = useState<SwapPhase>('idle');

  // Le site a changé : on l'ajuste pendant le rendu (pas dans un effet), comme le recommande React.
  if (site !== nextSite) {
    setNextSite(site);
    if (reduced || shownSite === undefined || site === undefined) {
      setShownSite(site);
      setPhase(site === undefined || reduced ? 'idle' : 'entering');
    } else {
      setPhase('leaving');
    }
  }

  // La sortie terminée, le nouveau site entre ; un autre changement pendant la sortie la relance.
  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = setTimeout(() => {
      setShownSite(nextSite);
      setPhase('entering');
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [phase, nextSite]);

  return { shownSite, phase };
}

interface Booked {
  trip: TripResponse;
  confirmation: BookingConfirmationResponse;
}

function UpcomingDepartures({
  site,
  onSiteChange,
}: {
  site: TripSite;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}) {
  const trips = useUpcomingTrips(site);
  const [chosenTripId, setChosenTripId] = useState<string>();
  const [booked, setBooked] = useState<Booked>();

  if (booked) {
    return <BookingConfirmation {...booked} onDone={() => setBooked(undefined)} />;
  }
  if (trips.isPending) return <DeparturesLoading />;
  if (trips.isError) {
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger les départs. Réessayez dans un instant.
      </p>
    );
  }
  if (trips.data.length === 0) return <NoDepartures site={site} onSiteChange={onSiteChange} />;
  return (
    <DepartureList
      site={site}
      trips={trips.data}
      openTripId={chosenTripId}
      onToggleBooking={(trip) =>
        setChosenTripId((current) => (current === trip.id ? undefined : trip.id))
      }
      renderBooking={(trip) =>
        trip.id === chosenTripId && (
          <BookingForm
            trip={trip}
            onBooked={(confirmation) => {
              setChosenTripId(undefined);
              setBooked({ trip, confirmation });
            }}
          />
        )
      }
    />
  );
}
