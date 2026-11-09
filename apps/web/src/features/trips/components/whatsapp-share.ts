import type { PublishedTripResponse } from '@joj/shared';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPlace,
  formatPrice,
  formatSeats,
  SITE_LABELS,
} from './format';

/**
 * L'adresse qui ouvre WhatsApp avec un message prérempli. Sans numéro : le conducteur choisit
 * lui-même à qui l'envoyer, à commencer par lui-même. Tout le texte est encodé, retours à la
 * ligne compris. Pas `wa.me` : dès que le texte contient une adresse, wa.me redirige en ajoutant
 * `type=custom_url`, et WhatsApp ne partage plus que le lien, sans le trajet ni le code.
 */
export function whatsappShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Sur téléphone, sans feuille de partage : l'application WhatsApp, ouverte directement avec le
 * message.
 */
export function whatsappAppUrl(text: string): string {
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

/** Vrai sur un écran tactile (le doigt pour pointeur) : un téléphone ou une tablette. */
export function isPhonePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Le message du conducteur. Le trajet et le code passent avant le lien : ils restent lisibles même
 * si l'application qui reçoit le message ne garde que l'adresse. Il a la forme d'une adresse que
 * WhatsApp lit en entier sur iPhone : des mots (« Kolda vers Diamniadio », pas de flèche), des
 * espaces simples (pas d'insécable dans « 1 000 »), et aucune ligne vide.
 */
export function publishedTripShareText(
  trip: PublishedTripResponse,
  managementLink: string,
): string {
  return [
    'Mon trajet pour les JOJ Dakar 2026',
    `Trajet ${formatPlace(trip.departurePlace)} vers ${SITE_LABELS[trip.site]}`,
    `${formatDepartureDay(trip.departureAt)} à ${formatDepartureTime(trip.departureAt)}`,
    `${formatSeats(trip.seats)}, ${formatPrice(trip.pricePerSeat).replace(/\s/g, ' ')} par place`,
    `Code de gestion : ${trip.managementCode}`,
    'Code à garder pour vous, ne le partagez pas.',
    `Lien de gestion : ${managementLink}`,
  ].join('\n');
}
