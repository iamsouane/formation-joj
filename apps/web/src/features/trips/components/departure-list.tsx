import type { TripResponse, TripSite } from '@joj/shared';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPrice,
  formatRemainingSeats,
  SITE_LABELS,
} from './format';

interface DepartureListProps {
  site: TripSite;
  trips: TripResponse[];
  /** Le trajet dont le formulaire de réservation est ouvert, s'il y en a un. */
  openTripId?: string | undefined;
  /** Le supporter ouvre ou referme le formulaire de réservation de ce trajet. */
  onToggleBooking?: (trip: TripResponse) => void;
  /** Ce qui s'ouvre sous le trajet choisi : le formulaire de réservation. */
  renderBooking?: (trip: TripResponse) => ReactNode;
}

/** Les places du trajet en pastilles : pleine si elle est libre, vide si elle est prise. */
function SeatDots({ trip }: { trip: TripResponse }) {
  const taken = trip.seats - trip.remainingSeats;
  return (
    <span className="seat-dots" data-part="seats" aria-hidden="true">
      {Array.from({ length: trip.seats }, (_, index) => (
        <span key={index} className="seat-dot" data-free={index >= taken} />
      ))}
    </span>
  );
}

/**
 * Les départs à venir d'un site, dans l'ordre où l'API les renvoie : par heure (au moins un).
 * Chaque carte se lit de haut en bas : l'heure en très grand, le trajet, les places en pastilles
 * et la participation ; puis « Réserver », qui devient « Annuler » tant que le formulaire est ouvert.
 */
export function DepartureList({
  site,
  trips,
  openTripId,
  onToggleBooking,
  renderBooking,
}: DepartureListProps) {
  const siteLabel = SITE_LABELS[site];

  return (
    <ul aria-label={`Départs vers ${siteLabel}`} data-layout="grid" className="departure-grid">
      {trips.map((trip) => {
        const open = trip.id === openTripId;
        return (
          <li key={trip.id} className="departure-bubble departure-card">
            <p className="departure-when">
              <time dateTime={trip.departureAt}>
                <span className="departure-time">{formatDepartureTime(trip.departureAt)}</span>{' '}
                <span className="departure-day">{formatDepartureDay(trip.departureAt)}</span>
              </time>
            </p>
            <h2 className="departure-route">
              {trip.departurePlace} → {siteLabel}
            </h2>
            <div className="departure-meta">
              {trip.remainingSeats > 0 ? (
                <span className="departure-seats">
                  <SeatDots trip={trip} />
                  <span>{formatRemainingSeats(trip.remainingSeats)}</span>
                </span>
              ) : (
                <span className="departure-full">Complet</span>
              )}
              <span className="departure-price">{formatPrice(trip.pricePerSeat)}</span>
            </div>
            {trip.remainingSeats > 0 && (
              <Button
                size="lg"
                variant={open ? 'outline' : 'default'}
                className="departure-action thumb-action"
                aria-expanded={open}
                aria-label={
                  open
                    ? `Annuler : ne pas réserver depuis ${trip.departurePlace}`
                    : `Réserver une place depuis ${trip.departurePlace}`
                }
                onClick={() => onToggleBooking?.(trip)}
              >
                {open ? 'Annuler' : 'Réserver'}
              </Button>
            )}
            {renderBooking?.(trip)}
          </li>
        );
      })}
    </ul>
  );
}
