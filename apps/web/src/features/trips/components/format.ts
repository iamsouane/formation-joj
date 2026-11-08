import type { TripSite } from '@joj/shared';

/** Le nom d'un site tel que le supporter le lit. */
export const SITE_LABELS: Record<TripSite, string> = {
  dakar: 'Dakar',
  diamniadio: 'Diamniadio',
  saly: 'Saly',
};

/** Dakar vit à l'heure de Dakar, quel que soit le fuseau du téléphone. */
const departureFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Dakar',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** « mar. 10 nov., 08:00 » : le jour et l'heure de départ, à Dakar. */
export function formatDeparture(departureAt: string): string {
  return departureFormat.format(new Date(departureAt));
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Dakar',
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Dakar',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** « 08:00 » : l'heure de départ, à Dakar. */
export function formatDepartureTime(departureAt: string): string {
  return timeFormat.format(new Date(departureAt));
}

/** « lun. 9 nov. » : le jour du départ, à Dakar. */
export function formatDepartureDay(departureAt: string): string {
  return dayFormat.format(new Date(departureAt));
}

/**
 * L'espace insécable des milliers (U+00A0). La typographie française préfère l'espace fine
 * (U+202F), mais la police Barlow ne la dessine pas : « 1 000 » s'afficherait « 1000 ».
 */
const THOUSANDS_SPACE = '\u00a0';

/**
 * « 1 000 FCFA » : la participation aux frais par place. Les milliers sont groupés à la main :
 * selon le navigateur, `toLocaleString('fr-FR')` écrit « 1000 » ou « 1 000 ».
 */
export function formatPrice(pricePerSeat: number): string {
  const digits = String(Math.trunc(pricePerSeat));
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SPACE)} FCFA`;
}

/** « 1 place restante », « 3 places restantes ». */
export function formatRemainingSeats(remainingSeats: number): string {
  return remainingSeats === 1 ? '1 place restante' : `${remainingSeats} places restantes`;
}

/** Un téléphone sénégalais à 9 chiffres, tel que l'API le renvoie : « 771234567 ». */
const SENEGAL_PHONE = /^(\d{2})(\d{3})(\d{2})(\d{2})$/;

/** « 77 123 45 67 » ; un numéro d'une autre forme reste tel quel. */
export function formatPhone(phone: string): string {
  return phone.replace(SENEGAL_PHONE, '$1 $2 $3 $4');
}

/** Le lien d'appel : « tel:+221771234567 » pour un numéro sénégalais à 9 chiffres. */
export function phoneHref(phone: string): string {
  return SENEGAL_PHONE.test(phone) ? `tel:+221${phone}` : `tel:${phone}`;
}
