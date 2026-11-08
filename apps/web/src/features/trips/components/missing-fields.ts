import { TRIP_DRAFT_FIELDS } from '@joj/shared';
import { z } from 'zod';
import { ApiError } from '@/lib/api';

export type TripDraftField = (typeof TRIP_DRAFT_FIELDS)[number];

const unreadableDetailsSchema = z.object({ missingFields: z.array(z.enum(TRIP_DRAFT_FIELDS)) });

/**
 * Les informations que l'assistant n'a pas trouvées dans l'annonce, lues dans un refus
 * `MESSAGE_UNREADABLE` ; `null` pour tout autre refus, ou un détail illisible.
 */
export function missingFieldsOf(error: unknown): TripDraftField[] | null {
  if (!(error instanceof ApiError) || error.code !== 'MESSAGE_UNREADABLE') return null;
  const details = unreadableDetailsSchema.safeParse(error.details);
  return details.success ? details.data.missingFields : null;
}
