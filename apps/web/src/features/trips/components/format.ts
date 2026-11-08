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

/** « 1 000 FCFA » : la participation aux frais par place. */
export function formatPrice(pricePerSeat: number): string {
  return `${pricePerSeat.toLocaleString('fr-FR')} FCFA`;
}

/** « 1 place restante », « 3 places restantes ». */
export function formatRemainingSeats(remainingSeats: number): string {
  return remainingSeats === 1 ? '1 place restante' : `${remainingSeats} places restantes`;
}
