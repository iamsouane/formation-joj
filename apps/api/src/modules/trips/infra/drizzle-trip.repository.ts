import { Inject, Injectable } from '@nestjs/common';
import type { TripSite } from '@joj/shared';
import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { isUniqueViolation } from '../../../core/database/pg-errors';
import { TripRepository } from '../application/trip.repository';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';
import { TripError } from '../domain/trips.errors';
import { BOOKINGS_TRIP_PASSENGER_PHONE_KEY, bookings } from './bookings.schema';
import { toBookingRow, toDomain, toRow } from './trip.mapper';
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
    const phones = await this.passengerPhonesOf(
      this.db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => toDomain(row, phones.get(row.id)));
  }

  /** Le trajet est verrouillé (`FOR UPDATE`) jusqu'à la fin de la transaction. */
  async reserve(tripId: string, book: (trip: Trip) => Booking): Promise<Booking | undefined> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(trips).where(eq(trips.id, tripId)).for('update');
      if (row === undefined) return undefined;
      const phones = await this.passengerPhonesOf(tx, [tripId]);
      const booking = book(toDomain(row, phones.get(tripId)));
      await insertBooking(tx, booking);
      return booking;
    });
  }

  /** Les téléphones des réservations, par trajet. */
  private async passengerPhonesOf(
    db: Pick<Database, 'select'>,
    tripIds: string[],
  ): Promise<Map<string, string[]>> {
    const phones = new Map<string, string[]>();
    if (tripIds.length === 0) return phones;
    const rows = await db
      .select({ tripId: bookings.tripId, passengerPhone: bookings.passengerPhone })
      .from(bookings)
      .where(inArray(bookings.tripId, tripIds));
    for (const { tripId, passengerPhone } of rows) {
      phones.set(tripId, [...(phones.get(tripId) ?? []), passengerPhone]);
    }
    return phones;
  }
}

/** La contrainte d'unicité rattrape deux réservations simultanées du même téléphone. */
async function insertBooking(db: Pick<Database, 'insert'>, booking: Booking): Promise<void> {
  try {
    await db.insert(bookings).values(toBookingRow(booking));
  } catch (error) {
    if (isUniqueViolation(error, BOOKINGS_TRIP_PASSENGER_PHONE_KEY)) {
      throw new TripError('PASSENGER_ALREADY_BOOKED', 'This phone has already booked this trip', {
        tripId: booking.tripId,
      });
    }
    throw error;
  }
}
