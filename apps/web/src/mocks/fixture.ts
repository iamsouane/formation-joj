import type { TripResponse } from '@joj/shared';

/**
 * Les données de la fausse API, en mémoire. Les handlers les lisent et les modifient comme la
 * vraie base ; `resetFixture()` (appelé après chaque test par `mockControl.reset()`) les remet
 * dans cet état, pour qu'un test ne dépende jamais de ce qu'un autre a créé ou supprimé.
 * Chaque ressource de l'API y ajoute sa liste, avec ses valeurs de départ.
 */

/** Un trajet tel que la base le garde : avec le téléphone du conducteur et le code de gestion. */
export interface StoredTrip extends TripResponse {
  driverPhone: string;
  managementCode: string;
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
  driverPhone: '+221771234567',
  managementCode: 'pikine-code-1',
};

export const guediawayeToDiamniadio: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000102',
  departurePlace: 'Guédiawaye',
  site: 'diamniadio',
  departureAt: inHours(26),
  seats: 4,
  pricePerSeat: 1500,
  driverPhone: '+221772345678',
  managementCode: 'guediawaye-code',
};

export const plateauToSaly: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000103',
  departurePlace: 'Plateau',
  site: 'saly',
  departureAt: inHours(24),
  seats: 2,
  pricePerSeat: 3000,
  driverPhone: '+221773456789',
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
  driverPhone: '+221770000000',
  managementCode: 'departed-code',
};

const initial = (): { trips: StoredTrip[] } => ({
  trips: [
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
