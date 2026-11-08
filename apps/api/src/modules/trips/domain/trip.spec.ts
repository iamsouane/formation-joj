import { describe, expect, it } from 'vitest';
import { Trip } from './trip';
import { TripError } from './trips.errors';

const NOW = new Date('2026-11-08T09:00:00.000Z');
const TOMORROW_8AM = new Date('2026-11-09T08:00:00.000Z');
const YESTERDAY_8AM = new Date('2026-11-07T08:00:00.000Z');

const pikineToDiamniadio = {
  id: '0199f5c2-0000-7000-8000-000000000001',
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt: TOMORROW_8AM,
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '+221771234567',
  managementCode: 'abc123',
  now: NOW,
};

describe('Trip', () => {
  it('001-AS1: creates a trip from Pikine to Diamniadio, reading the site in lower case', () => {
    expect(Trip.create(pikineToDiamniadio)).toMatchObject({
      id: pikineToDiamniadio.id,
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: TOMORROW_8AM,
      seats: 3,
      pricePerSeat: 1000,
      driverPhone: '771234567',
      managementCode: 'abc123',
      createdAt: NOW,
    });
  });

  it('002-AS2: counts the remaining seats of a trip with one booked passenger', () => {
    const trip = Trip.restore({
      id: pikineToDiamniadio.id,
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: TOMORROW_8AM,
      seats: 3,
      pricePerSeat: 1000,
      driverPhone: '771112233',
      managementCode: 'abc123',
      createdAt: NOW,
      passengerPhones: ['771234567'],
    });
    expect(trip.remainingSeats).toBe(2);
    expect(trip.hasPassenger('771234567')).toBe(true);
  });

  it.each([' DAKAR ', 'saly'])('001-AS1: accepts the site %j once normalised', (site) => {
    expect(() => Trip.create({ ...pikineToDiamniadio, site })).not.toThrow();
  });

  it('001-AS3: rejects an unknown site', () => {
    const publish = () => Trip.create({ ...pikineToDiamniadio, site: 'Thiès' });
    expect(publish).toThrow(TripError);
    expect(publish).toThrow(expect.objectContaining({ code: 'SITE_UNKNOWN', kind: 'VALIDATION' }));
  });

  it('001-AS4: rejects a departure in the past', () => {
    const publish = () => Trip.create({ ...pikineToDiamniadio, departureAt: YESTERDAY_8AM });
    expect(publish).toThrow(
      expect.objectContaining({ code: 'DEPARTURE_IN_PAST', kind: 'VALIDATION' }),
    );
  });

  it('001-AS4: rejects a departure at the present instant', () => {
    expect(() => Trip.create({ ...pikineToDiamniadio, departureAt: NOW })).toThrow(
      expect.objectContaining({ code: 'DEPARTURE_IN_PAST' }),
    );
  });

  describe('cancel', () => {
    const LATER = new Date('2026-11-08T10:00:00.000Z');

    it('003-AS4: cancels a trip with its management code', () => {
      const trip = Trip.create(pikineToDiamniadio);
      const cancelled = trip.cancel('abc123', LATER);
      expect(cancelled.isCancelled).toBe(true);
      expect(cancelled.cancelledAt).toEqual(LATER);
      expect(trip.isCancelled).toBe(false);
    });

    it('003-AS4: keeps the first cancellation date when cancelled twice', () => {
      const cancelled = Trip.create(pikineToDiamniadio).cancel('abc123', NOW);
      expect(cancelled.cancel('abc123', LATER).cancelledAt).toEqual(NOW);
    });

    it('003-AS6: rejects another management code', () => {
      const cancel = () => Trip.create(pikineToDiamniadio).cancel('other-code', LATER);
      expect(cancel).toThrow(TripError);
      expect(cancel).toThrow(
        expect.objectContaining({ code: 'MANAGEMENT_CODE_INVALID', kind: 'FORBIDDEN' }),
      );
    });
  });
});
