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

/**
 * Un téléphone saisi : une fois retirés espaces, tirets et préfixe +221 ou 00221 (ce que fait la
 * normalisation du domaine), il ne reste que des chiffres, au moins un.
 */
const phoneInputSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .refine((phone) => /^\d+$/.test(phone.replace(/[\s-]/g, '').replace(/^(\+221|00221)/, '')), {
      message: 'Invalid phone number',
    });

/** Corps de `POST /api/trips`. */
export const publishTripSchema = z.object({
  departurePlace: z.string().trim().min(1).max(TRIP_DEPARTURE_PLACE_MAX_LENGTH),
  site: siteInputSchema,
  departureAt: z.iso.datetime({ offset: true }),
  seats: z.int().min(1),
  pricePerSeat: z.int().min(0),
  driverPhone: phoneInputSchema(TRIP_DRIVER_PHONE_MAX_LENGTH),
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
  /** Les places publiées moins les réservations. */
  remainingSeats: z.int(),
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
  passengerPhone: phoneInputSchema(BOOKING_PASSENGER_PHONE_MAX_LENGTH),
});
export type BookSeatInput = z.infer<typeof bookSeatSchema>;

/** Ce que reçoit le supporter qui vient de réserver : son code, et le téléphone du conducteur. */
export const bookingConfirmationSchema = z.object({
  bookingCode: z.string(),
  driverPhone: z.string(),
});
export type BookingConfirmationResponse = z.infer<typeof bookingConfirmationSchema>;

export const BOOKING_CODE_MAX_LENGTH = 32;
export const TRIP_MANAGEMENT_CODE_MAX_LENGTH = 32;

/** Paramètre de chemin de `GET /api/bookings/:bookingCode` et de son annulation. */
export const bookingCodeParamSchema = z.object({
  bookingCode: z.string().min(1).max(BOOKING_CODE_MAX_LENGTH),
});
export type BookingCodeParam = z.infer<typeof bookingCodeParamSchema>;

/** Corps de `POST /api/trips/:tripId/cancellation` : le code de gestion remis au conducteur. */
export const cancelTripSchema = z.object({
  managementCode: z.string().trim().min(1).max(TRIP_MANAGEMENT_CODE_MAX_LENGTH),
});
export type CancelTripInput = z.infer<typeof cancelTripSchema>;

/**
 * Le statut d'une réservation consultée : « actif », « annulé » par le supporter, ou
 * « trajet annulé » par le conducteur. L'annulation du supporter l'emporte.
 */
export const BOOKING_STATUSES = ['active', 'cancelled', 'trip_cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Ce que voit le supporter qui consulte sa réservation : le trajet, avec le téléphone du conducteur. */
export const bookingDetailsSchema = z.object({
  bookingCode: z.string(),
  passengerName: z.string(),
  status: z.enum(BOOKING_STATUSES),
  trip: z.object({
    id: z.uuid(),
    departurePlace: z.string(),
    site: z.enum(TRIP_SITES),
    departureAt: z.iso.datetime(),
    pricePerSeat: z.int(),
    driverPhone: z.string(),
  }),
});
export type BookingDetailsResponse = z.infer<typeof bookingDetailsSchema>;
