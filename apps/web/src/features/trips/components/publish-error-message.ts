import { ApiError } from '@/lib/api';

/** Les refus d'une publication, dits au conducteur en français ; les autres restent génériques. */
const PUBLISH_ERROR_MESSAGES: Record<string, string> = {
  SITE_UNKNOWN: 'Choisissez Dakar, Diamniadio ou Saly.',
  DEPARTURE_IN_PAST: 'Cette heure est déjà passée. Indiquez un départ à venir.',
  MESSAGE_EMPTY: 'Collez votre annonce avant de publier.',
  VALIDATION_FAILED: 'Vérifiez les champs signalés.',
};

export function publishErrorMessage(error: unknown): string {
  return (
    (error instanceof ApiError && PUBLISH_ERROR_MESSAGES[error.code]) ||
    'Une erreur est survenue, réessayez.'
  );
}

/** Les champs qu'un refus VALIDATION_FAILED désigne : le premier segment de chaque chemin. */
export function refusedFieldsOf(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return [];
  return (error.errors ?? []).map((issue) => issue.path.split('.')[0] ?? issue.path);
}
