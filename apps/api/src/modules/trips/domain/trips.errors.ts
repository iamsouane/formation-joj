import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/** Codes stables exposés aux clients ; la catégorie décide du statut HTTP. */
const TRIP_ERROR_KINDS = {
  /** Site absent de TRIP_SITES, même après normalisation. */
  SITE_UNKNOWN: 'VALIDATION',
  /** Heure de départ égale ou antérieure à l'instant présent. */
  DEPARTURE_IN_PAST: 'VALIDATION',
  /** Plus aucune place restante sur le trajet. */
  TRIP_FULL: 'CONFLICT',
  /** Une réservation du trajet porte déjà ce téléphone normalisé. */
  PASSENGER_ALREADY_BOOKED: 'CONFLICT',
  /** Le trajet est parti : son heure de départ est égale ou antérieure à l'instant présent. */
  TRIP_DEPARTED: 'CONFLICT',
  /** Aucun trajet n'a cet identifiant. */
  TRIP_NOT_FOUND: 'NOT_FOUND',
} as const satisfies Record<string, ErrorKind>;

export type TripErrorCode = keyof typeof TRIP_ERROR_KINDS;

export class TripError extends AppError<TripErrorCode> {
  constructor(code: TripErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, TRIP_ERROR_KINDS[code], message, details);
  }
}
