import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  bookingCodeParamSchema,
  type BookingDetailsResponse,
  bookingDetailsSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { CancelBooking } from '../application/use-cases/cancel-booking';
import { type BookingDetails, GetBooking } from '../application/use-cases/get-booking';

class BookingCodeParamDto extends createZodDto(bookingCodeParamSchema) {}
class BookingDetailsDto extends createZodDto(bookingDetailsSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly getBooking: GetBooking,
    private readonly cancelBooking: CancelBooking,
  ) {}

  /** La réservation, son statut et son trajet, avec le téléphone du conducteur. */
  @Get(':bookingCode')
  @ZodSerializerDto(BookingDetailsDto)
  async show(@Param() { bookingCode }: BookingCodeParamDto): Promise<BookingDetailsResponse> {
    return toResponse(await this.getBooking.execute(bookingCode));
  }

  /** Annule la réservation : sa place redevient disponible. */
  @Post(':bookingCode/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param() { bookingCode }: BookingCodeParamDto): Promise<void> {
    await this.cancelBooking.execute(bookingCode);
  }
}

function toResponse({ booking, trip, status }: BookingDetails): BookingDetailsResponse {
  return {
    bookingCode: booking.bookingCode,
    passengerName: booking.passengerName,
    status,
    trip: {
      id: trip.id,
      departurePlace: trip.departurePlace,
      site: trip.site,
      departureAt: trip.departureAt.toISOString(),
      pricePerSeat: trip.pricePerSeat,
      driverPhone: trip.driverPhone,
    },
  };
}
