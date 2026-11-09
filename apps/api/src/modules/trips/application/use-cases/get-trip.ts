import { Injectable } from '@nestjs/common';
import type { Trip } from '../../domain/trip';
import { TripError } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';

@Injectable()
export class GetTrip {
  constructor(private readonly trips: TripRepository) {}

  /** Le trajet, annulé ou non. Lève TRIP_NOT_FOUND si aucun trajet n'a cet identifiant. */
  async execute(tripId: string): Promise<Trip> {
    const trip = await this.trips.findTrip(tripId);
    if (trip === undefined) {
      throw new TripError('TRIP_NOT_FOUND', `No trip ${tripId}`, { tripId });
    }
    return trip;
  }
}
