import type { TripResponse, TripSite } from '@joj/shared';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formatDeparture, formatPrice, formatRemainingSeats, SITE_LABELS } from './format';

interface DepartureListProps {
  site: TripSite;
  trips: TripResponse[];
  /** Le supporter choisit ce trajet pour y réserver une place. */
  onBook?: (trip: TripResponse) => void;
  /** Ce qui s'ouvre sous le trajet choisi : le formulaire de réservation. */
  renderBooking?: (trip: TripResponse) => ReactNode;
}

/** Les départs à venir d'un site, dans l'ordre où l'API les renvoie : par heure. */
export function DepartureList({ site, trips, onBook, renderBooking }: DepartureListProps) {
  const siteLabel = SITE_LABELS[site];
  if (trips.length === 0) {
    return <p className="text-muted-foreground">Aucun départ à venir vers {siteLabel}.</p>;
  }

  return (
    <ul aria-label={`Départs vers ${siteLabel}`} className="flex flex-col gap-3">
      {trips.map((trip) => (
        <li key={trip.id} className="flex flex-col gap-1 border-2 border-foreground p-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-bold">{trip.departurePlace}</h3>
            <span className="font-semibold tabular-nums">{formatPrice(trip.pricePerSeat)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{formatDeparture(trip.departureAt)}</span>
            {trip.remainingSeats > 0 ? (
              <span>{formatRemainingSeats(trip.remainingSeats)}</span>
            ) : (
              <span className="bg-destructive px-2 font-semibold text-white">Complet</span>
            )}
          </div>
          {trip.remainingSeats > 0 && (
            <Button
              className="mt-2 self-start"
              aria-label={`Réserver une place depuis ${trip.departurePlace}`}
              onClick={() => onBook?.(trip)}
            >
              Réserver
            </Button>
          )}
          {renderBooking?.(trip)}
        </li>
      ))}
    </ul>
  );
}
