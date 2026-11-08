import { Injectable } from '@nestjs/common';
import { parseTripSite, type Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

@Injectable()
export class ListUpcomingTrips {
  constructor(private readonly trips: TripRepository) {}

  /** Lève SITE_UNKNOWN si le site, une fois normalisé, n'est pas un site des JOJ. */
  async execute(site: string): Promise<Trip[]> {
    return this.trips.listUpcomingBySite(parseTripSite(site), new Date());
  }
}
