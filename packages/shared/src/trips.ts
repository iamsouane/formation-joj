import { z } from 'zod';

/** Liste fermée des sites des JOJ, en minuscules : un site saisi est normalisé avant d'y être cherché. */
export const TRIP_SITES = ['dakar', 'diamniadio', 'saly'] as const;
export type TripSite = (typeof TRIP_SITES)[number];

export const TRIP_DEPARTURE_PLACE_MAX_LENGTH = 100;
export const TRIP_DRIVER_PHONE_MAX_LENGTH = 20;

/**
 * Un site saisi : une chaîne non vide, pas une énumération. Le domaine la normalise et la
 * refuse avec SITE_UNKNOWN si elle n'est pas un site des JOJ.
 */
const siteInputSchema = z.string().trim().min(1);

/** Corps de `POST /api/trips`. */
export const publishTripSchema = z.object({
  departurePlace: z.string().trim().min(1).max(TRIP_DEPARTURE_PLACE_MAX_LENGTH),
  site: siteInputSchema,
  departureAt: z.iso.datetime({ offset: true }),
  seats: z.int().min(1),
  pricePerSeat: z.int().min(0),
  driverPhone: z.string().trim().min(1).max(TRIP_DRIVER_PHONE_MAX_LENGTH),
});
export type PublishTripInput = z.infer<typeof publishTripSchema>;

/** Requête de `GET /api/trips?site=<site>`. */
export const upcomingTripsQuerySchema = z.object({ site: siteInputSchema });
export type UpcomingTripsQuery = z.infer<typeof upcomingTripsQuerySchema>;

/** Un trajet tel que la liste le montre : ni le téléphone du conducteur, ni le code de gestion. */
export const tripSchema = z.object({
  id: z.uuid(),
  departurePlace: z.string(),
  site: z.enum(TRIP_SITES),
  departureAt: z.iso.datetime(),
  seats: z.int(),
  pricePerSeat: z.int(),
});
export type TripResponse = z.infer<typeof tripSchema>;

/** Le trajet renvoyé au conducteur qui vient de le publier, avec son code de gestion. */
export const publishedTripSchema = tripSchema.extend({ managementCode: z.string() });
export type PublishedTripResponse = z.infer<typeof publishedTripSchema>;

export const tripListSchema = z.array(tripSchema);

export const BOOKING_PASSENGER_NAME_MAX_LENGTH = 100;
export const BOOKING_PASSENGER_PHONE_MAX_LENGTH = 20;

/** Paramètre de chemin de `POST /api/trips/:tripId/bookings`. */
export const tripIdParamSchema = z.object({ tripId: z.uuid() });
export type TripIdParam = z.infer<typeof tripIdParamSchema>;

/** Corps de `POST /api/trips/:tripId/bookings`. Le domaine normalise le téléphone. */
export const bookSeatSchema = z.object({
  passengerName: z.string().trim().min(1).max(BOOKING_PASSENGER_NAME_MAX_LENGTH),
  passengerPhone: z.string().trim().min(1).max(BOOKING_PASSENGER_PHONE_MAX_LENGTH),
});
export type BookSeatInput = z.infer<typeof bookSeatSchema>;

/** Ce que reçoit le supporter qui vient de réserver : son code, et le téléphone du conducteur. */
export const bookingConfirmationSchema = z.object({
  bookingCode: z.string(),
  driverPhone: z.string(),
});
export type BookingConfirmationResponse = z.infer<typeof bookingConfirmationSchema>;
