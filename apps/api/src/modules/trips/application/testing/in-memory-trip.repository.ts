import type { TripSite } from '@joj/shared';
import { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';

/** Fake fidèle au contrat du port (filtre par site et par heure, tri), pour tester sans base. */
export class InMemoryTripRepository extends TripRepository {
  private readonly rows = new Map<string, Trip>();

  async insert(trip: Trip): Promise<void> {
    this.rows.set(trip.id, clone(trip));
  }

  async listUpcomingBySite(site: TripSite, now: Date): Promise<Trip[]> {
    return [...this.rows.values()]
      .filter((trip) => trip.site === site && trip.departureAt.getTime() > now.getTime())
      .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
      .map(clone);
  }
}

/** Copie : un test ne voit pas une modification qui n'a pas été persistée. */
function clone(trip: Trip): Trip {
  return Trip.restore({
    id: trip.id,
    departurePlace: trip.departurePlace,
    site: trip.site,
    departureAt: trip.departureAt,
    seats: trip.seats,
    pricePerSeat: trip.pricePerSeat,
    driverPhone: trip.driverPhone,
    managementCode: trip.managementCode,
    createdAt: trip.createdAt,
  });
}
