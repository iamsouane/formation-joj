import type { PublishTripInput } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { Trip } from '../domain/trip';
import { InMemoryTripRepository } from './testing/in-memory-trip.repository';
import { BookSeat } from './use-cases/book-seat';
import { CancelBooking } from './use-cases/cancel-booking';
import { CancelTrip } from './use-cases/cancel-trip';
import { GetBooking } from './use-cases/get-booking';
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
    bookSeat: new BookSeat(trips),
    getBooking: new GetBooking(trips),
    cancelBooking: new CancelBooking(trips),
    cancelTrip: new CancelTrip(trips),
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

const awa = { passengerName: 'Awa', passengerPhone: '77 123 45 67' };

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

  it('002-AS1: books a seat and returns the booking code and the driver phone', async () => {
    const { publishTrip, bookSeat } = setup();
    const trip = await publishTrip.execute(tripTo('diamniadio', inHours(24)));

    const { booking, driverPhone } = await bookSeat.execute(trip.id, awa);

    expect(driverPhone).toBe('771234567');
    expect(booking).toMatchObject({ tripId: trip.id, passengerName: 'Awa' });
    expect(booking.bookingCode).toMatch(/^\S{8,}$/);
    await expect(bookSeat.execute(trip.id, awa)).rejects.toMatchObject({
      code: 'PASSENGER_ALREADY_BOOKED',
    });
  });

  it('002-AS2: lists remaining seats once a seat is booked', async () => {
    const { publishTrip, bookSeat, listUpcomingTrips } = setup();
    const trip = await publishTrip.execute(tripTo('diamniadio', inHours(24)));
    await bookSeat.execute(trip.id, awa);

    const [listed] = await listUpcomingTrips.execute('diamniadio');
    expect(listed?.remainingSeats).toBe(2);
  });

  it('002-AS6: rejects a booking on an unknown trip', async () => {
    const { bookSeat } = setup();
    await expect(
      bookSeat.execute('0199f5c2-0000-7000-8000-0000000000ff', awa),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND', kind: 'NOT_FOUND' });
  });

  describe('cancellations', () => {
    const UNKNOWN_CODE = 'unknown-code';

    async function bookedTrip() {
      const app = setup();
      const trip = await app.publishTrip.execute(tripTo('diamniadio', inHours(24)));
      const { booking } = await app.bookSeat.execute(trip.id, awa);
      return { ...app, trip, booking };
    }

    it('003-AS1: gets a booking with its trip and the active status', async () => {
      const { getBooking, trip, booking } = await bookedTrip();

      const details = await getBooking.execute(booking.bookingCode);

      expect(details.status).toBe('active');
      expect(details.booking).toMatchObject({
        bookingCode: booking.bookingCode,
        passengerName: 'Awa',
      });
      expect(details.trip).toMatchObject({
        id: trip.id,
        departurePlace: 'Pikine',
        site: 'diamniadio',
        departureAt: trip.departureAt,
        driverPhone: '771234567',
      });
    });

    it('003-AS2: rejects an unknown booking code, to get or to cancel it', async () => {
      const { getBooking, cancelBooking } = await bookedTrip();
      const notFound = { code: 'BOOKING_NOT_FOUND', kind: 'NOT_FOUND' };
      await expect(getBooking.execute(UNKNOWN_CODE)).rejects.toMatchObject(notFound);
      await expect(cancelBooking.execute(UNKNOWN_CODE)).rejects.toMatchObject(notFound);
    });

    it('003-AS3: cancelling a booking frees its seat and marks it cancelled', async () => {
      const { cancelBooking, getBooking, listUpcomingTrips, booking } = await bookedTrip();

      await cancelBooking.execute(booking.bookingCode);

      const [listed] = await listUpcomingTrips.execute('diamniadio');
      expect(listed?.remainingSeats).toBe(3);
      expect((await getBooking.execute(booking.bookingCode)).status).toBe('cancelled');
    });

    it('003-AS3: cancelling a booking twice frees only one seat', async () => {
      const { cancelBooking, bookSeat, listUpcomingTrips, trip, booking } = await bookedTrip();
      await bookSeat.execute(trip.id, { passengerName: 'Moussa', passengerPhone: '776665544' });

      await cancelBooking.execute(booking.bookingCode);
      await cancelBooking.execute(booking.bookingCode);

      const [listed] = await listUpcomingTrips.execute('diamniadio');
      expect(listed?.remainingSeats).toBe(2);
    });

    it('003-AS4: a cancelled trip is no longer listed and its passengers see trip_cancelled', async () => {
      const { cancelTrip, getBooking, listUpcomingTrips, trip, booking } = await bookedTrip();

      await cancelTrip.execute(trip.id, { managementCode: trip.managementCode });

      expect(await listUpcomingTrips.execute('diamniadio')).toEqual([]);
      expect((await getBooking.execute(booking.bookingCode)).status).toBe('trip_cancelled');
    });

    it('003-AS6: rejects another management code and leaves the trip listed', async () => {
      const { cancelTrip, listUpcomingTrips, trip } = await bookedTrip();

      await expect(
        cancelTrip.execute(trip.id, { managementCode: 'other-code' }),
      ).rejects.toMatchObject({ code: 'MANAGEMENT_CODE_INVALID', kind: 'FORBIDDEN' });

      expect(await listUpcomingTrips.execute('diamniadio')).toHaveLength(1);
    });

    it('003-AS6: rejects the cancellation of an unknown trip', async () => {
      const { cancelTrip } = setup();
      await expect(
        cancelTrip.execute('0199f5c2-0000-7000-8000-0000000000ff', { managementCode: 'abc' }),
      ).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND', kind: 'NOT_FOUND' });
    });
  });
});
