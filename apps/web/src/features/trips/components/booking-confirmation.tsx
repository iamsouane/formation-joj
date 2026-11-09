import type { BookingConfirmationResponse, TripResponse } from '@joj/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { ConfettiRain } from './confetti-rain';
import { FlameCelebration } from './flame-celebration';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPhone,
  formatPlace,
  phoneHref,
  SITE_LABELS,
} from './format';

interface BookingConfirmationProps {
  trip: TripResponse;
  confirmation: BookingConfirmationResponse;
  onDone: () => void;
}

/**
 * La place est réservée : un billet façon carte d'embarquement. L'heure et le trajet en haut, une
 * ligne de déchirure, puis le code en gros (à garder) et le conducteur à appeler pour le
 * rendez-vous. La mascotte à la flamme saute de joie sous une pluie de confettis.
 */
export function BookingConfirmation({ trip, confirmation, onDone }: BookingConfirmationProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="ticket">
      <ConfettiRain />
      <header className="ticket-head">
        <div className="ticket-trip">
          <h2 id={titleId} className="ticket-title">
            Place réservée
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
        </div>
        <FlameCelebration />
      </header>
      <div className="ticket-tear" aria-hidden="true" />
      <dl className="ticket-body">
        <div className="ticket-field">
          <dt>Code de réservation</dt>
          <dd className="ticket-code select-all" data-part="ticket-code">
            {confirmation.bookingCode}
          </dd>
          <dd className="ticket-note">Gardez ce code : il identifie votre réservation.</dd>
        </div>
        <div className="ticket-field">
          <dt>Conducteur</dt>
          <dd>
            <a href={phoneHref(confirmation.driverPhone)} className="ticket-phone">
              {formatPhone(confirmation.driverPhone)}
            </a>
          </dd>
          <dd className="ticket-note">Appelez-le pour fixer le point de rendez-vous.</dd>
        </div>
      </dl>
      <Button variant="outline" size="lg" onClick={onDone} className="thumb-action ticket-done">
        Voir les autres départs
      </Button>
    </section>
  );
}
