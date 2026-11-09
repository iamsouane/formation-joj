import type {
  BookSeatInput,
  PublishTripFromMessageInput,
  PublishTripInput,
  TripSite,
} from '@joj/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { tripsApi } from './trips.api';

/** Clés du cache TanStack Query pour cette fonctionnalité. */
export const tripKeys = {
  all: ['trips'] as const,
  upcoming: (site: TripSite) => [...tripKeys.all, 'upcoming', site] as const,
  booking: (bookingCode: string) => [...tripKeys.all, 'booking', bookingCode] as const,
};

/**
 * Les départs d'un site. Ils sont relus à chaque retour sur l'accueil, même encore frais : un
 * trajet a pu être publié entre-temps, ailleurs que dans cet onglet.
 */
export const upcomingTripsQueryOptions = (site: TripSite) =>
  queryOptions({
    queryKey: tripKeys.upcoming(site),
    queryFn: ({ signal }) => tripsApi.upcoming(site, signal),
    refetchOnMount: 'always',
  });

export function useUpcomingTrips(site: TripSite) {
  const queryClient = useQueryClient();
  // Safari restaure une page depuis son cache (retour arrière) sans la remonter : on relit.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void queryClient.invalidateQueries({ queryKey: tripKeys.all });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [queryClient]);
  return useQuery(upcomingTripsQueryOptions(site));
}

/**
 * La réservation d'un code, une fois le code saisi. Jamais servie du cache : un billet dit où en
 * est la réservation maintenant, et elle a pu être annulée entre deux consultations.
 */
export function useBooking(bookingCode: string | undefined) {
  return useQuery({
    queryKey: tripKeys.booking(bookingCode ?? ''),
    queryFn: ({ signal }) => tripsApi.booking(bookingCode ?? '', signal),
    enabled: bookingCode !== undefined,
    staleTime: 0,
  });
}

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

/** Publier par le formulaire : comme depuis l'annonce, les listes de départs sont relues. */
export function usePublishTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishTripInput) => tripsApi.publish(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
}
