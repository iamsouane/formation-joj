import type { BookingConfirmationResponse, TripResponse, TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import { useState } from 'react';
import { useUpcomingTrips } from '../api/trips.queries';
import { BookingConfirmation } from './booking-confirmation';
import { BookingForm } from './booking-form';
import { DepartureList } from './departure-list';
import { Hero } from './hero';
import { NoDepartures } from './no-departures';

interface HomePageProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/** L'accueil : choisir son site, voir ses départs à venir, puis réserver une place. */
export function HomePage({ site, onSiteChange }: HomePageProps) {
  return (
    <>
      <Hero site={site} onSiteChange={onSiteChange} />
      <div data-slot="departures" className="departures departures-enter">
        {/* Un autre site repart de zéro : ni trajet choisi, ni confirmation. */}
        {site && <UpcomingDepartures key={site} site={site} onSiteChange={onSiteChange} />}
      </div>
    </>
  );
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
  if (trips.isPending) return <p className="text-muted-foreground">Chargement des départs…</p>;
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
      onBook={(trip) => setChosenTripId(trip.id)}
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
