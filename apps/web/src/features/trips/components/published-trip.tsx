import type { PublishedTripResponse } from '@joj/shared';
import { useId } from 'react';
import { formatDepartureDay, formatDepartureTime, formatPrice, SITE_LABELS } from './format';
import { managementLinkOf } from './management-link';

/** « 1 place », « 3 places » : les places publiées. */
const formatSeats = (seats: number) => (seats === 1 ? '1 place' : `${seats} places`);

/**
 * Le trajet est publié : un billet, comme celui du supporter. En haut, le trajet tel qu'il a été
 * compris (heure, trajet, places, participation), pour que le conducteur le vérifie ; sous la
 * déchirure, le code et le lien de gestion, à conserver.
 */
export function PublishedTrip({ trip }: { trip: PublishedTripResponse }) {
  const titleId = useId();
  const link = managementLinkOf(trip.id);
  return (
    <section aria-labelledby={titleId} className="ticket published-trip">
      <header className="ticket-trip">
        <h2 id={titleId} className="ticket-title">
          Trajet publié
        </h2>
        <p className="ticket-when" data-part="ticket-time">
          <time dateTime={trip.departureAt}>
            <span className="ticket-time">{formatDepartureTime(trip.departureAt)}</span>{' '}
            <span className="ticket-day">{formatDepartureDay(trip.departureAt)}</span>
          </time>
        </p>
        <p className="ticket-route" data-part="ticket-route">
          {trip.departurePlace} → {SITE_LABELS[trip.site]}
        </p>
        <p className="published-trip-terms">
          <span>{formatSeats(trip.seats)}</span>
          <span>{formatPrice(trip.pricePerSeat)} par place</span>
        </p>
      </header>
      <div className="ticket-tear" aria-hidden="true" />
      <dl className="ticket-body published-trip-body">
        <div className="ticket-field">
          <dt>Code de gestion</dt>
          <dd className="ticket-code select-all" data-part="management-code">
            {trip.managementCode}
          </dd>
        </div>
        <div className="ticket-field">
          <dt>Lien de gestion</dt>
          <dd className="published-trip-link select-all" data-part="management-link">
            {link}
          </dd>
        </div>
      </dl>
    </section>
  );
}
