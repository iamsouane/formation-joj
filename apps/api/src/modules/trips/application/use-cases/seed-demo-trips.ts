import { randomUUID } from 'node:crypto';
import type { TripSite } from '@joj/shared';
import { Booking } from '../../domain/booking';
import { Trip } from '../../domain/trip';
import { TripRepository } from '../trip.repository';
import { newBookingCode } from './book-seat';
import { newManagementCode } from './publish-trip';

interface DemoTrip {
  departurePlace: string;
  site: TripSite;
  /** Le départ, relatif au jour du chargement : dans `inDays` jours, à cette heure de Dakar. */
  inDays: number;
  hour: number;
  minute: number;
  seats: number;
  pricePerSeat: number;
  /** Les places déjà réservées, par des supporters de démonstration. */
  booked: number;
}

/**
 * Les trajets de démonstration : des départs réalistes vers les trois sites, de demain à dans
 * trois jours, certains déjà en partie réservés, un complet, d'autres encore vides.
 */
const DEMO_TRIPS: readonly DemoTrip[] = [
  trip('Keur Massar', 'dakar', { inDays: 1, hour: 7, minute: 30 }, 3, 1500, 1),
  trip('Pikine', 'diamniadio', { inDays: 1, hour: 8, minute: 0 }, 3, 1000, 1),
  trip('Mbour', 'saly', { inDays: 1, hour: 10, minute: 0 }, 3, 500, 0),
  trip('Thiès', 'dakar', { inDays: 1, hour: 14, minute: 0 }, 4, 2500, 2),
  trip('Guédiawaye', 'diamniadio', { inDays: 1, hour: 17, minute: 0 }, 4, 1000, 0),
  trip('Dakar Plateau', 'saly', { inDays: 2, hour: 7, minute: 0 }, 4, 3000, 1),
  trip('Rufisque', 'diamniadio', { inDays: 2, hour: 9, minute: 0 }, 2, 500, 2),
  trip('Thiès', 'saly', { inDays: 3, hour: 8, minute: 0 }, 3, 2000, 0),
];

/** Des supporters et des numéros fictifs : aucun ne désigne une vraie personne. */
const DEMO_PASSENGERS = [
  { passengerName: 'Awa', passengerPhone: '76 000 02 01' },
  { passengerName: 'Moussa', passengerPhone: '76 000 02 02' },
] as const;

function trip(
  departurePlace: string,
  site: TripSite,
  when: Pick<DemoTrip, 'inDays' | 'hour' | 'minute'>,
  seats: number,
  pricePerSeat: number,
  booked: number,
): DemoTrip {
  return { departurePlace, site, ...when, seats, pricePerSeat, booked };
}

/** Dakar vit à UTC+0 : « demain 8 h » est demain à 8 h UTC. */
function departureOf({ inDays, hour, minute }: DemoTrip, now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + inDays, hour, minute),
  );
}

/**
 * Charge les trajets de démonstration, seulement dans une base sans aucun trajet : une base déjà
 * utilisée n'est jamais touchée. Les trajets et leurs réservations passent par `create()`, comme
 * ceux d'un vrai conducteur et d'un vrai supporter : les règles métier s'appliquent.
 */
export class SeedDemoTrips {
  constructor(private readonly trips: TripRepository) {}

  /** Renvoie le nombre de trajets créés : 0 si la base en contenait déjà un. */
  async execute(now: Date = new Date()): Promise<number> {
    if (await this.trips.hasTrips()) return 0;
    for (const [index, demo] of DEMO_TRIPS.entries()) {
      await this.publish(demo, index, now);
    }
    return DEMO_TRIPS.length;
  }

  private async publish(demo: DemoTrip, index: number, now: Date): Promise<void> {
    const published = Trip.create({
      id: randomUUID(),
      departurePlace: demo.departurePlace,
      site: demo.site,
      departureAt: departureOf(demo, now),
      seats: demo.seats,
      pricePerSeat: demo.pricePerSeat,
      // Un numéro fictif par conducteur de démonstration.
      driverPhone: `77 000 01 0${index + 1}`,
      managementCode: newManagementCode(),
      now,
    });
    await this.trips.insert(published);
    for (const passenger of DEMO_PASSENGERS.slice(0, demo.booked)) {
      await this.trips.reserve(published.id, (stored) =>
        Booking.create({
          ...passenger,
          trip: stored,
          id: randomUUID(),
          bookingCode: newBookingCode(),
          now,
        }),
      );
    }
  }
}
