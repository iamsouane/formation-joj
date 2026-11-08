import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BookSeatInput } from '@joj/shared';
import { Booking } from '../../domain/booking';
import type { Trip } from '../../domain/trip';
import { TripError } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';

export interface SeatBooked {
  booking: Booking;
  /** Remis au seul supporter qui vient de réserver, pour fixer le point de rendez-vous. */
  driverPhone: string;
}

@Injectable()
export class BookSeat {
  constructor(private readonly trips: TripRepository) {}

  /** Lève TRIP_NOT_FOUND, ou l'un des refus de `Booking.create()`. */
  async execute(tripId: string, input: BookSeatInput): Promise<SeatBooked> {
    let driverPhone = '';
    const booking = await this.trips.reserve(tripId, (trip: Trip) => {
      driverPhone = trip.driverPhone;
      return Booking.create({
        ...input,
        trip,
        id: randomUUID(),
        bookingCode: newBookingCode(),
        now: new Date(),
      });
    });
    if (booking === undefined) {
      throw new TripError('TRIP_NOT_FOUND', `No trip ${tripId}`, { tripId });
    }
    return { booking, driverPhone };
  }
}

/** Secret remis au seul supporter : 12 caractères tirés au hasard, sûrs dans une URL. */
function newBookingCode(): string {
  return randomBytes(9).toString('base64url');
}
