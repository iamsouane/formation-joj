import type { BookingStatus } from '@joj/shared';
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
  /** L'instant où le supporter a annulé sa réservation ; absent tant qu'il ne l'a pas fait. */
  cancelledAt?: Date;
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
    assertNotCancelled(trip);
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

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  /** Annule la réservation ; déjà annulée, elle est renvoyée telle quelle, sa première date conservée. */
  cancel(now: Date): Booking {
    if (this.props.cancelledAt !== undefined) return this;
    return new Booking({ ...this.props, cancelledAt: now });
  }

  /** L'annulation du supporter l'emporte sur celle du trajet. */
  statusOn(trip: Trip): BookingStatus {
    if (this.props.cancelledAt !== undefined) return 'cancelled';
    return trip.isCancelled ? 'trip_cancelled' : 'active';
  }
}

function assertNotCancelled(trip: Trip): void {
  if (trip.isCancelled) {
    throw new TripError('TRIP_CANCELLED', 'This trip has been cancelled by its driver', {
      tripId: trip.id,
    });
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
