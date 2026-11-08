import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { TRIP_SITES, type TripDraft, tripDraftSchema } from '@joj/shared';
import { AppConfig } from '../../../core/config/app-config';
import { TripMessageReader } from '../application/trip-message.reader';
import { TripError } from '../domain/trips.errors';

/** Jeton d'un `fetch` de remplacement pour le SDK ; seuls les tests le fournissent. */
export const ANTHROPIC_FETCH = Symbol('ANTHROPIC_FETCH');

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `Tu lis l'annonce d'un conducteur qui propose un covoiturage vers un site des Jeux Olympiques de la Jeunesse de Dakar 2026.
Extrais-en le trajet :
- departurePlace : le lieu de départ, tel qu'il est écrit ;
- site : la destination, si possible l'un de ces sites : ${TRIP_SITES.join(', ')} ; sinon le lieu tel qu'il est écrit ;
- departureAt : la date et l'heure de départ, à l'heure de Dakar, au format AAAA-MM-JJTHH:mm ;
- seats : le nombre de places proposées ;
- pricePerSeat : la participation par place en francs CFA ; 0 si l'annonce dit « gratuit » ou « 0 F ».
Une information absente de l'annonce vaut null : ne devine jamais et ne mets aucune valeur par défaut.`;

/** L'assistant réel : Claude, appelé par le SDK Anthropic. Toute défaillance devient ASSISTANT_UNAVAILABLE. */
@Injectable()
export class ClaudeTripMessageReader extends TripMessageReader {
  private readonly logger = new Logger(ClaudeTripMessageReader.name);
  private readonly client: Anthropic | undefined;

  constructor(
    config: AppConfig,
    @Optional() @Inject(ANTHROPIC_FETCH) fetch?: ClientOptions['fetch'],
  ) {
    super();
    const apiKey = config.get('ANTHROPIC_API_KEY');
    this.client =
      apiKey === undefined
        ? undefined
        : new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1, fetch });
  }

  async read(message: string, now: Date): Promise<TripDraft> {
    if (this.client === undefined) {
      throw unavailable('No ANTHROPIC_API_KEY is configured');
    }
    try {
      const response = await this.client.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: 'low', format: zodOutputFormat(tripDraftSchema) },
        system: `${SYSTEM_PROMPT}\n\nMaintenant, à Dakar : ${dakarNow(now)}.`,
        messages: [{ role: 'user', content: message }],
      });
      if (response.stop_reason !== 'end_turn' || response.parsed_output == null) {
        throw new Error(`Unusable answer (stop reason: ${response.stop_reason})`);
      }
      return response.parsed_output;
    } catch (error) {
      this.logger.warn(error);
      throw unavailable('The assistant could not read the message');
    }
  }
}

function unavailable(message: string): TripError {
  return new TripError('ASSISTANT_UNAVAILABLE', message);
}

/** « dimanche 8 novembre 2026 (2026-11-08T15:00) » : Dakar est à UTC+0, sans heure d'été. */
function dakarNow(now: Date): string {
  const day = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Dakar',
    dateStyle: 'full',
  }).format(now);
  return `${day} (${now.toISOString().slice(0, 16)})`;
}
