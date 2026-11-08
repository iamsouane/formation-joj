import { Injectable } from '@nestjs/common';
import { type PublishTripFromMessageInput, publishTripSchema } from '@joj/shared';
import { InvalidInputError } from '../../../../core/errors/invalid-input.error';
import type { Trip } from '../../domain/trip';
import { completeTripDraft, readableMessage } from '../../domain/trip-draft';
import { TripMessageReader } from '../trip-message.reader';
import { PublishTrip } from './publish-trip';

/** Publie le trajet qu'un assistant tire d'une annonce, après les contrôles de la publication. */
@Injectable()
export class PublishTripFromMessage {
  constructor(
    private readonly reader: TripMessageReader,
    private readonly publishTrip: PublishTrip,
  ) {}

  async execute({ message, driverPhone }: PublishTripFromMessageInput): Promise<Trip> {
    const draft = await this.reader.read(readableMessage(message), new Date());
    const { departureAt, ...trip } = completeTripDraft(draft);
    const input = publishTripSchema.safeParse({
      ...trip,
      departureAt: departureAt.toISOString(),
      driverPhone,
    });
    if (!input.success) throw new InvalidInputError(input.error);
    return this.publishTrip.execute(input.data);
  }
}
