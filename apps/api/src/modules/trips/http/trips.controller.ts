import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
  bookSeatSchema,
  type PublishedTripResponse,
  publishedTripSchema,
  publishTripSchema,
  type TripResponse,
  tripIdParamSchema,
  tripSchema,
  upcomingTripsQuerySchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { BookSeat } from '../application/use-cases/book-seat';
import { ListUpcomingTrips } from '../application/use-cases/list-upcoming-trips';
import { PublishTrip } from '../application/use-cases/publish-trip';
import type { Trip } from '../domain/trip';

class PublishTripDto extends createZodDto(publishTripSchema) {}
class UpcomingTripsQueryDto extends createZodDto(upcomingTripsQuerySchema) {}
class TripDto extends createZodDto(tripSchema) {}
class PublishedTripDto extends createZodDto(publishedTripSchema) {}
class TripIdParamDto extends createZodDto(tripIdParamSchema) {}
class BookSeatDto extends createZodDto(bookSeatSchema) {}
class BookingConfirmationDto extends createZodDto(bookingConfirmationSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTrip,
    private readonly listUpcomingTrips: ListUpcomingTrips,
    private readonly bookSeat: BookSeat,
  ) {}

  /** Les trajets à venir vers un site, sans le téléphone du conducteur ni le code de gestion. */
  @Get()
  @ZodSerializerDto([TripDto])
  async list(@Query() { site }: UpcomingTripsQueryDto): Promise<TripResponse[]> {
    return (await this.listUpcomingTrips.execute(site)).map(toResponse);
  }

  /** Le trajet publié et son code de gestion, remis au seul conducteur. */
  @Post()
  @ZodSerializerDto(PublishedTripDto)
  async publish(@Body() body: PublishTripDto): Promise<PublishedTripResponse> {
    const trip = await this.publishTrip.execute(body);
    return { ...toResponse(trip), managementCode: trip.managementCode };
  }

  /** Le code de réservation et le téléphone du conducteur, remis au seul supporter qui réserve. */
  @Post(':tripId/bookings')
  @ZodSerializerDto(BookingConfirmationDto)
  async book(
    @Param() { tripId }: TripIdParamDto,
    @Body() body: BookSeatDto,
  ): Promise<BookingConfirmationResponse> {
    const { booking, driverPhone } = await this.bookSeat.execute(tripId, body);
    return { bookingCode: booking.bookingCode, driverPhone };
  }
}

function toResponse(trip: Trip): TripResponse {
  return {
    id: trip.id,
    departurePlace: trip.departurePlace,
    site: trip.site,
    departureAt: trip.departureAt.toISOString(),
    seats: trip.seats,
    remainingSeats: trip.remainingSeats,
    pricePerSeat: trip.pricePerSeat,
  };
}
