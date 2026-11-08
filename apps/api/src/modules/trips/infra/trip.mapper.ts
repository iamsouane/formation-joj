import { tripSchema } from '@joj/shared';
import { Booking } from '../domain/booking';
import { Trip } from '../domain/trip';
import type { BookingRow } from './bookings.schema';
import type { TripRow } from './trips.schema';

/** Ligne de la table → entité. Un site inconnu en base est un bug : on échoue tôt. */
export function toDomain(
  { cancelledAt, ...row }: TripRow,
  passengerPhones: readonly string[] = [],
): Trip {
  return Trip.restore({
    ...row,
    site: tripSchema.shape.site.parse(row.site),
    passengerPhones,
    ...(cancelledAt !== null && { cancelledAt }),
  });
}

/** Entité → ligne de la table. */
export function toRow(trip: Trip): TripRow {
  return {
    id: trip.id,
    departurePlace: trip.departurePlace,
    site: trip.site,
    departureAt: trip.departureAt,
    seats: trip.seats,
    pricePerSeat: trip.pricePerSeat,
    driverPhone: trip.driverPhone,
    managementCode: trip.managementCode,
    createdAt: trip.createdAt,
    cancelledAt: trip.cancelledAt ?? null,
  };
}

/** Ligne de la table `bookings` → réservation. */
export function toBooking({ cancelledAt, ...row }: BookingRow): Booking {
  return Booking.restore({ ...row, ...(cancelledAt !== null && { cancelledAt }) });
}

/** Réservation → ligne de la table `bookings`. */
export function toBookingRow(booking: Booking): BookingRow {
  return {
    id: booking.id,
    tripId: booking.tripId,
    passengerName: booking.passengerName,
    passengerPhone: booking.passengerPhone,
    bookingCode: booking.bookingCode,
    createdAt: booking.createdAt,
    cancelledAt: booking.cancelledAt ?? null,
  };
}
