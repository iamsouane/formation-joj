import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PublishTripInput } from '@joj/shared';
import { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

@Injectable()
export class PublishTrip {
  constructor(private readonly trips: TripRepository) {}

  async execute(input: PublishTripInput): Promise<Trip> {
    const trip = Trip.create({
      ...input,
      id: randomUUID(),
      departureAt: new Date(input.departureAt),
      managementCode: newManagementCode(),
      now: new Date(),
    });
    await this.trips.insert(trip);
    return trip;
  }
}

/** Secret remis au seul conducteur : 12 caractères tirés au hasard, sûrs dans une URL. */
export function newManagementCode(): string {
  return randomBytes(9).toString('base64url');
}
