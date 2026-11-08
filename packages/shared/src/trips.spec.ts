import { describe, expect, it } from 'vitest';
import { publishTripSchema, publishedTripSchema, tripSchema } from './trips.ts';

const pikineToDiamniadio = {
  departurePlace: ' Pikine ',
  site: 'Diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '+221771234567',
};

const publicTrip = {
  id: '0199f5c2-0000-7000-8000-000000000001',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 3,
  pricePerSeat: 1000,
};

describe('publishTripSchema', () => {
  it('001-AS1: accepts a complete trip and trims the departure place', () => {
    expect(publishTripSchema.parse(pikineToDiamniadio)).toEqual({
      ...pikineToDiamniadio,
      departurePlace: 'Pikine',
    });
  });

  it('001-AS3: leaves an unknown site to the domain, which answers SITE_UNKNOWN', () => {
    expect(publishTripSchema.safeParse({ ...pikineToDiamniadio, site: 'Thiès' }).success).toBe(
      true,
    );
  });

  it.each([
    { seats: 0 },
    { seats: 1.5 },
    { pricePerSeat: -1 },
    { departurePlace: '  ' },
    { driverPhone: '' },
    { departureAt: 'demain 8h' },
  ])('001-AS1: rejects an incomplete or inconsistent input (%j)', (change) => {
    expect(publishTripSchema.safeParse({ ...pikineToDiamniadio, ...change }).success).toBe(false);
  });
});

describe('tripSchema', () => {
  it('001-AS2: strips the driver phone and the management code from a public trip', () => {
    expect(
      tripSchema.parse({ ...publicTrip, driverPhone: '+221771234567', managementCode: 'abc123' }),
    ).toEqual(publicTrip);
  });

  it('001-AS1: keeps the management code in a published trip', () => {
    expect(publishedTripSchema.parse({ ...publicTrip, managementCode: 'abc123' })).toEqual({
      ...publicTrip,
      managementCode: 'abc123',
    });
  });
});
