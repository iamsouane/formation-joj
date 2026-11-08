import type { TripSite } from '@joj/shared';
import type { Booking } from '../../domain/booking';
import { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre par site et par heure, tri, réservations), pour tester sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();
  private readonly bookings: Booking[] = [];

  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, trip);
  }

  async listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]> {
    return [...this.rows.values()]
      .filter((trip) => trip.site === site && trip.departureAt.getTime() > now.getTime())
      .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
      .map((trip) => this.withPassengers(trip));
  }

  async reserve(tripId: string, book: (trip: Trip) => Booking): Promise<Booking | undefined> {
    const trip = this.rows.get(tripId);
    if (trip === undefined) return undefined;
    const booking = book(this.withPassengers(trip));
    this.bookings.push(booking);
    return booking;
  }

  /** Copie relue « depuis la base » : un test ne voit pas une modification non persistée. */
  private withPassengers(trip: Trip): Trip {
    return Trip.restore({
      id: trip.id,
      departurePlace: trip.departurePlace,
      site: trip.site,
      departureAt: trip.departureAt,
      seats: trip.seats,
      pricePerSeat: trip.pricePerSeat,
      driverPhone: trip.driverPhone,
      managementCode: trip.managementCode,
      createdAt: trip.createdAt,
      passengerPhones: this.bookings
        .filter((booking) => booking.tripId === trip.id)
        .map((booking) => booking.passengerPhone),
    });
  }
}
