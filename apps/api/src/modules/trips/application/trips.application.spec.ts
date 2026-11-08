import type { PublishTripInput } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { Trip } from '../domain/trip';
import { InMemoryTripRepository } from './testing/in-memory-trip.repository';
import { ListUpcomingTrips } from './use-cases/list-upcoming-trips';
import { PublishTrip } from './use-cases/publish-trip';

const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR);

function setup() {
  const trips = new InMemoryTripRepository();
  return {
    trips,
    publishTrip: new PublishTrip(trips),
    listUpcomingTrips: new ListUpcomingTrips(trips),
  };
}

const tripTo = (site: string, departureAt: Date): PublishTripInput => ({
  departurePlace: 'Pikine',
  site,
  departureAt: departureAt.toISOString(),
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '+221771234567',
});

/** Un trajet déjà parti ne peut pas être publié : on le place directement dans le dépôt. */
const departedTrip = () =>
  Trip.restore({
    id: '0199f5c2-0000-7000-8000-0000000000aa',
    departurePlace: 'Rufisque',
    site: 'diamniadio',
    departureAt: inHours(-2),
    seats: 2,
    pricePerSeat: 500,
    driverPhone: '+221770000000',
    managementCode: 'departed-code',
    createdAt: inHours(-24),
  });

describe('trips (application layer)', () => {
  it('001-AS1: publishes a trip with a management code', async () => {
    const { publishTrip, listUpcomingTrips } = setup();
    const departureAt = inHours(24);

    const published = await publishTrip.execute(tripTo('Diamniadio', departureAt));

    expect(published).toMatchObject({
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt,
      seats: 3,
      pricePerSeat: 1000,
    });
    expect(published.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(published.managementCode).toMatch(/^\S{8,}$/);
    expect(await listUpcomingTrips.execute('diamniadio')).toEqual([published]);
  });

  it('001-AS1: gives each trip its own management code', async () => {
    const { publishTrip } = setup();
    const first = await publishTrip.execute(tripTo('dakar', inHours(24)));
    const second = await publishTrip.execute(tripTo('dakar', inHours(24)));
    expect(first.managementCode).not.toBe(second.managementCode);
  });

  it('001-AS2: lists upcoming trips to a site sorted by departure', async () => {
    const { trips, publishTrip, listUpcomingTrips } = setup();
    const at10 = await publishTrip.execute(tripTo('diamniadio', inHours(26)));
    const at8 = await publishTrip.execute(tripTo('diamniadio', inHours(24)));
    await publishTrip.execute(tripTo('saly', inHours(24)));
    await trips.insert(departedTrip());

    expect(await listUpcomingTrips.execute(' Diamniadio ')).toEqual([at8, at10]);
  });

  it('001-AS3: rejects the list of an unknown site', async () => {
    const { listUpcomingTrips } = setup();
    await expect(listUpcomingTrips.execute('Thiès')).rejects.toMatchObject({
      code: 'SITE_UNKNOWN',
    });
  });

  it('001-AS4: publishes nothing when the departure is in the past', async () => {
    const { publishTrip, listUpcomingTrips } = setup();
    await expect(publishTrip.execute(tripTo('diamniadio', inHours(-24)))).rejects.toMatchObject({
      code: 'DEPARTURE_IN_PAST',
    });
    expect(await listUpcomingTrips.execute('diamniadio')).toEqual([]);
  });
});
