import { normalisePhone } from './phone';
import type { Trip } from './trip';
import { TripError } from './trips.errors';

export interface BookingProps {
  id: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  bookingCode: string;
  createdAt: Date;
}

export interface NewBooking {
  id: string;
  trip: Trip;
  passengerName: string;
  /** Normalisé ici : « 77 123 45 67 » et « +221771234567 » désignent le même supporter. */
  passengerPhone: string;
  bookingCode: string;
  now: Date;
}

/** Une place réservée par un supporter sur un trajet à venir qui n'est pas complet. */
export class Booking {
  private constructor(private readonly props: BookingProps) {}

  static create({ trip, now, ...booking }: NewBooking): Booking {
    const passengerPhone = normalisePhone(booking.passengerPhone);
    assertNotDeparted(trip, now);
    assertNotAlreadyBooked(trip, passengerPhone);
    assertNotFull(trip);
    return new Booking({ ...booking, tripId: trip.id, passengerPhone, createdAt: now });
  }

  /** Reconstruit une réservation depuis la persistance, sans rejouer les règles de création. */
  static restore(props: BookingProps): Booking {
    return new Booking({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get tripId(): string {
    return this.props.tripId;
  }

  get passengerName(): string {
    return this.props.passengerName;
  }

  get passengerPhone(): string {
    return this.props.passengerPhone;
  }

  get bookingCode(): string {
    return this.props.bookingCode;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

function assertNotDeparted(trip: Trip, now: Date): void {
  if (trip.departureAt.getTime() <= now.getTime()) {
    throw new TripError('TRIP_DEPARTED', 'This trip has already departed', {
      tripId: trip.id,
      departureAt: trip.departureAt.toISOString(),
    });
  }
}

function assertNotAlreadyBooked(trip: Trip, passengerPhone: string): void {
  if (trip.hasPassenger(passengerPhone)) {
    throw new TripError('PASSENGER_ALREADY_BOOKED', 'This phone has already booked this trip', {
      tripId: trip.id,
    });
  }
}

function assertNotFull(trip: Trip): void {
  if (trip.remainingSeats <= 0) {
    throw new TripError('TRIP_FULL', 'This trip has no seat left', {
      tripId: trip.id,
      seats: trip.seats,
    });
  }
}
