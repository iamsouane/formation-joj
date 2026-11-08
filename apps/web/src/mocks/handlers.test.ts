/**
 * La fausse API tient le même contrat que apps/api : si elle s'en écarte, les tests du front
 * passent contre une API qui n'existe pas. Ces tests l'appellent avec `fetch`, sans React.
 */
import {
  bookingConfirmationSchema,
  bookingDetailsSchema,
  publishedTripSchema,
  tripListSchema,
} from '@joj/shared';
import { describe, expect, it } from 'vitest';
import {
  departedToDiamniadio,
  fixture,
  fullToDakar,
  guediawayeToDiamniadio,
  pikineToDiamniadio,
} from './fixture';

const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const call = (path: string, init: RequestInit = {}) =>
  fetch(`http://localhost${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });

const publish = (body: unknown) =>
  call('/api/trips', { method: 'POST', body: JSON.stringify(body) });

const newTrip = (change: Record<string, unknown> = {}) => ({
  departurePlace: 'Parcelles Assainies',
  site: 'Diamniadio',
  departureAt: inHours(30),
  seats: 2,
  pricePerSeat: 1500,
  driverPhone: '+221776543210',
  ...change,
});

const listIds = async (site: string) =>
  tripListSchema.parse(await (await call(`/api/trips?site=${site}`)).json()).map((trip) => trip.id);

describe('mock trips API', () => {
  it('001-AS2: lists upcoming trips to a site sorted by departure, without phone or code', async () => {
    const response = await call('/api/trips?site=diamniadio');
    expect(response.status).toBe(200);

    const body: unknown[] = await response.json();
    expect(tripListSchema.parse(body).map((trip) => trip.id)).toEqual([
      pikineToDiamniadio.id,
      guediawayeToDiamniadio.id,
    ]);
    expect(body).not.toContainEqual(expect.objectContaining({ id: departedToDiamniadio.id }));
    for (const trip of body) {
      expect(trip).not.toHaveProperty('driverPhone');
      expect(trip).not.toHaveProperty('managementCode');
    }
  });

  it('001-AS1: publishes a trip (201) with a management code, then lists it', async () => {
    const response = await publish(newTrip());
    expect(response.status).toBe(201);

    const body: unknown = await response.json();
    expect(body).not.toHaveProperty('driverPhone');
    const published = publishedTripSchema.parse(body);
    expect(published).toMatchObject({
      departurePlace: 'Parcelles Assainies',
      site: 'diamniadio',
      seats: 2,
      pricePerSeat: 1500,
      managementCode: expect.stringMatching(/^\S{8,}$/),
    });
    expect(await listIds('diamniadio')).toEqual([
      pikineToDiamniadio.id,
      guediawayeToDiamniadio.id,
      published.id,
    ]);
  });

  it('001-AS3: rejects an unknown site with a 400 SITE_UNKNOWN problem', async () => {
    const response = await publish(newTrip({ site: 'Thiès' }));
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({ code: 'SITE_UNKNOWN' });

    const list = await call('/api/trips?site=Thiès');
    expect(list.status).toBe(400);
    expect(await list.json()).toMatchObject({ code: 'SITE_UNKNOWN' });
  });

  it('001-AS4: rejects a departure in the past with a 400 DEPARTURE_IN_PAST problem', async () => {
    const response = await publish(newTrip({ departureAt: inHours(-24) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'DEPARTURE_IN_PAST' });
    expect(await listIds('diamniadio')).toEqual([pikineToDiamniadio.id, guediawayeToDiamniadio.id]);
  });

  it('001-AS1: rejects an incomplete trip with a 400 VALIDATION_FAILED problem', async () => {
    const response = await publish(newTrip({ seats: 0 }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'seats' })],
    });
  });
});

describe('mock bookings API', () => {
  const awa = { passengerName: 'Awa', passengerPhone: '77 123 45 67' };
  const book = (tripId: string, passenger: unknown = awa) =>
    call(`/api/trips/${tripId}/bookings`, { method: 'POST', body: JSON.stringify(passenger) });
  const remainingSeatsOf = async (tripId: string) => {
    const trips = tripListSchema.parse(await (await call('/api/trips?site=diamniadio')).json());
    return trips.find((trip) => trip.id === tripId)?.remainingSeats;
  };

  it('002-AS1: books a seat (201) and returns a booking code and the normalised driver phone', async () => {
    const response = await book(pikineToDiamniadio.id);
    expect(response.status).toBe(201);
    expect(bookingConfirmationSchema.parse(await response.json())).toEqual({
      bookingCode: expect.stringMatching(/^\S{8,}$/),
      driverPhone: '771234567',
    });

    const published = publishedTripSchema.parse(await (await publish(newTrip())).json());
    const second = bookingConfirmationSchema.parse(await (await book(published.id)).json());
    expect(second.driverPhone).toBe('776543210');
  });

  it('002-AS2: lists the trip with 2 remaining seats after one booking', async () => {
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(3);
    await book(pikineToDiamniadio.id);
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(2);
  });

  it('002-AS3: rejects a full trip with a 409 TRIP_FULL problem', async () => {
    const response = await book(fullToDakar.id);
    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({ code: 'TRIP_FULL' });
  });

  it('002-AS4: rejects a second booking from the same phone with a 409 PASSENGER_ALREADY_BOOKED problem', async () => {
    await book(pikineToDiamniadio.id, { passengerName: 'Awa', passengerPhone: '77 123 45 67' });
    const response = await book(pikineToDiamniadio.id, {
      passengerName: 'Awa Ndiaye',
      passengerPhone: '+221771234567',
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'PASSENGER_ALREADY_BOOKED' });
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(2);
  });

  it('002-AS5: rejects a departed trip with a 409 TRIP_DEPARTED problem', async () => {
    const response = await book(departedToDiamniadio.id);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'TRIP_DEPARTED' });
  });

  it.each(['+221', '----', 'abc'])(
    '002-AS1: rejects a malformed phone %j with a 400 VALIDATION_FAILED problem',
    async (passengerPhone) => {
      const response = await book(pikineToDiamniadio.id, { passengerName: 'Awa', passengerPhone });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(3);
    },
  );

  it('002-AS6: rejects an unknown trip with a 404 TRIP_NOT_FOUND problem', async () => {
    const response = await book('0199f5c2-0000-7000-8000-0000000000ff');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'TRIP_NOT_FOUND' });

    const malformed = await book('not-a-uuid');
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('mock cancellations API', () => {
  const awa = { passengerName: 'Awa', passengerPhone: '77 123 45 67' };
  const bookAwa = async (tripId: string) =>
    bookingConfirmationSchema.parse(
      await (
        await call(`/api/trips/${tripId}/bookings`, { method: 'POST', body: JSON.stringify(awa) })
      ).json(),
    ).bookingCode;
  const getBooking = (bookingCode: string) => call(`/api/bookings/${bookingCode}`);
  const cancelBooking = (bookingCode: string) =>
    call(`/api/bookings/${bookingCode}/cancellation`, { method: 'POST' });
  const cancelTrip = (tripId: string, managementCode: string) =>
    call(`/api/trips/${tripId}/cancellation`, {
      method: 'POST',
      body: JSON.stringify({ managementCode }),
    });
  const statusOf = async (bookingCode: string) =>
    bookingDetailsSchema.parse(await (await getBooking(bookingCode)).json()).status;
  const remainingSeatsOf = async (tripId: string) => {
    const trips = tripListSchema.parse(await (await call('/api/trips?site=diamniadio')).json());
    return trips.find((trip) => trip.id === tripId)?.remainingSeats;
  };

  it('003-AS1: shows a booking with its trip and the active status', async () => {
    const bookingCode = await bookAwa(pikineToDiamniadio.id);

    const response = await getBooking(bookingCode);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingCode,
      passengerName: 'Awa',
      status: 'active',
      trip: {
        id: pikineToDiamniadio.id,
        departurePlace: 'Pikine',
        site: 'diamniadio',
        departureAt: pikineToDiamniadio.departureAt,
        pricePerSeat: 1000,
        driverPhone: '771234567',
      },
    });
  });

  it('003-AS2: rejects an unknown booking code with a 404 BOOKING_NOT_FOUND problem', async () => {
    const shown = await getBooking('unknown-code');
    const cancelled = await cancelBooking('unknown-code');

    expect(shown.status).toBe(404);
    expect(shown.headers.get('content-type')).toContain('application/problem+json');
    expect(await shown.json()).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
    expect(cancelled.status).toBe(404);
    expect(await cancelled.json()).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  it('003-AS3: cancelling a booking (204) frees its seat and marks it cancelled', async () => {
    const bookingCode = await bookAwa(pikineToDiamniadio.id);
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(2);

    const response = await cancelBooking(bookingCode);

    expect(response.status).toBe(204);
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(3);
    expect(await statusOf(bookingCode)).toBe('cancelled');
    expect((await cancelBooking(bookingCode)).status).toBe(204);
    expect(await remainingSeatsOf(pikineToDiamniadio.id)).toBe(3);
  });

  it('003-AS4: cancelling a trip (204) removes it from the list of departures', async () => {
    const response = await cancelTrip(pikineToDiamniadio.id, pikineToDiamniadio.managementCode);

    expect(response.status).toBe(204);
    expect(await listIds('diamniadio')).toEqual([guediawayeToDiamniadio.id]);
  });

  it('003-AS5: a passenger of a cancelled trip sees trip_cancelled with the trip', async () => {
    const bookingCode = await bookAwa(pikineToDiamniadio.id);

    await cancelTrip(pikineToDiamniadio.id, pikineToDiamniadio.managementCode);

    const details = bookingDetailsSchema.parse(await (await getBooking(bookingCode)).json());
    expect(details.status).toBe('trip_cancelled');
    expect(details.trip.id).toBe(pikineToDiamniadio.id);
  });

  it('003-AS6: rejects another management code with a 403 MANAGEMENT_CODE_INVALID problem', async () => {
    const response = await cancelTrip(pikineToDiamniadio.id, 'other-code');

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: 'MANAGEMENT_CODE_INVALID',
      title: 'Forbidden',
    });
    expect(await listIds('diamniadio')).toContain(pikineToDiamniadio.id);

    const unknown = await cancelTrip('0199f5c2-0000-7000-8000-0000000000ff', 'abc');
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ code: 'TRIP_NOT_FOUND' });
  });

  it('003-AS7: rejects a booking on a cancelled trip with a 409 TRIP_CANCELLED problem', async () => {
    await cancelTrip(pikineToDiamniadio.id, pikineToDiamniadio.managementCode);

    const response = await call(`/api/trips/${pikineToDiamniadio.id}/bookings`, {
      method: 'POST',
      body: JSON.stringify(awa),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'TRIP_CANCELLED' });
    expect(fixture.bookings.filter((b) => b.tripId === pikineToDiamniadio.id)).toEqual([]);
  });
});
