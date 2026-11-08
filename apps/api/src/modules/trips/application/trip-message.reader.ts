import type { TripDraft } from '@joj/shared';

/**
 * Port de l'assistant qui lit une annonce de conducteur. Ce qu'il renvoie n'est qu'un brouillon :
 * il n'est jamais publié sans passer par les contrôles de la publication.
 * Implémenté par ClaudeTripMessageReader (infra) et FakeTripMessageReader (tests).
 */
export abstract class TripMessageReader {
  /**
   * Le brouillon tiré de `message` ; `now` permet de comprendre « demain ».
   * Lève ASSISTANT_UNAVAILABLE si l'assistant ne répond pas ou que sa réponse est inexploitable.
   */
  abstract read(message: string, now: Date): Promise<TripDraft>;
}
