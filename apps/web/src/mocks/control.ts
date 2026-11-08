import type { TripDraft } from '@joj/shared';
import { resetFixture } from './fixture';

/**
 * Les leviers d'un test sur la fausse API. Un état de chargement a besoin de temps pour
 * exister, un état d'erreur a besoin d'une panne : une fausse API qui répond toujours tout de
 * suite et sans erreur rend ces deux états impossibles à tester.
 */
/** Ce que lit le faux assistant par défaut : rien. */
const NOTHING_UNDERSTOOD: TripDraft = {
  departurePlace: null,
  site: null,
  departureAt: null,
  seats: null,
  pricePerSeat: null,
};

interface MockState {
  latency: number;
  failures: Map<string, number>;
  persistentFailures: Map<string, number>;
  assistant: TripDraft | 'unavailable';
}

const state: MockState = {
  latency: 0,
  /** Le brouillon que le faux assistant renvoie, ou sa panne. */
  assistant: NOTHING_UNDERSTOOD,
  /** Une panne, consommée par la première requête qui la lit. */
  failures: new Map<string, number>(),
  /** Une panne qui dure jusqu'au `reset()` : le serveur est tombé. */
  persistentFailures: new Map<string, number>(),
};

export const mockControl = {
  get latency(): number {
    return state.latency;
  },

  /** Retarde chaque réponse, pour observer un état de chargement. */
  setLatency(ms: number): void {
    state.latency = ms;
  },

  /** La prochaine requête vers `path` (`GET /api/…`) échoue, puis tout repart. */
  failNext(path: string, status = 500): void {
    state.failures.set(path, status);
  },

  /** Toutes les requêtes vers `path` échouent, jusqu'au `reset()`. */
  failPersistently(path: string, status = 500): void {
    state.persistentFailures.set(path, status);
  },

  /** Lu par les handlers : le statut de la panne armée pour `path`, ou `null`. */
  takeFailure(path: string): number | null {
    const persistent = state.persistentFailures.get(path);
    if (persistent !== undefined) return persistent;
    const once = state.failures.get(path);
    if (once === undefined) return null;
    state.failures.delete(path);
    return once;
  },

  /** Le brouillon que le faux assistant tirera du prochain message publié. */
  setTripDraft(draft: TripDraft): void {
    state.assistant = draft;
  },

  /** Le faux assistant tombe en panne, jusqu'au `reset()`. */
  failAssistant(): void {
    state.assistant = 'unavailable';
  },

  /** Lu par le handler : le brouillon du faux assistant, ou `'unavailable'`. */
  get assistant(): TripDraft | 'unavailable' {
    return state.assistant;
  },

  /** Appelé après chaque test (`test/setup.ts`) : latence, pannes et données d'origine. */
  reset(): void {
    state.latency = 0;
    state.failures.clear();
    state.persistentFailures.clear();
    state.assistant = NOTHING_UNDERSTOOD;
    resetFixture();
  },
};
