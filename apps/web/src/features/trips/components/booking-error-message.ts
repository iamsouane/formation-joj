import { ApiError } from '@/lib/api';

/** Les refus d'une réservation, dits au supporter en français ; les autres restent génériques. */
const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  TRIP_FULL: 'Ce trajet est complet.',
  PASSENGER_ALREADY_BOOKED: 'Vous avez déjà réservé ce trajet.',
  TRIP_DEPARTED: 'Ce trajet est déjà parti.',
  TRIP_CANCELLED: 'Ce trajet a été annulé.',
  VALIDATION_FAILED: 'Vérifiez votre nom et votre téléphone.',
};

export function bookingErrorMessage(error: unknown): string {
  return (
    (error instanceof ApiError && BOOKING_ERROR_MESSAGES[error.code]) ||
    'Une erreur est survenue, réessayez.'
  );
}
