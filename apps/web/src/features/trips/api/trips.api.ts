import { type TripResponse, type TripSite, tripListSchema } from '@joj/shared';
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
};
