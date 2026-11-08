import { type TripDraft, tripDraftSchema } from '@joj/shared';
import { TripError } from '../../domain/trips.errors';
import { TripMessageReader } from '../trip-message.reader';

/** Faux assistant des tests : il renvoie le brouillon qu'on lui dicte, ou tombe en panne. */
export class FakeTripMessageReader extends TripMessageReader {
  /** Les appels reçus, dans l'ordre. */
  readonly received: { message: string; now: Date }[] = [];
  private answer: TripDraft | 'unavailable' = {
    departurePlace: null,
    site: null,
    departureAt: null,
    seats: null,
    pricePerSeat: null,
  };

  willRead(draft: TripDraft): void {
    this.answer = draft;
  }

  willFail(): void {
    this.answer = 'unavailable';
  }

  async read(message: string, now: Date): Promise<TripDraft> {
    this.received.push({ message, now });
    // Comme l'adaptateur réel, qui tient le contrat du port : un brouillon hors schéma est inexploitable.
    const draft = tripDraftSchema.safeParse(this.answer);
    if (!draft.success) {
      throw new TripError('ASSISTANT_UNAVAILABLE', 'The assistant is unavailable');
    }
    return draft.data;
  }
}
