import type { TripResponse } from '@joj/shared';

/**
 * Les données de la fausse API, en mémoire. Les handlers les lisent et les modifient comme la
 * vraie base ; `resetFixture()` (appelé après chaque test par `mockControl.reset()`) les remet
 * dans cet état, pour qu'un test ne dépende jamais de ce qu'un autre a créé ou supprimé.
 * Chaque ressource de l'API y ajoute sa liste, avec ses valeurs de départ.
 */

/**
 * Un trajet tel que la base le garde : avec le téléphone du conducteur, normalisé
 * (« 771234567 »), et le code de gestion ; les places restantes se calculent depuis `bookings`.
 */
export interface StoredTrip extends Omit<TripResponse, 'remainingSeats'> {
  driverPhone: string;
  managementCode: string;
  /** L'instant où le conducteur a annulé le trajet, s'il l'a fait. */
  cancelledAt?: string;
}

const HOUR = 60 * 60 * 1000;
/** Les départs sont relatifs au chargement : « à venir » et « déjà parti » le restent. */
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

export const pikineToDiamniadio: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000101',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: inHours(24),
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '771234567',
  managementCode: 'pikine-code-1',
};

export const guediawayeToDiamniadio: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000102',
  departurePlace: 'Guédiawaye',
  site: 'diamniadio',
  departureAt: inHours(26),
  seats: 4,
  pricePerSeat: 1500,
  driverPhone: '772345678',
  managementCode: 'guediawaye-code',
};

export const plateauToSaly: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000103',
  departurePlace: 'Plateau',
  site: 'saly',
  departureAt: inHours(24),
  seats: 2,
  pricePerSeat: 3000,
  driverPhone: '773456789',
  managementCode: 'plateau-code-1',
};

/** Un trajet déjà parti : la publication le refuserait, il n'existe que dans la fixture. */
export const departedToDiamniadio: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000104',
  departurePlace: 'Rufisque',
  site: 'diamniadio',
  departureAt: inHours(-2),
  seats: 2,
  pricePerSeat: 500,
  driverPhone: '770000000',
  managementCode: 'departed-code',
};

/** Un trajet vers Dakar d'une seule place, déjà réservée dans `bookings`. */
export const fullToDakar: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000105',
  departurePlace: 'Yoff',
  site: 'dakar',
  departureAt: inHours(20),
  seats: 1,
  pricePerSeat: 500,
  driverPhone: '774445566',
  managementCode: 'full-code-1',
};

/** Une réservation telle que la base la garde, téléphone du supporter normalisé. */
export interface StoredBooking {
  id: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  bookingCode: string;
  /** L'instant où le supporter a annulé sa réservation, s'il l'a fait. */
  cancelledAt?: string;
}

const initial = (): { trips: StoredTrip[]; bookings: StoredBooking[] } => ({
  bookings: [
    {
      id: '0199f5c2-0000-7000-8000-000000000201',
      tripId: fullToDakar.id,
      passengerName: 'Fatou',
      passengerPhone: '779998877',
      bookingCode: 'fatou-booking',
    },
  ],
  trips: [
    { ...fullToDakar },
    { ...guediawayeToDiamniadio },
    { ...plateauToSaly },
    { ...departedToDiamniadio },
    { ...pikineToDiamniadio },
  ],
});

export const fixture = initial();

export function resetFixture(): void {
  Object.assign(fixture, initial());
}
