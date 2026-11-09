import { ApiError } from '@/lib/api';

/** Un champ de code laissé vide : dit sans appeler l'API, et quand elle refuse un code mal formé. */
export const CODE_MISSING_MESSAGE = 'Saisissez votre code.';

const TRIP_NOT_FOUND_MESSAGE = 'Ce trajet est introuvable. Vérifiez votre lien de gestion.';

/**
 * Les refus d'un code de réservation ou de gestion, dits en français ; les autres restent
 * génériques.
 */
const CODE_ERROR_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: 'Aucune réservation ne correspond à ce code. Vérifiez-le.',
  MANAGEMENT_CODE_INVALID: 'Ce code de gestion n’est pas le bon.',
  TRIP_NOT_FOUND: TRIP_NOT_FOUND_MESSAGE,
  VALIDATION_FAILED: CODE_MISSING_MESSAGE,
};

/** Les refus qui portent sur le code saisi lui-même : son champ est alors signalé. */
const CODE_REFUSALS = new Set([
  'BOOKING_NOT_FOUND',
  'MANAGEMENT_CODE_INVALID',
  'VALIDATION_FAILED',
]);

export function codeErrorMessage(error: unknown): string {
  return (
    (error instanceof ApiError && CODE_ERROR_MESSAGES[error.code]) ||
    'Une erreur est survenue, réessayez.'
  );
}

export function isCodeRefusal(error: unknown): boolean {
  return error instanceof ApiError && CODE_REFUSALS.has(error.code);
}

/**
 * Le refus reçu à l'ouverture d'un lien de gestion. Aucun code n'a encore été saisi : un lien dont
 * l'identifiant est mal formé (VALIDATION_FAILED) désigne, lui aussi, un trajet introuvable.
 */
export function managementLinkErrorMessage(error: unknown): string {
  return error instanceof ApiError && error.code === 'VALIDATION_FAILED'
    ? TRIP_NOT_FOUND_MESSAGE
    : codeErrorMessage(error);
}
