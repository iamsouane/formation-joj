// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm.
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const TRIPS_MANAGEMENT_CODE_KEY = 'trips_management_code_key';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey(),
    departurePlace: varchar('departure_place', { length: 100 }).notNull(),
    // La liste des sites est vérifiée par le domaine (TRIP_SITES).
    site: varchar('site', { length: 20 }).notNull(),
    // Le refus d'un départ passé est vérifié par le domaine. Précision milliseconde = Date.
    departureAt: timestamp('departure_at', { withTimezone: true, precision: 3 }).notNull(),
    seats: integer('seats').notNull(),
    pricePerSeat: integer('price_per_seat').notNull(),
    driverPhone: varchar('driver_phone', { length: 20 }).notNull(),
    managementCode: varchar('management_code', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  (table) => [
    // Un code de gestion désigne un seul trajet (annulation en TR3).
    uniqueIndex(TRIPS_MANAGEMENT_CODE_KEY).on(table.managementCode),
    // Sert la liste des départs à venir d'un site, triés par heure.
    index('trips_site_departure_at_idx').on(table.site, table.departureAt),
  ],
);

export type TripRow = typeof trips.$inferSelect;
