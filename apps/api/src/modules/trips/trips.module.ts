import { Module } from '@nestjs/common';
import { TripRepository } from './application/trip.repository';
import { BookSeat } from './application/use-cases/book-seat';
import { ListUpcomingTrips } from './application/use-cases/list-upcoming-trips';
import { PublishTrip } from './application/use-cases/publish-trip';
import { TripsController } from './http/trips.controller';
import { DrizzleTripRepository } from './infra/drizzle-trip.repository';

@Module({
  controllers: [TripsController],
  providers: [
    // Le port (classe abstraite) est relié ici à son implémentation Drizzle.
    { provide: TripRepository, useClass: DrizzleTripRepository },
    PublishTrip,
    ListUpcomingTrips,
    BookSeat,
  ],
})
export class TripsModule {}
