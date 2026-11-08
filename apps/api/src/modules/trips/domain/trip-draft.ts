import { TRIP_DRAFT_FIELDS, type TripDraft } from '@joj/shared';
import { TripError } from './trips.errors';

/** Le trajet tiré d'un message, une fois tous ses champs présents. */
export interface CompleteTripDraft {
  departurePlace: string;
  site: string;
  departureAt: Date;
  seats: number;
  pricePerSeat: number;
}

/** Dakar est à UTC+0 toute l'année, sans heure d'été. */
const DAKAR_UTC_OFFSET = 'Z';

/** Le message coupé aux deux bouts ; un message vide n'est pas envoyé à l'assistant. */
export function readableMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed === '') {
    throw new TripError('MESSAGE_EMPTY', 'The message is empty');
  }
  return trimmed;
}

/** Le trajet du brouillon ; aucun champ absent n'est complété par défaut. */
export function completeTripDraft(draft: TripDraft): CompleteTripDraft {
  const { departurePlace, site, departureAt, seats, pricePerSeat } = draft;
  if (
    departurePlace === null ||
    site === null ||
    departureAt === null ||
    seats === null ||
    pricePerSeat === null
  ) {
    const missingFields = TRIP_DRAFT_FIELDS.filter((field) => draft[field] === null);
    throw new TripError('MESSAGE_UNREADABLE', 'The message lacks trip information', {
      missingFields,
    });
  }
  return {
    departurePlace,
    site,
    departureAt: new Date(`${departureAt}:00.000${DAKAR_UTC_OFFSET}`),
    seats,
    pricePerSeat,
  };
}
