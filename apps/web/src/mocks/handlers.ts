import {
  bookingCodeParamSchema,
  type BookingConfirmationResponse,
  type BookingDetailsResponse,
  type BookingStatus,
  bookSeatSchema,
  cancelTripSchema,
  type ProblemDetails,
  type PublishedTripResponse,
  publishTripSchema,
  TRIP_SITES,
  type TripResponse,
  tripIdParamSchema,
  type TripSite,
  upcomingTripsQuerySchema,
} from '@joj/shared';
import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import type { z } from 'zod';
import { mockControl } from './control';
import { fixture, type StoredBooking, type StoredTrip } from './fixture';

/**
 * La fausse API des tests du front : le même contrat que apps/api (mêmes schémas zod, mêmes
 * codes d'erreur, même format RFC 9457), sur les données de `fixture.ts`. Une nouvelle route
 * de l'API s'ajoute ici (un `http.get`, `http.post`… par route), avec son test dans `handlers.test.ts`.
 */

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

export function problem(
  status: number,
  code: string,
  detail: string,
  extra: Pick<ProblemDetails, 'errors' | 'details'> = {},
) {
  return HttpResponse.json(
    {
      type: `urn:problem-type:${code.toLowerCase().replaceAll('_', '-')}`,
      title: TITLES[status] ?? 'Error',
      status,
      code,
      detail,
      ...extra,
    } satisfies ProblemDetails,
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

/** Latence, puis panne armée par `mockControl` : renvoie la réponse d'erreur, ou `null`. */
export async function gate(method: string, path: string): Promise<Response | null> {
  if (mockControl.latency > 0) await delay(mockControl.latency);
  const status = mockControl.takeFailure(`${method} ${path}`);
  return status === null ? null : problem(status, 'INTERNAL_ERROR', 'Mocked failure.');
}

export function validationFailed(error: z.ZodError) {
  return problem(400, 'VALIDATION_FAILED', 'The request is invalid.', {
    errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

/** Comme le domaine de l'API : espaces retirés, minuscules, puis la liste fermée des sites. */
function parseSite(site: string): TripSite | null {
  const normalised = site.trim().toLowerCase();
  return TRIP_SITES.find((candidate) => candidate === normalised) ?? null;
}

const siteUnknown = (site: string) =>
  problem(400, 'SITE_UNKNOWN', `Unknown site ${site}`, {
    details: { site, allowed: TRIP_SITES },
  });

/** Comme le domaine de l'API : sans espaces ni tirets, sans préfixe +221 ou 00221. */
function normalisePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(/^(\+221|00221)/, '');
}

/** Comme l'API : une réservation annulée ne tient plus de place. */
const passengerPhonesOf = (tripId: string) =>
  fixture.bookings
    .filter((booking) => booking.tripId === tripId && booking.cancelledAt === undefined)
    .map((b) => b.passengerPhone);

const tripNotFound = (tripId: string) =>
  problem(404, 'TRIP_NOT_FOUND', `No trip ${tripId}`, { details: { tripId } });

const bookingNotFound = () => problem(404, 'BOOKING_NOT_FOUND', 'No booking with this code');

/** Comme le domaine de l'API : l'annulation du supporter l'emporte sur celle du trajet. */
function statusOf(booking: StoredBooking, trip: StoredTrip): BookingStatus {
  if (booking.cancelledAt !== undefined) return 'cancelled';
  return trip.cancelledAt === undefined ? 'active' : 'trip_cancelled';
}

/** La réservation désignée par le code du chemin, avec son trajet ; sinon la réponse d'erreur. */
function findBooking(
  params: Record<string, unknown>,
): { booking: StoredBooking; trip: StoredTrip } | Response {
  const param = bookingCodeParamSchema.safeParse(params);
  if (!param.success) return validationFailed(param.error);
  const booking = fixture.bookings.find((b) => b.bookingCode === param.data.bookingCode);
  const trip = booking && fixture.trips.find((candidate) => candidate.id === booking.tripId);
  if (booking === undefined || trip === undefined) return bookingNotFound();
  return { booking, trip };
}

/** Ce que la liste montre d'un trajet : ni le téléphone du conducteur, ni le code de gestion. */
function toPublic({
  driverPhone: _phone,
  managementCode: _code,
  cancelledAt: _cancelledAt,
  ...trip
}: StoredTrip): TripResponse {
  return { ...trip, remainingSeats: trip.seats - passengerPhonesOf(trip.id).length };
}

const byDeparture = (a: StoredTrip, b: StoredTrip) =>
  Date.parse(a.departureAt) - Date.parse(b.departureAt);

export const handlers: RequestHandler[] = [
  http.get('*/api/trips', async ({ request }) => {
    const failure = await gate('GET', '/api/trips');
    if (failure) return failure;
    const query = upcomingTripsQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) return validationFailed(query.error);
    const site = parseSite(query.data.site);
    if (site === null) return siteUnknown(query.data.site);

    const now = Date.now();
    const upcoming = fixture.trips
      .filter((trip) => trip.cancelledAt === undefined)
      .filter((trip) => trip.site === site && Date.parse(trip.departureAt) > now)
      .sort(byDeparture)
      .map(toPublic);
    return HttpResponse.json(upcoming);
  }),

  http.post('*/api/trips', async ({ request }) => {
    const failure = await gate('POST', '/api/trips');
    if (failure) return failure;
    const input = publishTripSchema.safeParse(await request.json());
    if (!input.success) return validationFailed(input.error);
    const site = parseSite(input.data.site);
    if (site === null) return siteUnknown(input.data.site);
    const departureAt = new Date(input.data.departureAt);
    if (departureAt.getTime() <= Date.now()) {
      return problem(400, 'DEPARTURE_IN_PAST', 'A trip cannot depart in the past', {
        details: { departureAt: departureAt.toISOString() },
      });
    }

    const trip: StoredTrip = {
      ...input.data,
      id: crypto.randomUUID(),
      site,
      driverPhone: normalisePhone(input.data.driverPhone),
      departureAt: departureAt.toISOString(),
      managementCode: crypto.randomUUID().replaceAll('-', '').slice(0, 12),
    };
    fixture.trips.push(trip);
    const published: PublishedTripResponse = {
      ...toPublic(trip),
      managementCode: trip.managementCode,
    };
    return HttpResponse.json(published, { status: 201 });
  }),

  http.post('*/api/trips/:tripId/bookings', async ({ request, params }) => {
    const failure = await gate('POST', '/api/trips/:tripId/bookings');
    if (failure) return failure;
    const param = tripIdParamSchema.safeParse(params);
    if (!param.success) return validationFailed(param.error);
    const input = bookSeatSchema.safeParse(await request.json());
    if (!input.success) return validationFailed(input.error);
    const { tripId } = param.data;

    const trip = fixture.trips.find((candidate) => candidate.id === tripId);
    if (trip === undefined) return tripNotFound(tripId);
    if (trip.cancelledAt !== undefined) {
      return problem(409, 'TRIP_CANCELLED', 'This trip has been cancelled by its driver', {
        details: { tripId },
      });
    }
    if (Date.parse(trip.departureAt) <= Date.now()) {
      return problem(409, 'TRIP_DEPARTED', 'This trip has already departed', {
        details: { tripId, departureAt: trip.departureAt },
      });
    }
    const passengerPhone = normalisePhone(input.data.passengerPhone);
    const passengerPhones = passengerPhonesOf(tripId);
    if (passengerPhones.includes(passengerPhone)) {
      return problem(409, 'PASSENGER_ALREADY_BOOKED', 'This phone has already booked this trip', {
        details: { tripId },
      });
    }
    if (passengerPhones.length >= trip.seats) {
      return problem(409, 'TRIP_FULL', 'This trip has no seat left', {
        details: { tripId, seats: trip.seats },
      });
    }

    const bookingCode = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    fixture.bookings.push({
      id: crypto.randomUUID(),
      tripId,
      passengerName: input.data.passengerName,
      passengerPhone,
      bookingCode,
    });
    const confirmation: BookingConfirmationResponse = {
      bookingCode,
      driverPhone: trip.driverPhone,
    };
    return HttpResponse.json(confirmation, { status: 201 });
  }),

  http.get('*/api/bookings/:bookingCode', async ({ params }) => {
    const failure = await gate('GET', '/api/bookings/:bookingCode');
    if (failure) return failure;
    const found = findBooking(params);
    if (found instanceof Response) return found;
    const { booking, trip } = found;

    const details: BookingDetailsResponse = {
      bookingCode: booking.bookingCode,
      passengerName: booking.passengerName,
      status: statusOf(booking, trip),
      trip: {
        id: trip.id,
        departurePlace: trip.departurePlace,
        site: trip.site,
        departureAt: trip.departureAt,
        pricePerSeat: trip.pricePerSeat,
        driverPhone: trip.driverPhone,
      },
    };
    return HttpResponse.json(details);
  }),

  http.post('*/api/bookings/:bookingCode/cancellation', async ({ params }) => {
    const failure = await gate('POST', '/api/bookings/:bookingCode/cancellation');
    if (failure) return failure;
    const found = findBooking(params);
    if (found instanceof Response) return found;

    found.booking.cancelledAt ??= new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/trips/:tripId/cancellation', async ({ request, params }) => {
    const failure = await gate('POST', '/api/trips/:tripId/cancellation');
    if (failure) return failure;
    const param = tripIdParamSchema.safeParse(params);
    if (!param.success) return validationFailed(param.error);
    const input = cancelTripSchema.safeParse(await request.json());
    if (!input.success) return validationFailed(input.error);
    const { tripId } = param.data;

    const trip = fixture.trips.find((candidate) => candidate.id === tripId);
    if (trip === undefined) return tripNotFound(tripId);
    if (input.data.managementCode !== trip.managementCode) {
      return problem(403, 'MANAGEMENT_CODE_INVALID', 'This management code is not the trip one', {
        details: { tripId },
      });
    }
    trip.cancelledAt ??= new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),
];
