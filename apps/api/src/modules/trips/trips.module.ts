import { Module } from '@nestjs/common';
import { TripMessageReader } from './application/trip-message.reader';
import { TripRepository } from './application/trip.repository';
import { BookSeat } from './application/use-cases/book-seat';
import { CancelBooking } from './application/use-cases/cancel-booking';
import { CancelTrip } from './application/use-cases/cancel-trip';
import { GetBooking } from './application/use-cases/get-booking';
import { GetTrip } from './application/use-cases/get-trip';
import { ListUpcomingTrips } from './application/use-cases/list-upcoming-trips';
import { PublishTrip } from './application/use-cases/publish-trip';
import { PublishTripFromMessage } from './application/use-cases/publish-trip-from-message';
import { BookingsController } from './http/bookings.controller';
import { TripsController } from './http/trips.controller';
import { ClaudeTripMessageReader } from './infra/claude-trip-message-reader';
import { DrizzleTripRepository } from './infra/drizzle-trip.repository';

@Module({
  controllers: [TripsController, BookingsController],
  providers: [
    // Le port (classe abstraite) est relié ici à son implémentation Drizzle.
    { provide: TripRepository, useClass: DrizzleTripRepository },
    // L'assistant qui lit les annonces : Claude, remplacé par un faux dans les tests.
    { provide: TripMessageReader, useClass: ClaudeTripMessageReader },
    PublishTrip,
    PublishTripFromMessage,
    ListUpcomingTrips,
    GetTrip,
    BookSeat,
    GetBooking,
    CancelBooking,
    CancelTrip,
  ],
})
export class TripsModule {}
