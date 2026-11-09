import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
  type BookingDetailsResponse,
  bookingDetailsSchema,
  type BookSeatInput,
  type PublishedTripResponse,
  publishedTripSchema,
  type PublishTripFromMessageInput,
  type PublishTripInput,
  type TripResponse,
  type TripSite,
  tripListSchema,
} from '@joj/shared';
import { api } from '@/lib/api';

/**
 * Les appels HTTP de la fonctionnalité, sans React ni cache : un appel par route de l'API,
 * réponse validée par le schéma partagé. Le cache et les hooks sont dans `trips.queries.ts`.
 */
export const tripsApi = {
  upcoming: (site: TripSite, signal?: AbortSignal) =>
    api.request<TripResponse[]>(`/trips?site=${encodeURIComponent(site)}`, {
      schema: tripListSchema,
      signal,
    }),

  bookSeat: (tripId: string, input: BookSeatInput) =>
    api.request<BookingConfirmationResponse>(`/trips/${tripId}/bookings`, {
      method: 'POST',
      body: input,
      schema: bookingConfirmationSchema,
    }),

  /** La réservation, son statut et son trajet. Le code vient d'une saisie : il est encodé. */
  booking: (bookingCode: string, signal?: AbortSignal) =>
    api.request<BookingDetailsResponse>(`/bookings/${encodeURIComponent(bookingCode)}`, {
      schema: bookingDetailsSchema,
      signal,
    }),

  /** Annule la réservation : sa place redevient disponible. */
  cancelBooking: (bookingCode: string) =>
    api.request<void>(`/bookings/${encodeURIComponent(bookingCode)}/cancellation`, {
      method: 'POST',
    }),

  publish: (input: PublishTripInput) =>
    api.request<PublishedTripResponse>('/trips', {
      method: 'POST',
      body: input,
      schema: publishedTripSchema,
    }),

  publishFromMessage: (input: PublishTripFromMessageInput) =>
    api.request<PublishedTripResponse>('/trips/from-message', {
      method: 'POST',
      body: input,
      schema: publishedTripSchema,
    }),
};
