import { Injectable } from '@nestjs/common';
import type { CancelTripInput } from '@joj/shared';
import { TripError } from '../../domain/trips.errors';
import { TripRepository } from '../trip.repository';

@Injectable()
export class CancelTrip {
  constructor(private readonly trips: TripRepository) {}

  /** Lève TRIP_NOT_FOUND, ou MANAGEMENT_CODE_INVALID si le code n'est pas celui du trajet. */
  async execute(tripId: string, { managementCode }: CancelTripInput): Promise<void> {
    const trip = await this.trips.findTrip(tripId);
    if (trip === undefined) {
      throw new TripError('TRIP_NOT_FOUND', `No trip ${tripId}`, { tripId });
    }
    await this.trips.saveTripCancellation(trip.cancel(managementCode, new Date()));
  }
}
