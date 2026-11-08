import { Injectable } from '@nestjs/common';
import { TripRepository } from '../trip.repository';
import { findBooking } from './get-booking';

@Injectable()
export class CancelBooking {
  constructor(private readonly trips: TripRepository) {}

  /** Lève BOOKING_NOT_FOUND ; annuler une réservation déjà annulée ne change rien. */
  async execute(bookingCode: string): Promise<void> {
    const { booking } = await findBooking(this.trips, bookingCode);
    await this.trips.saveBookingCancellation(booking.cancel(new Date()));
  }
}
