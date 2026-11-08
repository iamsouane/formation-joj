// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm.
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { trips } from './trips.schema';

export const BOOKINGS_TRIP_PASSENGER_PHONE_KEY = 'bookings_trip_passenger_phone_key';
export const BOOKINGS_BOOKING_CODE_KEY = 'bookings_booking_code_key';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey(),
    // Une réservation porte sur un trajet qui existe.
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    passengerName: varchar('passenger_name', { length: 100 }).notNull(),
    // Téléphone normalisé par le domaine : c'est lui que compare l'unicité ci-dessous.
    passengerPhone: varchar('passenger_phone', { length: 20 }).notNull(),
    bookingCode: varchar('booking_code', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  (table) => [
    // Un même téléphone ne réserve pas deux fois un trajet (002-AS4) ; sert aussi à compter.
    uniqueIndex(BOOKINGS_TRIP_PASSENGER_PHONE_KEY).on(table.tripId, table.passengerPhone),
    // Un code désigne une seule réservation (consultation et annulation en TR3).
    uniqueIndex(BOOKINGS_BOOKING_CODE_KEY).on(table.bookingCode),
  ],
);

export type BookingRow = typeof bookings.$inferSelect;
