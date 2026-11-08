import { tripSchema } from '@joj/shared';
import { Trip } from '../domain/trip';
import type { TripRow } from './trips.schema';

/** Ligne de la table → entité. Un site inconnu en base est un bug : on échoue tôt. */
export function toDomain(row: TripRow): Trip {
  return Trip.restore({ ...row, site: tripSchema.shape.site.parse(row.site) });
}

/** Entité → ligne de la table. */
export function toRow(trip: Trip): TripRow {
  return {
    id: trip.id,
    departurePlace: trip.departurePlace,
    site: trip.site,
    departureAt: trip.departureAt,
    seats: trip.seats,
    pricePerSeat: trip.pricePerSeat,
    driverPhone: trip.driverPhone,
    managementCode: trip.managementCode,
    createdAt: trip.createdAt,
  };
}
