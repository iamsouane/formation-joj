import { describe, expect, it } from 'vitest';
import {
  bookingCodeParamSchema,
  bookingConfirmationSchema,
  bookingDetailsSchema,
  cancelTripSchema,
  bookSeatSchema,
  publishTripFromMessageSchema,
  publishTripSchema,
  TRIP_MESSAGE_MAX_LENGTH,
  tripDraftSchema,
  publishedTripSchema,
  tripIdParamSchema,
  tripSchema,
} from './trips.ts';

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
  remainingSeats: 3,
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

describe('bookSeatSchema', () => {
  const awa = { passengerName: ' Awa ', passengerPhone: ' 77 123 45 67 ' };

  it('002-AS1: accepts a name and a phone, trimmed', () => {
    expect(bookSeatSchema.parse(awa)).toEqual({
      passengerName: 'Awa',
      passengerPhone: '77 123 45 67',
    });
  });

  it.each([{ passengerName: '  ' }, { passengerPhone: '' }, { passengerPhone: '7'.repeat(21) }])(
    '002-AS1: rejects an invalid input (%j)',
    (change) => {
      expect(bookSeatSchema.safeParse({ ...awa, ...change }).success).toBe(false);
    },
  );
});

describe('tripIdParamSchema', () => {
  it('002-AS6: accepts a trip id that is a UUID and rejects anything else', () => {
    const tripId = '0199f5c2-0000-7000-8000-000000000001';
    expect(tripIdParamSchema.parse({ tripId })).toEqual({ tripId });
    expect(tripIdParamSchema.safeParse({ tripId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('bookingConfirmationSchema', () => {
  it('002-AS1: returns only the booking code and the driver phone', () => {
    expect(
      bookingConfirmationSchema.parse({
        bookingCode: 'booking-code-1',
        driverPhone: '771234567',
        passengerPhone: '771112233',
      }),
    ).toEqual({ bookingCode: 'booking-code-1', driverPhone: '771234567' });
  });
});

describe('phones', () => {
  const malformed = ['abc', '+221', '----', 'hello world'];

  it.each(malformed)('002-AS1: rejects a malformed phone (%j)', (phone) => {
    expect(bookSeatSchema.safeParse({ passengerName: 'Awa', passengerPhone: phone }).success).toBe(
      false,
    );
    expect(publishTripSchema.safeParse({ ...pikineToDiamniadio, driverPhone: phone }).success).toBe(
      false,
    );
  });

  it.each(['77 123 45 67', '77-123-45-67', '+221771234567', '00221 77 123 45 67'])(
    '002-AS1: accepts a well-formed phone (%j)',
    (phone) => {
      expect(
        bookSeatSchema.safeParse({ passengerName: 'Awa', passengerPhone: phone }).success,
      ).toBe(true);
      expect(
        publishTripSchema.safeParse({ ...pikineToDiamniadio, driverPhone: phone }).success,
      ).toBe(true);
    },
  );
});

describe('bookingCodeParamSchema', () => {
  it('003-AS2: accepts a booking code and rejects an empty or too long one', () => {
    expect(bookingCodeParamSchema.parse({ bookingCode: 'booking-code-1' })).toEqual({
      bookingCode: 'booking-code-1',
    });
    expect(bookingCodeParamSchema.safeParse({ bookingCode: '' }).success).toBe(false);
    expect(bookingCodeParamSchema.safeParse({ bookingCode: 'x'.repeat(33) }).success).toBe(false);
  });
});

describe('cancelTripSchema', () => {
  it('003-AS6: accepts a management code, trimmed, and rejects an empty one', () => {
    expect(cancelTripSchema.parse({ managementCode: ' abc123 ' })).toEqual({
      managementCode: 'abc123',
    });
    expect(cancelTripSchema.safeParse({ managementCode: '  ' }).success).toBe(false);
  });
});

describe('bookingDetailsSchema', () => {
  const details = {
    bookingCode: 'booking-code-1',
    passengerName: 'Awa',
    status: 'active',
    trip: {
      id: '0199f5c2-0000-7000-8000-000000000001',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: '2026-11-09T08:00:00.000Z',
      pricePerSeat: 1000,
      driverPhone: '771234567',
    },
  };

  it('003-AS1: shows the trip with the driver phone and the status, without the management code', () => {
    expect(
      bookingDetailsSchema.parse({
        ...details,
        passengerPhone: '771112233',
        trip: { ...details.trip, managementCode: 'abc123' },
      }),
    ).toEqual(details);
  });

  it.each(['active', 'cancelled', 'trip_cancelled'])('003-AS5: accepts the status %j', (status) => {
    expect(bookingDetailsSchema.safeParse({ ...details, status }).success).toBe(true);
  });

  it('003-AS5: rejects an unknown status', () => {
    expect(bookingDetailsSchema.safeParse({ ...details, status: 'departed' }).success).toBe(false);
  });
});

describe('publishTripFromMessageSchema', () => {
  const body = {
    message: 'je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F',
    driverPhone: '+221771234567',
  };

  it('004-AS1: accepts a message and the driver phone', () => {
    expect(publishTripFromMessageSchema.parse(body)).toEqual(body);
  });

  it('004-AS4: lets an empty message through, for the domain to reject it', () => {
    expect(publishTripFromMessageSchema.safeParse({ ...body, message: '   ' }).success).toBe(true);
  });

  it('rejects a message that is too long, or an invalid phone', () => {
    const tooLong = 'a'.repeat(TRIP_MESSAGE_MAX_LENGTH + 1);
    expect(publishTripFromMessageSchema.safeParse({ ...body, message: tooLong }).success).toBe(
      false,
    );
    expect(publishTripFromMessageSchema.safeParse({ ...body, driverPhone: 'abc' }).success).toBe(
      false,
    );
  });
});

describe('tripDraftSchema', () => {
  const draft = {
    departurePlace: 'Pikine',
    site: 'Diamniadio',
    departureAt: '2026-11-09T08:00',
    seats: 3,
    pricePerSeat: 1000,
  };

  it('004-AS1: accepts a complete draft in Dakar local time', () => {
    expect(tripDraftSchema.parse(draft)).toEqual(draft);
  });

  it('004-AS5: accepts missing fields as null', () => {
    const onlySite = {
      departurePlace: null,
      site: 'Diamniadio',
      departureAt: null,
      seats: null,
      pricePerSeat: null,
    };
    expect(tripDraftSchema.parse(onlySite)).toEqual(onlySite);
  });

  it('rejects a departure that is not a local date and time', () => {
    expect(tripDraftSchema.safeParse({ ...draft, departureAt: 'demain 8h' }).success).toBe(false);
  });

  it.each(['2026-11-09T25:00', '2026-13-45T08:00', '2026-02-30T08:00', '2026-11-09T08:60'])(
    '004-AS1: rejects a departure that is not a real date (%s)',
    (departureAt) => {
      expect(tripDraftSchema.safeParse({ ...draft, departureAt }).success).toBe(false);
    },
  );

  it('004-AS1: accepts the 29th of February of a leap year', () => {
    expect(tripDraftSchema.safeParse({ ...draft, departureAt: '2028-02-29T08:00' }).success).toBe(
      true,
    );
  });
});
