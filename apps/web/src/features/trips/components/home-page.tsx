import type { BookingConfirmationResponse, TripResponse, TripSite } from '@joj/shared';
import type { SiteChoiceGesture } from './site-picker';
import { useState } from 'react';
import { useUpcomingTrips } from '../api/trips.queries';
import { BookingConfirmation } from './booking-confirmation';
import { BookingForm } from './booking-form';
import { DepartureList } from './departure-list';
import { Hero } from './hero';

interface HomePageProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/** L'accueil : choisir son site, voir ses départs à venir, puis réserver une place. */
export function HomePage({ site, onSiteChange }: HomePageProps) {
  return (
    <>
      <Hero site={site} onSiteChange={onSiteChange} />
      <div className="departures-enter mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        {/* Un autre site repart de zéro : ni trajet choisi, ni confirmation. */}
        {site && <UpcomingDepartures key={site} site={site} />}
      </div>
    </>
  );
}

interface Booked {
  trip: TripResponse;
  confirmation: BookingConfirmationResponse;
}

function UpcomingDepartures({ site }: { site: TripSite }) {
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
