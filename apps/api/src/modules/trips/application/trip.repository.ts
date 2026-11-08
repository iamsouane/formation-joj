import type { TripSite } from '@joj/shared';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';

/**
 * Port de persistance : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleTripRepository (infra) et InMemoryTripRepository (tests).
 */
export abstract class TripRepository {
  abstract insert(trip: Trip): Promise<void>;
  /** Les trajets vers `site` qui partent strictement après `now`, triés par heure de départ. */
  abstract listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]>;
  /**
   * Lit le trajet avec ses réservations, laisse `book` appliquer les règles et créer la
   * réservation, puis l'enregistre, d'un seul tenant : deux réservations simultanées ne prennent
   * pas la même dernière place. `undefined` si aucun trajet n'a cet identifiant.
   */
  abstract reserve(tripId: string, book: (trip: Trip) => Booking): Promise<Booking | undefined>;
}
