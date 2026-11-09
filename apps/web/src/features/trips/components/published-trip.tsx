import type { PublishedTripResponse } from '@joj/shared';
import { useEffect, useId, useRef } from 'react';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPlace,
  formatPrice,
  formatSeats,
  SITE_LABELS,
} from './format';
import { managementLinkOf } from './management-link';
import { publishedTripShareText } from './whatsapp-share';
import { WhatsappShareLink } from './whatsapp-share-link';

/**
 * Le trajet est publié : un billet, comme celui du supporter. En haut, le trajet tel qu'il a été
 * compris (heure, trajet, places, participation), pour que le conducteur le vérifie ; sous la
 * déchirure, le code et le lien de gestion, à conserver, et leur envoi sur WhatsApp. Le lien
 * désigne le trajet ; le code n'y figure jamais, il se saisit à part.
 */
export function PublishedTrip({ trip }: { trip: PublishedTripResponse }) {
  const titleId = useId();
  const keepId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const link = managementLinkOf(trip.id);
  const message = publishedTripShareText(trip, link);

  // Le bouton « Publier » a disparu avec le formulaire : le focus passe au billet.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  return (
    <section aria-labelledby={titleId} className="ticket published-trip">
      <header className="ticket-trip">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="ticket-title">
          Trajet publié
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
        <p className="published-trip-terms">
          <span>{formatSeats(trip.seats)}</span>
          <span>{formatPrice(trip.pricePerSeat)} par place</span>
        </p>
        <p className="published-trip-check">
          Vérifiez votre trajet. S’il y a une erreur, annulez-le avec votre code.
        </p>
      </header>
      <div className="ticket-tear" aria-hidden="true" />
      <div role="group" aria-labelledby={keepId} className="published-trip-keep">
        <h3 id={keepId} className="published-trip-keep-title">
          À conserver
        </h3>
        <dl className="ticket-body published-trip-body">
          <div className="ticket-field">
            <dt>Code de gestion</dt>
            <dd className="ticket-code select-all" data-part="management-code">
              {trip.managementCode}
            </dd>
            <dd className="ticket-note">Gardez-le pour vous : il permet d’annuler le trajet.</dd>
          </div>
          <div className="ticket-field">
            <dt>Lien de gestion</dt>
            <dd className="published-trip-link select-all" data-part="management-link">
              {link}
            </dd>
          </div>
        </dl>
        <WhatsappShareLink message={message} />
      </div>
    </section>
  );
}
