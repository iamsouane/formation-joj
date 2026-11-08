import type { BookSeatInput, PublishTripFromMessageInput, TripSite } from '@joj/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from './trips.api';

/** Clés du cache TanStack Query pour cette fonctionnalité. */
export const tripKeys = {
  all: ['trips'] as const,
  upcoming: (site: TripSite) => [...tripKeys.all, 'upcoming', site] as const,
};

export const upcomingTripsQueryOptions = (site: TripSite) =>
  queryOptions({
    queryKey: tripKeys.upcoming(site),
    queryFn: ({ signal }) => tripsApi.upcoming(site, signal),
  });

export const useUpcomingTrips = (site: TripSite) => useQuery(upcomingTripsQueryOptions(site));

export function useBookSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, input }: { tripId: string; input: BookSeatInput }) =>
      tripsApi.bookSeat(tripId, input),
    // Même en échec (trajet complet entre-temps), la liste est relue : ses places ont changé.
    onSettled: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
}

/** Publier depuis l'annonce : le nouveau trajet entre dans les listes de départs, relues. */
export function usePublishTripFromMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishTripFromMessageInput) => tripsApi.publishFromMessage(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
}
