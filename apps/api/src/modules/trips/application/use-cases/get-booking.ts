import { Injectable } from '@nestjs/common';
import type { BookingStatus } from '@joj/shared';
import type { Booking } from '../../domain/booking';
import type { Trip } from '../../domain/trip';
import { TripError } from '../../domain/trips.errors';
import { type BookedTrip, TripRepository } from '../trip.repository';

export interface BookingDetails {
  booking: Booking;
  trip: Trip;
  status: BookingStatus;
}

@Injectable()
export class GetBooking {
  constructor(private readonly trips: TripRepository) {}

  /** Lève BOOKING_NOT_FOUND si aucune réservation n'a ce code. */
  async execute(bookingCode: string): Promise<BookingDetails> {
    const { booking, trip } = await findBooking(this.trips, bookingCode);
    return { booking, trip, status: booking.statusOn(trip) };
  }
}

/** La réservation et son trajet, ou BOOKING_NOT_FOUND. */
export async function findBooking(trips: TripRepository, bookingCode: string): Promise<BookedTrip> {
  const found = await trips.findBookingByCode(bookingCode);
  if (found === undefined) {
    throw new TripError('BOOKING_NOT_FOUND', 'No booking with this code');
  }
  return found;
}
