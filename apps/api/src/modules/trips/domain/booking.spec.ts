import { describe, expect, it } from 'vitest';
import { Booking } from './booking';
import { Trip, type TripProps } from './trip';
import { TripError } from './trips.errors';

const NOW = new Date('2026-11-08T09:00:00.000Z');
const TOMORROW_8AM = new Date('2026-11-09T08:00:00.000Z');
const YESTERDAY_8AM = new Date('2026-11-07T08:00:00.000Z');

const tripProps: TripProps = {
  id: '0199f5c2-0000-7000-8000-000000000001',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: TOMORROW_8AM,
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '771112233',
  managementCode: 'abc123',
  createdAt: NOW,
  passengerPhones: [],
};

const trip = (props: Partial<TripProps> = {}) => Trip.restore({ ...tripProps, ...props });

const awa = {
  id: '0199f5c2-0000-7000-8000-000000000201',
  bookingCode: 'booking-code-1',
  passengerName: 'Awa',
  passengerPhone: '77 123 45 67',
  now: NOW,
};

describe('Booking', () => {
  it('002-AS1: creates a booking for Awa on an upcoming trip with 3 seats', () => {
    expect(Booking.create({ ...awa, trip: trip() })).toMatchObject({
      id: awa.id,
      tripId: tripProps.id,
      passengerName: 'Awa',
      passengerPhone: '771234567',
      bookingCode: 'booking-code-1',
      createdAt: NOW,
    });
  });

  it('002-AS3: rejects a full trip', () => {
    const book = () =>
      Booking.create({ ...awa, trip: trip({ seats: 1, passengerPhones: ['770000000'] }) });
    expect(book).toThrow(TripError);
    expect(book).toThrow(expect.objectContaining({ code: 'TRIP_FULL', kind: 'CONFLICT' }));
  });

  it.each(['77 123 45 67', '+221771234567'])(
    '002-AS4: rejects a passenger who already booked, booking again as %j',
    (passengerPhone) => {
      const book = () =>
        Booking.create({ ...awa, passengerPhone, trip: trip({ passengerPhones: ['771234567'] }) });
      expect(book).toThrow(
        expect.objectContaining({ code: 'PASSENGER_ALREADY_BOOKED', kind: 'CONFLICT' }),
      );
    },
  );

  it('002-AS5: rejects a departed trip', () => {
    const book = () => Booking.create({ ...awa, trip: trip({ departureAt: YESTERDAY_8AM }) });
    expect(book).toThrow(expect.objectContaining({ code: 'TRIP_DEPARTED', kind: 'CONFLICT' }));
  });
});
