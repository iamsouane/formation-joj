import type { TripDraft } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { AppConfig } from '../../../core/config/app-config';
import { TripError } from '../domain/trips.errors';
import { ClaudeTripMessageReader } from './claude-trip-message-reader';

const MESSAGE = 'je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F';
const NOW = new Date('2026-11-08T15:00:00.000Z');

const pikineToDiamniadio: TripDraft = {
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt: '2026-11-09T08:00',
  seats: 3,
  pricePerSeat: 1000,
};

/** Une réponse de l'API Messages, telle que Claude la renverrait. */
function claudeAnswer(text: string, stopReason = 'end_turn'): Response {
  return Response.json({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  });
}

/** Un `fetch` de test : il enregistre les corps des requêtes et renvoie la réponse préparée. */
function fakeFetch(answer: () => Response | Promise<Response>) {
  const bodies: unknown[] = [];
  const fetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    bodies.push(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined);
    return answer();
  };
  return { fetch, bodies };
}

/** Une clé factice : le `fetch` de test ne la transmet à personne. */
const withKey = AppConfig.fromEnv({ ANTHROPIC_API_KEY: 'changeme' });

async function unavailability(reader: ClaudeTripMessageReader): Promise<TripError> {
  try {
    await reader.read(MESSAGE, NOW);
  } catch (error) {
    if (error instanceof TripError) return error;
    throw error;
  }
  throw new Error('expected a TripError');
}

describe('ClaudeTripMessageReader', () => {
  it('004-AS1: sends the message with the Dakar time and reads the draft', async () => {
    const { fetch, bodies } = fakeFetch(() => claudeAnswer(JSON.stringify(pikineToDiamniadio)));
    const reader = new ClaudeTripMessageReader(withKey, fetch);

    await expect(reader.read(MESSAGE, NOW)).resolves.toEqual(pikineToDiamniadio);

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 1024,
      output_config: { effort: 'low', format: { type: 'json_schema' } },
      messages: [{ role: 'user', content: MESSAGE }],
    });
    expect(JSON.stringify(bodies[0])).toContain('2026-11-08T15:00');
    expect(bodies[0]).not.toHaveProperty('fallbacks');
  });

  it('is unavailable without an API key, and calls nothing', async () => {
    const { fetch, bodies } = fakeFetch(() => claudeAnswer(JSON.stringify(pikineToDiamniadio)));
    const reader = new ClaudeTripMessageReader(AppConfig.fromEnv({}), fetch);

    expect((await unavailability(reader)).code).toBe('ASSISTANT_UNAVAILABLE');
    expect(bodies).toEqual([]);
  });

  it.each([
    ['a refusal', () => claudeAnswer('', 'refusal')],
    ['a truncated answer', () => claudeAnswer('{"departurePlace":', 'max_tokens')],
    ['an answer that is not JSON', () => claudeAnswer('Désolé, je ne sais pas.')],
    ['an answer outside the schema', () => claudeAnswer('{"seats":"trois"}')],
    [
      'a server error',
      () => Response.json({}, { status: 500, headers: { 'retry-after-ms': '0' } }),
    ],
    [
      'a network failure',
      () => {
        throw new TypeError('fetch failed');
      },
    ],
  ])('is unavailable on %s', async (_case, answer) => {
    const { fetch } = fakeFetch(answer);
    const reader = new ClaudeTripMessageReader(withKey, fetch);

    const error = await unavailability(reader);
    expect(error.code).toBe('ASSISTANT_UNAVAILABLE');
    expect(error.kind).toBe('UNAVAILABLE');
  });
});
