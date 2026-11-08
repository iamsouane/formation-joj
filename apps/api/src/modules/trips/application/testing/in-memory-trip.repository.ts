import type { TripSite } from '@joj/shared';
import type { Booking } from '../../domain/booking';
import { Trip } from '../../domain/trip';
import { type BookedTrip, TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre par site, par heure et par annulation, tri, réservations), pour tester sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();
  private readonly bookings = new Map<string, Booking>();

  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, trip);
  }

  async listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]> {
    return [...this.rows.values()]
      .filter((trip) => !trip.isCancelled)
      .filter((trip) => trip.site === site && trip.departureAt.getTime() > now.getTime())
      .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
      .map((trip) => this.withPassengers(trip));
  }

  async reserve(tripId: string, book: (trip: Trip) => Booking): Promise<Booking | undefined> {
    const trip = this.rows.get(tripId);
    if (trip === undefined) return undefined;
    const booking = book(this.withPassengers(trip));
    this.bookings.set(booking.id, booking);
    return booking;
  }

  async findTrip(tripId: string): Promise<Trip | undefined> {
    const trip = this.rows.get(tripId);
    return trip && this.withPassengers(trip);
  }

  async findBookingByCode(bookingCode: string): Promise<BookedTrip | undefined> {
    const booking = [...this.bookings.values()].find((b) => b.bookingCode === bookingCode);
    const trip = booking && this.rows.get(booking.tripId);
    if (booking === undefined || trip === undefined) return undefined;
    return { booking, trip: this.withPassengers(trip) };
  }

  async saveTripCancellation(trip: Trip): Promise<void> {
    this.rows.set(trip.id, trip);
  }

  async saveBookingCancellation(booking: Booking): Promise<void> {
    this.bookings.set(booking.id, booking);
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
      ...(trip.cancelledAt && { cancelledAt: trip.cancelledAt }),
      passengerPhones: [...this.bookings.values()]
        .filter((booking) => booking.tripId === trip.id && booking.cancelledAt === undefined)
        .map((booking) => booking.passengerPhone),
    });
  }
}
