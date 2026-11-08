import { describe, expect, it } from 'vitest';
import { completeTripDraft, readableMessage } from './trip-draft';
import { TripError } from './trips.errors';

const pikineToDiamniadio = {
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt: '2026-11-09T08:00',
  seats: 3,
  pricePerSeat: 1000,
};

function errorOf(action: () => unknown): TripError {
  try {
    action();
  } catch (error) {
    if (error instanceof TripError) return error;
    throw error;
  }
  throw new Error('expected a TripError');
}

describe('completeTripDraft', () => {
  it('004-AS1: reads the departure in Dakar time and keeps the extracted trip', () => {
    expect(completeTripDraft(pikineToDiamniadio)).toEqual({
      departurePlace: 'Pikine',
      site: 'Diamniadio',
      departureAt: new Date('2026-11-09T08:00:00.000Z'),
      seats: 3,
      pricePerSeat: 1000,
    });
  });

  it('004-AS5: lists the missing fields when the assistant only found the site', () => {
    const error = errorOf(() =>
      completeTripDraft({
        departurePlace: null,
        site: 'Diamniadio',
        departureAt: null,
        seats: null,
        pricePerSeat: null,
      }),
    );
    expect(error.code).toBe('MESSAGE_UNREADABLE');
    expect(error.kind).toBe('BUSINESS_RULE');
    expect(error.details).toEqual({
      missingFields: ['departurePlace', 'departureAt', 'seats', 'pricePerSeat'],
    });
  });

  it('004-AS5: counts a blank place or site returned by the assistant as missing', () => {
    const error = errorOf(() =>
      completeTripDraft({ ...pikineToDiamniadio, departurePlace: '   ', site: '' }),
    );
    expect(error.code).toBe('MESSAGE_UNREADABLE');
    expect(error.details).toEqual({ missingFields: ['departurePlace', 'site'] });
  });

  it('keeps a free trip: a price of 0 is not missing', () => {
    expect(completeTripDraft({ ...pikineToDiamniadio, pricePerSeat: 0 }).pricePerSeat).toBe(0);
  });
});

describe('readableMessage', () => {
  it.each(['', '   '])('004-AS4: rejects an empty message (%j)', (message) => {
    const error = errorOf(() => readableMessage(message));
    expect(error.code).toBe('MESSAGE_EMPTY');
    expect(error.kind).toBe('VALIDATION');
  });

  it('trims the message', () => {
    expect(readableMessage('  je pars de Pikine  ')).toBe('je pars de Pikine');
  });
});
