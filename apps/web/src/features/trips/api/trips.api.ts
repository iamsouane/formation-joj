import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
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
