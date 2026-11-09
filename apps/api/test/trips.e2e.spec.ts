import type { INestApplication } from '@nestjs/common';
import {
  bookingConfirmationSchema,
  bookingDetailsSchema,
  publishedTripSchema,
  TRIP_SITES,
  type TripDraft,
  tripDetailsSchema,
  tripListSchema,
} from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeTripMessageReader } from '../src/modules/trips/application/testing/fake-trip-message-reader';
import { TripMessageReader } from '../src/modules/trips/application/trip-message.reader';
import { TripRepository } from '../src/modules/trips/application/trip.repository';
import { Trip } from '../src/modules/trips/domain/trip';
import { createTestApp } from './create-test-app';

const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const pikineToDiamniadio = (departureAt = inHours(24)) => ({
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt,
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '+221771234567',
});

describe('/api/trips (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const listDiamniadio = async () =>
    tripListSchema.parse((await api().get('/api/trips?site=diamniadio').expect(200)).body);

  // Une base neuve par test : chaque liste ne voit que les trajets de son test.
  beforeEach(async () => {
    await app?.close();
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  it('001-AS1: publishes a trip (201) and returns it with a management code', async () => {
    const departureAt = inHours(24);
    const response = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(departureAt))
      .expect(201);

    expect(response.body).not.toHaveProperty('driverPhone');
    expect(publishedTripSchema.parse(response.body)).toMatchObject({
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt,
      seats: 3,
      pricePerSeat: 1000,
      managementCode: expect.stringMatching(/^\S{8,}$/),
    });
  });

  it('001-AS2: lists upcoming trips to a site sorted by departure, without phone or code', async () => {
    const at10 = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(26)))
      .expect(201);
    const at8 = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(24)))
      .expect(201);
    await api()
      .post('/api/trips')
      .send({ ...pikineToDiamniadio(), site: 'saly' })
      .expect(201);
    // Un trajet déjà parti ne peut pas être publié : on le place directement dans le dépôt.
    await app.get(TripRepository).insert(
      Trip.restore({
        id: '0199f5c2-0000-7000-8000-0000000000aa',
        departurePlace: 'Rufisque',
        site: 'diamniadio',
        departureAt: new Date(inHours(-2)),
        seats: 2,
        pricePerSeat: 500,
        driverPhone: '+221770000000',
        managementCode: 'departed-code',
        createdAt: new Date(inHours(-24)),
      }),
    );

    const response = await api().get('/api/trips?site=Diamniadio').expect(200);

    expect(response.body.map((trip: { id: string }) => trip.id)).toEqual([
      at8.body.id,
      at10.body.id,
    ]);
    for (const trip of response.body) {
      expect(trip).not.toHaveProperty('driverPhone');
      expect(trip).not.toHaveProperty('managementCode');
    }
  });

  it('001-AS3: rejects an unknown site (400 SITE_UNKNOWN) and creates nothing', async () => {
    const response = await api()
      .post('/api/trips')
      .send({ ...pikineToDiamniadio(), site: 'Thiès' })
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ code: 'SITE_UNKNOWN' });
    // Preuve directe : le dépôt ne contient aucun trajet, quel que soit le site ou l'heure.
    const trips = app.get(TripRepository);
    const stored = await Promise.all(
      TRIP_SITES.map((site) => trips.listUpcomingBySite(site, new Date(0))),
    );
    expect(stored.flat()).toEqual([]);
  });

  it('001-AS3: rejects the list of an unknown site (400 SITE_UNKNOWN)', async () => {
    const response = await api().get('/api/trips?site=Thiès').expect(400);
    expect(response.body).toMatchObject({ code: 'SITE_UNKNOWN' });
  });

  it('001-AS4: rejects a departure in the past (400 DEPARTURE_IN_PAST) and creates nothing', async () => {
    const response = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(-24)))
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ code: 'DEPARTURE_IN_PAST' });
    expect(await listDiamniadio()).toEqual([]);
  });

  describe('bookings', () => {
    const awa = { passengerName: 'Awa', passengerPhone: '77 123 45 67' };
    const publish = async (seats = 3) =>
      publishedTripSchema.parse(
        (
          await api()
            .post('/api/trips')
            .send({ ...pikineToDiamniadio(), seats })
            .expect(201)
        ).body,
      );
    const book = (tripId: string, passenger = awa) =>
      api().post(`/api/trips/${tripId}/bookings`).send(passenger);
    const remainingSeats = async () => (await listDiamniadio()).map((trip) => trip.remainingSeats);

    it('002-AS1: books a seat (201) and returns a booking code and the normalised driver phone', async () => {
      const trip = await publish();

      const response = await book(trip.id).expect(201);

      expect(bookingConfirmationSchema.parse(response.body)).toEqual({
        bookingCode: expect.stringMatching(/^\S{8,}$/),
        driverPhone: '771234567',
      });
    });

    it('002-AS2: lists the trip with 2 remaining seats after one booking, without the driver phone', async () => {
      const trip = await publish(3);
      await book(trip.id).expect(201);

      const response = await api().get('/api/trips?site=diamniadio').expect(200);

      expect(response.body).toEqual([expect.objectContaining({ id: trip.id, remainingSeats: 2 })]);
      expect(response.body[0]).not.toHaveProperty('driverPhone');
    });

    it('002-AS3: rejects a full trip (409 TRIP_FULL) and books nothing', async () => {
      const trip = await publish(1);
      await book(trip.id).expect(201);

      const response = await book(trip.id, {
        passengerName: 'Moussa',
        passengerPhone: '78 000 00 00',
      }).expect(409);

      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({ code: 'TRIP_FULL' });
      expect(await remainingSeats()).toEqual([0]);
    });

    it('002-AS4: rejects a second booking from the same phone (409 PASSENGER_ALREADY_BOOKED)', async () => {
      const trip = await publish(3);
      await book(trip.id, { passengerName: 'Awa', passengerPhone: '77 123 45 67' }).expect(201);

      const response = await book(trip.id, {
        passengerName: 'Awa Ndiaye',
        passengerPhone: '+221771234567',
      }).expect(409);

      expect(response.body).toMatchObject({ code: 'PASSENGER_ALREADY_BOOKED' });
      expect(await remainingSeats()).toEqual([2]);
    });

    it('002-AS5: rejects a departed trip (409 TRIP_DEPARTED)', async () => {
      const departedId = '0199f5c2-0000-7000-8000-0000000000ab';
      // Un trajet déjà parti ne peut pas être publié : on le place directement dans le dépôt.
      await app.get(TripRepository).insert(
        Trip.restore({
          id: departedId,
          departurePlace: 'Rufisque',
          site: 'diamniadio',
          departureAt: new Date(inHours(-2)),
          seats: 2,
          pricePerSeat: 500,
          driverPhone: '770000000',
          managementCode: 'departed-code',
          createdAt: new Date(inHours(-24)),
        }),
      );

      const response = await book(departedId).expect(409);

      expect(response.body).toMatchObject({ code: 'TRIP_DEPARTED' });
    });

    it.each(['+221', '----', 'abc'])(
      '002-AS1: rejects a malformed phone %j (400 VALIDATION_FAILED) and books nothing',
      async (passengerPhone) => {
        const trip = await publish(3);

        const response = await book(trip.id, { passengerName: 'Awa', passengerPhone }).expect(400);

        expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
        expect(await remainingSeats()).toEqual([3]);
      },
    );

    it('002-AS6: rejects an unknown trip (404 TRIP_NOT_FOUND)', async () => {
      const response = await book('0199f5c2-0000-7000-8000-0000000000ff').expect(404);
      expect(response.body).toMatchObject({ code: 'TRIP_NOT_FOUND' });
    });
  });

  describe('cancellations', () => {
    const awa = { passengerName: 'Awa', passengerPhone: '77 123 45 67' };
    const publish = async () =>
      publishedTripSchema.parse(
        (await api().post('/api/trips').send(pikineToDiamniadio()).expect(201)).body,
      );
    const bookAwa = async (tripId: string) =>
      bookingConfirmationSchema.parse(
        (await api().post(`/api/trips/${tripId}/bookings`).send(awa).expect(201)).body,
      ).bookingCode;
    const getBooking = (bookingCode: string) => api().get(`/api/bookings/${bookingCode}`);
    const cancelBooking = (bookingCode: string) =>
      api().post(`/api/bookings/${bookingCode}/cancellation`);
    const cancelTrip = (tripId: string, managementCode: string) =>
      api().post(`/api/trips/${tripId}/cancellation`).send({ managementCode });
    const statusOf = async (bookingCode: string) =>
      bookingDetailsSchema.parse((await getBooking(bookingCode).expect(200)).body).status;

    it('003-AS1: shows a booking with its trip and the active status', async () => {
      const trip = await publish();
      const bookingCode = await bookAwa(trip.id);

      const response = await getBooking(bookingCode).expect(200);

      expect(response.body).toEqual({
        bookingCode,
        passengerName: 'Awa',
        status: 'active',
        trip: {
          id: trip.id,
          departurePlace: 'Pikine',
          site: 'diamniadio',
          departureAt: trip.departureAt,
          pricePerSeat: 1000,
          driverPhone: '771234567',
        },
      });
    });

    it('003-AS2: rejects an unknown booking code, to show or to cancel it (404 BOOKING_NOT_FOUND)', async () => {
      const shown = await getBooking('unknown-code').expect(404);
      const cancelled = await cancelBooking('unknown-code').expect(404);

      expect(shown.headers['content-type']).toContain('application/problem+json');
      expect(shown.body).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
      expect(cancelled.body).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
    });

    it('003-AS3: cancelling a booking (204) frees its seat and marks it cancelled', async () => {
      const trip = await publish();
      const bookingCode = await bookAwa(trip.id);
      expect((await listDiamniadio()).map((listed) => listed.remainingSeats)).toEqual([2]);

      const response = await cancelBooking(bookingCode).expect(204);

      expect(response.body).toEqual({});
      expect((await listDiamniadio()).map((listed) => listed.remainingSeats)).toEqual([3]);
      expect(await statusOf(bookingCode)).toBe('cancelled');
    });

    it('003-AS4: cancelling a trip (204) removes it from the list of departures', async () => {
      const trip = await publish();

      await cancelTrip(trip.id, trip.managementCode).expect(204);

      expect(await listDiamniadio()).toEqual([]);
    });

    it('003-AS5: a passenger of a cancelled trip sees trip_cancelled with the trip', async () => {
      const trip = await publish();
      const bookingCode = await bookAwa(trip.id);

      await cancelTrip(trip.id, trip.managementCode).expect(204);

      const details = bookingDetailsSchema.parse((await getBooking(bookingCode).expect(200)).body);
      expect(details.status).toBe('trip_cancelled');
      expect(details.trip).toMatchObject({ id: trip.id, departurePlace: 'Pikine' });
    });

    it('003-AS6: rejects another management code (403 MANAGEMENT_CODE_INVALID) and keeps the trip listed', async () => {
      const trip = await publish();

      const response = await cancelTrip(trip.id, 'other-code').expect(403);

      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({ code: 'MANAGEMENT_CODE_INVALID', status: 403 });
      expect((await listDiamniadio()).map((listed) => listed.id)).toEqual([trip.id]);
    });

    it('003-AS6: rejects the cancellation of an unknown trip (404 TRIP_NOT_FOUND)', async () => {
      const response = await cancelTrip('0199f5c2-0000-7000-8000-0000000000ff', 'abc').expect(404);
      expect(response.body).toMatchObject({ code: 'TRIP_NOT_FOUND' });
    });

    it('007-AS5: shows a trip (200) with its remaining seats and whether it is cancelled', async () => {
      const trip = await publish();
      await bookAwa(trip.id);

      const response = await api().get(`/api/trips/${trip.id}`).expect(200);

      expect(response.body).toEqual({
        id: trip.id,
        departurePlace: 'Pikine',
        site: 'diamniadio',
        departureAt: trip.departureAt,
        seats: 3,
        remainingSeats: 2,
        pricePerSeat: 1000,
        cancelled: false,
      });

      await cancelTrip(trip.id, trip.managementCode).expect(204);

      const cancelled = await api().get(`/api/trips/${trip.id}`).expect(200);
      expect(tripDetailsSchema.parse(cancelled.body).cancelled).toBe(true);
    });

    it('007-AS5: never exposes the driver phone or the management code of a trip', async () => {
      const trip = await publish();
      expect(trip.managementCode).toMatch(/^\S{8,}$/);

      const response = await api().get(`/api/trips/${trip.id}`).expect(200);

      expect(response.body).not.toHaveProperty('driverPhone');
      expect(response.body).not.toHaveProperty('managementCode');
      expect(response.text).not.toContain('771234567');
      expect(response.text).not.toContain(trip.managementCode);
    });

    it('007-AS7: rejects the reading of an unknown trip (404 TRIP_NOT_FOUND)', async () => {
      const response = await api()
        .get('/api/trips/0199f5c2-0000-7000-8000-0000000000ff')
        .expect(404);

      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({ code: 'TRIP_NOT_FOUND', status: 404 });
    });

    it('003-AS7: rejects a booking on a cancelled trip (409 TRIP_CANCELLED) and books nothing', async () => {
      const trip = await publish();
      const bookingCode = await bookAwa(trip.id);
      await cancelTrip(trip.id, trip.managementCode).expect(204);

      const response = await api()
        .post(`/api/trips/${trip.id}/bookings`)
        .send({ passengerName: 'Moussa', passengerPhone: '78 000 00 00' })
        .expect(409);

      expect(response.body).toMatchObject({ code: 'TRIP_CANCELLED' });
      expect(await statusOf(bookingCode)).toBe('trip_cancelled');
      const trips = app.get(TripRepository);
      expect((await trips.findTrip(trip.id))?.remainingSeats).toBe(2);
    });
  });

  describe('from a message', () => {
    const message = 'je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F';
    const driverPhone = '+221771234567';

    /** « AAAA-MM-JJT08:00 » à Dakar (UTC+0), `days` jours après aujourd'hui. */
    const dakarAt8 = (days: number) =>
      `${new Date(Date.now() + days * 24 * HOUR).toISOString().slice(0, 10)}T08:00`;

    const understood = (draft: Partial<TripDraft> = {}): TripDraft => ({
      departurePlace: 'Pikine',
      site: 'Diamniadio',
      departureAt: dakarAt8(1),
      seats: 3,
      pricePerSeat: 1000,
      ...draft,
    });

    /** Le faux assistant que `createTestApp` met à la place de Claude. */
    function assistant(): FakeTripMessageReader {
      const reader = app.get(TripMessageReader);
      if (!(reader instanceof FakeTripMessageReader)) {
        throw new Error('The e2e tests must never call the real assistant');
      }
      return reader;
    }

    const publishFromMessage = (body: object) => api().post('/api/trips/from-message').send(body);

    async function storedTrips(): Promise<Trip[]> {
      const trips = app.get(TripRepository);
      const bySite = await Promise.all(
        TRIP_SITES.map((site) => trips.listUpcomingBySite(site, new Date(0))),
      );
      return bySite.flat();
    }

    it('004-AS1: publishes the understood trip (201) with a management code', async () => {
      assistant().willRead(understood());

      const response = await publishFromMessage({ message, driverPhone }).expect(201);

      expect(response.body).not.toHaveProperty('driverPhone');
      const published = publishedTripSchema.parse(response.body);
      expect(published).toMatchObject({
        departurePlace: 'Pikine',
        site: 'diamniadio',
        departureAt: `${dakarAt8(1)}:00.000Z`,
        seats: 3,
        remainingSeats: 3,
        pricePerSeat: 1000,
      });
      expect(published.managementCode).not.toBe('');
      expect((await listDiamniadio()).map((trip) => trip.id)).toEqual([published.id]);
    });

    it('004-AS2: rejects an unknown site (400 SITE_UNKNOWN) and creates no trip', async () => {
      assistant().willRead(understood({ site: 'Thiès' }));

      const response = await publishFromMessage({ message, driverPhone }).expect(400);

      expect(response.body).toMatchObject({ code: 'SITE_UNKNOWN' });
      expect(await storedTrips()).toEqual([]);
    });

    it('004-AS3: rejects a departure in the past (400 DEPARTURE_IN_PAST) and creates no trip', async () => {
      assistant().willRead(understood({ departureAt: dakarAt8(-1) }));

      const response = await publishFromMessage({ message, driverPhone }).expect(400);

      expect(response.body).toMatchObject({ code: 'DEPARTURE_IN_PAST' });
      expect(await storedTrips()).toEqual([]);
    });

    it('004-AS4: rejects an empty message (400 MESSAGE_EMPTY) without calling the assistant', async () => {
      assistant().willRead(understood());

      const response = await publishFromMessage({ message: '  ', driverPhone }).expect(400);

      expect(response.body).toMatchObject({ code: 'MESSAGE_EMPTY' });
      expect(assistant().received).toEqual([]);
      expect(await storedTrips()).toEqual([]);
    });

    it('004-AS5: rejects a message lacking information (422 MESSAGE_UNREADABLE) with the missing fields', async () => {
      assistant().willRead({
        departurePlace: null,
        site: 'Diamniadio',
        departureAt: null,
        seats: null,
        pricePerSeat: null,
      });

      const response = await publishFromMessage({
        message: 'je vais à Diamniadio, qui vient ?',
        driverPhone,
      }).expect(422);

      expect(response.body).toMatchObject({
        code: 'MESSAGE_UNREADABLE',
        details: { missingFields: ['departurePlace', 'departureAt', 'seats', 'pricePerSeat'] },
      });
      expect(await storedTrips()).toEqual([]);
    });

    it('answers 503 ASSISTANT_UNAVAILABLE and publishes nothing when the assistant is down', async () => {
      assistant().willFail();

      const response = await publishFromMessage({ message, driverPhone }).expect(503);

      expect(response.body).toMatchObject({ code: 'ASSISTANT_UNAVAILABLE' });
      expect(await storedTrips()).toEqual([]);
    });

    it('rejects a trip with no seat as an invalid input (400 VALIDATION_FAILED)', async () => {
      assistant().willRead(understood({ seats: 0 }));

      const response = await publishFromMessage({ message, driverPhone }).expect(400);

      // Même forme qu'un corps invalide : les erreurs au premier niveau, dans `errors`.
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'seats', message: expect.any(String) }],
      });
      expect(response.body).not.toHaveProperty('details');
      expect(await storedTrips()).toEqual([]);
    });

    it('answers 503 ASSISTANT_UNAVAILABLE for an impossible departure date', async () => {
      assistant().willRead(understood({ departureAt: '2026-11-09T25:00' }));

      const response = await publishFromMessage({ message, driverPhone }).expect(503);

      expect(response.body).toMatchObject({ code: 'ASSISTANT_UNAVAILABLE' });
      expect(await storedTrips()).toEqual([]);
    });
  });
});
