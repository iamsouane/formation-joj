import { randomUUID } from 'node:crypto';
import type { TripSite } from '@joj/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Trip } from '../domain/trip';
import { DrizzleTripRepository } from './drizzle-trip.repository';

const NOW = new Date('2026-11-08T09:00:00.000Z');
const at = (iso: string) => new Date(iso);

/** Construit par `restore()` : un trajet déjà parti ne passerait pas `create()`. */
const tripTo = (site: TripSite, departureAt: Date) =>
  Trip.restore({
    id: randomUUID(),
    departurePlace: 'Pikine',
    site,
    departureAt,
    seats: 3,
    pricePerSeat: 1000,
    driverPhone: '+221771234567',
    managementCode: randomUUID().slice(0, 12),
    createdAt: at('2026-11-01T10:00:00.123Z'),
  });

describe('DrizzleTripRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleTripRepository;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleTripRepository(connection.db);
  });

  afterAll(() => connection?.close());

  it('001-AS2: lists only upcoming trips to the site, sorted by departure', async () => {
    const at10 = tripTo('diamniadio', at('2026-11-09T10:00:00.000Z'));
    const at8 = tripTo('diamniadio', at('2026-11-09T08:00:00.000Z'));
    const toSaly = tripTo('saly', at('2026-11-09T08:00:00.000Z'));
    const departed = tripTo('diamniadio', at('2026-11-08T07:00:00.000Z'));
    const departingNow = tripTo('diamniadio', NOW);
    for (const trip of [at10, at8, toSaly, departed, departingNow]) {
      await repository.insert(trip);
    }

    expect(await repository.listUpcomingBySite('diamniadio', NOW)).toEqual([at8, at10]);
  });
});
