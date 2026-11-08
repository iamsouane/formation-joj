import type { TripSite } from '@joj/shared';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';

/** Une réservation, et le trajet sur lequel elle porte. */
export interface BookedTrip {
  booking: Booking;
  trip: Trip;
}

/**
 * Port de persistance : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleTripRepository (infra) et InMemoryTripRepository (tests).
 */
export abstract class TripRepository {
  abstract insert(trip: Trip): Promise<void>;
  /**
   * Les trajets non annulés vers `site` qui partent strictement après `now`, triés par heure de
   * départ. Dans tous les trajets renvoyés, `passengerPhones` ne compte que les réservations non annulées.
   */
  abstract listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]>;
  /**
   * Lit le trajet avec ses réservations, laisse `book` appliquer les règles et créer la
   * réservation, puis l'enregistre, d'un seul tenant : deux réservations simultanées ne prennent
   * pas la même dernière place. `undefined` si aucun trajet n'a cet identifiant.
   */
  abstract reserve(tripId: string, book: (trip: Trip) => Booking): Promise<Booking | undefined>;
  /** Le trajet, annulé ou non, avec ses réservations non annulées ; `undefined` s'il n'existe pas. */
  abstract findTrip(tripId: string): Promise<Trip | undefined>;
  /** La réservation, annulée ou non, et son trajet ; `undefined` si aucune n'a ce code. */
  abstract findBookingByCode(bookingCode: string): Promise<BookedTrip | undefined>;
  /** Enregistre la date d'annulation d'un trajet. */
  abstract saveTripCancellation(trip: Trip): Promise<void>;
  /** Enregistre la date d'annulation d'une réservation. */
  abstract saveBookingCancellation(booking: Booking): Promise<void>;
}
