import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/** Codes stables exposés aux clients ; la catégorie décide du statut HTTP. */
const TRIP_ERROR_KINDS = {
  /** Site absent de TRIP_SITES, même après normalisation. */
  SITE_UNKNOWN: 'VALIDATION',
  /** Heure de départ égale ou antérieure à l'instant présent. */
  DEPARTURE_IN_PAST: 'VALIDATION',
} as const satisfies Record<string, ErrorKind>;

export type TripErrorCode = keyof typeof TRIP_ERROR_KINDS;

export class TripError extends AppError<TripErrorCode> {
  constructor(code: TripErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, TRIP_ERROR_KINDS[code], message, details);
  }
}
