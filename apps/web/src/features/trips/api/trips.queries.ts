import type { TripSite } from '@joj/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
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
