import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type BookingConfirmationResponse,
  bookingConfirmationSchema,
  bookSeatSchema,
  cancelTripSchema,
  type PublishedTripResponse,
  publishedTripSchema,
  publishTripFromMessageSchema,
  publishTripSchema,
  type TripDetailsResponse,
  tripDetailsSchema,
  type TripResponse,
  tripIdParamSchema,
  tripSchema,
  upcomingTripsQuerySchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { BookSeat } from '../application/use-cases/book-seat';
import { CancelTrip } from '../application/use-cases/cancel-trip';
import { GetTrip } from '../application/use-cases/get-trip';
import { ListUpcomingTrips } from '../application/use-cases/list-upcoming-trips';
import { PublishTrip } from '../application/use-cases/publish-trip';
import { PublishTripFromMessage } from '../application/use-cases/publish-trip-from-message';
import type { Trip } from '../domain/trip';

class PublishTripDto extends createZodDto(publishTripSchema) {}
class PublishTripFromMessageDto extends createZodDto(publishTripFromMessageSchema) {}
class UpcomingTripsQueryDto extends createZodDto(upcomingTripsQuerySchema) {}
class TripDto extends createZodDto(tripSchema) {}
class TripDetailsDto extends createZodDto(tripDetailsSchema) {}
class PublishedTripDto extends createZodDto(publishedTripSchema) {}
class TripIdParamDto extends createZodDto(tripIdParamSchema) {}
class BookSeatDto extends createZodDto(bookSeatSchema) {}
class BookingConfirmationDto extends createZodDto(bookingConfirmationSchema) {}
class CancelTripDto extends createZodDto(cancelTripSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTrip,
    private readonly publishTripFromMessage: PublishTripFromMessage,
    private readonly listUpcomingTrips: ListUpcomingTrips,
    private readonly getTrip: GetTrip,
    private readonly bookSeat: BookSeat,
    private readonly cancelTrip: CancelTrip,
  ) {}

  /** Les trajets à venir vers un site, sans le téléphone du conducteur ni le code de gestion. */
  @Get()
  @ZodSerializerDto([TripDto])
  async list(@Query() { site }: UpcomingTripsQueryDto): Promise<TripResponse[]> {
    return (await this.listUpcomingTrips.execute(site)).map(toResponse);
  }

  /**
   * Un trajet lu par son identifiant, celui de son lien de gestion : ce que la liste en montre, et
   * s'il est annulé. Jamais le téléphone du conducteur ni le code de gestion.
   */
  @Get(':tripId')
  @ZodSerializerDto(TripDetailsDto)
  async show(@Param() { tripId }: TripIdParamDto): Promise<TripDetailsResponse> {
    const trip = await this.getTrip.execute(tripId);
    return { ...toResponse(trip), cancelled: trip.isCancelled };
  }

  /** Le trajet publié et son code de gestion, remis au seul conducteur. */
  @Post()
  @ZodSerializerDto(PublishedTripDto)
  async publish(@Body() body: PublishTripDto): Promise<PublishedTripResponse> {
    const trip = await this.publishTrip.execute(body);
    return { ...toResponse(trip), managementCode: trip.managementCode };
  }

  /** Le trajet compris dans l'annonce du conducteur, publié après les contrôles de TR1, et son code de gestion. */
  @Post('from-message')
  @ZodSerializerDto(PublishedTripDto)
  async publishFromMessage(
    @Body() body: PublishTripFromMessageDto,
  ): Promise<PublishedTripResponse> {
    const trip = await this.publishTripFromMessage.execute(body);
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

  /** Annule le trajet avec son code de gestion, passé dans le corps pour rester hors des journaux. */
  @Post(':tripId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param() { tripId }: TripIdParamDto, @Body() body: CancelTripDto): Promise<void> {
    await this.cancelTrip.execute(tripId, body);
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
