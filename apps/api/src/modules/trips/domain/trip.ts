import { TRIP_SITES, type TripSite } from '@joj/shared';
import { normalisePhone } from './phone';
import { TripError } from './trips.errors';

export interface TripProps {
  id: string;
  departurePlace: string;
  site: TripSite;
  departureAt: Date;
  seats: number;
  pricePerSeat: number;
  driverPhone: string;
  managementCode: string;
  createdAt: Date;
  /** Les téléphones normalisés des supporters qui ont réservé ce trajet. */
  passengerPhones: readonly string[];
}

/** Ce que la persistance relit ; un trajet sans réservation peut omettre `passengerPhones`. */
export type StoredTrip = Omit<TripProps, 'passengerPhones'> &
  Partial<Pick<TripProps, 'passengerPhones'>>;

export interface NewTrip extends Omit<TripProps, 'site' | 'createdAt' | 'passengerPhones'> {
  /** Vérifié ici : le domaine ne fait pas confiance à la validation HTTP. */
  site: string;
  now: Date;
}

/** Un trajet publié par un conducteur vers un site des JOJ, qui part après sa publication. */
export class Trip {
  private constructor(private readonly props: TripProps) {}

  static create({ now, ...trip }: NewTrip): Trip {
    return new Trip({
      ...trip,
      site: parseTripSite(trip.site),
      driverPhone: normalisePhone(trip.driverPhone),
      departureAt: upcomingDeparture(trip.departureAt, now),
      createdAt: now,
      passengerPhones: [],
    });
  }

  /** Reconstruit un trajet depuis la persistance, sans rejouer les règles de création. */
  static restore({ passengerPhones = [], ...props }: StoredTrip): Trip {
    return new Trip({ ...props, passengerPhones: [...passengerPhones] });
  }

  get id(): string {
    return this.props.id;
  }

  get departurePlace(): string {
    return this.props.departurePlace;
  }

  get site(): TripSite {
    return this.props.site;
  }

  get departureAt(): Date {
    return this.props.departureAt;
  }

  get seats(): number {
    return this.props.seats;
  }

  get pricePerSeat(): number {
    return this.props.pricePerSeat;
  }

  get driverPhone(): string {
    return this.props.driverPhone;
  }

  get managementCode(): string {
    return this.props.managementCode;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get passengerPhones(): readonly string[] {
    return this.props.passengerPhones;
  }

  get remainingSeats(): number {
    return this.props.seats - this.props.passengerPhones.length;
  }

  /** `phone` est déjà normalisé. */
  hasPassenger(phone: string): boolean {
    return this.props.passengerPhones.includes(phone);
  }
}

/** Lit un site saisi (« Diamniadio », « DAKAR ») : espaces retirés, minuscules, puis la liste fermée. */
export function parseTripSite(site: string): TripSite {
  const normalised = site.trim().toLowerCase();
  const known = TRIP_SITES.find((candidate) => candidate === normalised);
  if (known === undefined) {
    throw new TripError('SITE_UNKNOWN', `Unknown site ${site}`, { site, allowed: TRIP_SITES });
  }
  return known;
}

function upcomingDeparture(departureAt: Date, now: Date): Date {
  if (departureAt.getTime() <= now.getTime()) {
    throw new TripError('DEPARTURE_IN_PAST', 'A trip cannot depart in the past', {
      departureAt: departureAt.toISOString(),
    });
  }
  return departureAt;
}
