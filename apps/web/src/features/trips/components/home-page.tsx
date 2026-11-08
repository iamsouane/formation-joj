import type { BookingConfirmationResponse, TripResponse, TripSite } from '@joj/shared';
import { useState } from 'react';
import { useUpcomingTrips } from '../api/trips.queries';
import { BookingConfirmation } from './booking-confirmation';
import { BookingForm } from './booking-form';
import { DepartureList } from './departure-list';
import { MascotStage } from './mascot-stage';
import { SitePicker } from './site-picker';

interface HomePageProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite) => void;
}

/** L'accueil : choisir son site, voir ses départs à venir, puis réserver une place. */
export function HomePage({ site, onSiteChange }: HomePageProps) {
  return (
    <div className="flex flex-col gap-5">
      <MascotStage compact={site !== undefined} />
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase">
        Où allez-vous pour les Jeux ?
      </h1>
      <SitePicker value={site} onChange={onSiteChange} />
      {/* Un autre site repart de zéro : ni trajet choisi, ni confirmation. */}
      {site && <UpcomingDepartures key={site} site={site} />}
    </div>
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
