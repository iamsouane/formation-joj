import { randomUUID } from 'node:crypto';
import type { TripSite } from '@joj/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Booking } from '../domain/booking';
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

  it('002-AS2: lists trips with the phones of their booked passengers', async () => {
    const trip = tripTo('dakar', at('2026-11-09T08:00:00.000Z'));
    await repository.insert(trip);

    await repository.reserve(trip.id, (stored) =>
      Booking.create({
        id: randomUUID(),
        trip: stored,
        passengerName: 'Awa',
        passengerPhone: '77 123 45 67',
        bookingCode: randomUUID().slice(0, 12),
        now: NOW,
      }),
    );

    const [listed] = await repository.listUpcomingBySite('dakar', NOW);
    expect(listed?.passengerPhones).toEqual(['771234567']);
    expect(listed?.remainingSeats).toBe(2);
  });

  it('002-AS4: the database refuses a second booking with the same phone', async () => {
    const trip = tripTo('saly', at('2026-11-10T08:00:00.000Z'));
    await repository.insert(trip);
    /** Sans passer par `Booking.create()` : seule la contrainte d'unicité peut refuser. */
    const sameAwa = () =>
      Booking.restore({
        id: randomUUID(),
        tripId: trip.id,
        passengerName: 'Awa',
        passengerPhone: '771234567',
        bookingCode: randomUUID().slice(0, 12),
        createdAt: NOW,
      });

    await repository.reserve(trip.id, sameAwa);
    await expect(repository.reserve(trip.id, sameAwa)).rejects.toMatchObject({
      code: 'PASSENGER_ALREADY_BOOKED',
    });
  });

  it('002-AS6: reserves nothing on an unknown trip', async () => {
    const book = () => {
      throw new Error('book must not be called');
    };
    expect(await repository.reserve(randomUUID(), book)).toBeUndefined();
  });

  describe('cancellations', () => {
    const LATER = at('2026-11-08T10:00:00.000Z');

    async function bookAwa(site: TripSite, departureAt: Date, passengerPhone = '77 123 45 67') {
      const trip = tripTo(site, departureAt);
      await repository.insert(trip);
      const booking = await repository.reserve(trip.id, (stored) =>
        Booking.create({
          id: randomUUID(),
          trip: stored,
          passengerName: 'Awa',
          passengerPhone,
          bookingCode: randomUUID().slice(0, 12),
          now: NOW,
        }),
      );
      if (booking === undefined) throw new Error('the trip must exist');
      return { trip, booking };
    }

    it('003-AS1: finds a booking and its trip by booking code', async () => {
      const { trip, booking } = await bookAwa('dakar', at('2026-11-12T08:00:00.000Z'));

      const found = await repository.findBookingByCode(booking.bookingCode);

      expect(found?.booking).toEqual(booking);
      expect(found?.booking.cancelledAt).toBeUndefined();
      expect(found?.trip).toMatchObject({
        id: trip.id,
        departurePlace: 'Pikine',
        isCancelled: false,
      });
      expect(await repository.findBookingByCode('unknown-code')).toBeUndefined();
    });

    it('003-AS3: a cancelled booking no longer holds a seat, and the phone can book again', async () => {
      const { trip, booking } = await bookAwa('saly', at('2026-11-12T08:00:00.000Z'));

      await repository.saveBookingCancellation(booking.cancel(LATER));

      const found = await repository.findBookingByCode(booking.bookingCode);
      expect(found?.booking.cancelledAt).toEqual(LATER);
      expect((await repository.findTrip(trip.id))?.remainingSeats).toBe(3);
      const rebooked = await repository.reserve(trip.id, (stored) =>
        Booking.create({
          id: randomUUID(),
          trip: stored,
          passengerName: 'Awa',
          passengerPhone: '+221771234567',
          bookingCode: randomUUID().slice(0, 12),
          now: NOW,
        }),
      );
      expect(rebooked?.passengerPhone).toBe('771234567');
      expect((await repository.findTrip(trip.id))?.remainingSeats).toBe(2);
    });

    it('003-AS4: a cancelled trip is not listed, and is still found with its bookings', async () => {
      const { trip, booking } = await bookAwa('diamniadio', at('2026-11-12T09:00:00.000Z'));

      await repository.saveTripCancellation(trip.cancel(trip.managementCode, LATER));

      const listed = await repository.listUpcomingBySite('diamniadio', NOW);
      expect(listed.map((candidate) => candidate.id)).not.toContain(trip.id);
      expect((await repository.findTrip(trip.id))?.cancelledAt).toEqual(LATER);
      expect((await repository.findBookingByCode(booking.bookingCode))?.trip.isCancelled).toBe(
        true,
      );
      expect(await repository.findTrip(randomUUID())).toBeUndefined();
    });
  });
});
