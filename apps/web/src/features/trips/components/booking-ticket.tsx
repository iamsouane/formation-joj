import type { BookingDetailsResponse } from '@joj/shared';
import { useEffect, useId, useRef } from 'react';
import {
  BOOKING_STATUS_LABELS,
  formatDepartureDay,
  formatDepartureTime,
  formatPhone,
  formatPlace,
  formatPrice,
  phoneHref,
  SITE_LABELS,
} from './format';

/**
 * La réservation retrouvée avec son code : le même billet qu'après la réservation. En tête, la
 * bande de validité dit où elle en est (active, annulée, trajet annulé) ; dessous, le trajet, puis
 * sous la déchirure le code et le conducteur à appeler. Un billet qui ne vaut plus a son heure et
 * son trajet barrés.
 */
export function BookingTicket({ booking }: { booking: BookingDetailsResponse }) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { trip, status } = booking;

  // Le bouton « Voir ma réservation » a disparu avec le formulaire : le focus passe au billet.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={titleId} className="ticket booking-ticket" data-status={status}>
      <header className="ticket-trip">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="ticket-title">
          Votre billet
        </h2>
        <p className="ticket-when" data-part="ticket-time">
          <time dateTime={trip.departureAt}>
            <span className="ticket-time">{formatDepartureTime(trip.departureAt)}</span>{' '}
            <span className="ticket-day">{formatDepartureDay(trip.departureAt)}</span>
          </time>
        </p>
        <p className="ticket-route" data-part="ticket-route">
          {formatPlace(trip.departurePlace)} → {SITE_LABELS[trip.site]}
        </p>
        <p className="ticket-terms">{formatPrice(trip.pricePerSeat)} par place</p>
      </header>
      {/* Après le titre dans la lecture, en tête du billet à l'écran (`order` dans styles.css). */}
      <p key={status} className="ticket-status" data-part="ticket-status">
        {BOOKING_STATUS_LABELS[status]}
      </p>
      <div className="ticket-tear" aria-hidden="true" />
      <dl className="ticket-body">
        <div className="ticket-field">
          <dt>Code de réservation</dt>
          <dd className="ticket-code select-all" data-part="ticket-code">
            {booking.bookingCode}
          </dd>
        </div>
        <div className="ticket-field">
          <dt>Conducteur</dt>
          <dd>
            <a href={phoneHref(trip.driverPhone)} className="ticket-phone">
              {formatPhone(trip.driverPhone)}
            </a>
          </dd>
          {status === 'active' && (
            <dd className="ticket-note">Appelez-le pour fixer le point de rendez-vous.</dd>
          )}
        </div>
      </dl>
    </section>
  );
}
