import { Inject, Injectable } from '@nestjs/common';
import type { TripSite } from '@joj/shared';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { TripRepository } from '../application/trip.repository';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';
import { toDomain, toRow } from './trip.mapper';
import { trips } from './trips.schema';

@Injectable()
export class DrizzleTripRepository extends TripRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async insert(trip: Trip): Promise<void> {
    await this.db.insert(trips).values(toRow(trip));
  }

  async listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]> {
    const rows = await this.db
      .select()
      .from(trips)
      .where(and(eq(trips.site, site), gt(trips.departureAt, now)))
      .orderBy(asc(trips.departureAt));
    return rows.map(toDomain);
  }

  async reserve(_tripId: string, _book: (trip: Trip) => Booking): Promise<Booking | undefined> {
    throw new Error('non implémenté');
  }
}
