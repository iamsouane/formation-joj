import type { PublishedTripResponse } from '@joj/shared';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPrice,
  formatSeats,
  SITE_LABELS,
} from './format';

/**
 * L'adresse qui ouvre WhatsApp avec un message prérempli. Sans numéro : le conducteur choisit
 * lui-même à qui l'envoyer, à commencer par lui-même.
 */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Le message du conducteur : son trajet, son code de gestion avec sa mise en garde, son lien. */
export function publishedTripShareText(
  trip: PublishedTripResponse,
  managementLink: string,
): string {
  return [
    'Mon trajet pour les JOJ Dakar 2026',
    `${trip.departurePlace} → ${SITE_LABELS[trip.site]}`,
    `${formatDepartureDay(trip.departureAt)} à ${formatDepartureTime(trip.departureAt)}`,
    `${formatSeats(trip.seats)}, ${formatPrice(trip.pricePerSeat)} par place`,
    '',
    `Code de gestion : ${trip.managementCode}`,
    'Code à garder pour vous, ne le partagez pas.',
    '',
    `Lien de gestion : ${managementLink}`,
  ].join('\n');
}
