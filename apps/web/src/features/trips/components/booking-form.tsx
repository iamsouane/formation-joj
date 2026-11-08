import type { BookingConfirmationResponse, TripResponse } from '@joj/shared';
import { type FormEvent, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBookSeat } from '../api/trips.queries';

interface BookingFormProps {
  trip: TripResponse;
  onBooked: (confirmation: BookingConfirmationResponse) => void;
}

/** Le nom et le téléphone du supporter, puis la réservation d'une place sur ce trajet. */
export function BookingForm({ trip, onBooked }: BookingFormProps) {
  const bookSeat = useBookSeat();
  const nameId = useId();
  const phoneId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    bookSeat.mutate(
      {
        tripId: trip.id,
        input: {
          passengerName: String(data.get('passengerName') ?? ''),
          passengerPhone: String(data.get('passengerPhone') ?? ''),
        },
      },
      { onSuccess: onBooked },
    );
  }

  return (
    <form
      aria-label={`Réserver depuis ${trip.departurePlace}`}
      onSubmit={submit}
      className="mt-3 flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Votre nom</Label>
        <Input id={nameId} name="passengerName" autoComplete="name" className="h-11" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={phoneId}>Votre téléphone</Label>
        <Input
          id={phoneId}
          name="passengerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="h-11"
        />
      </div>
      <Button type="submit" size="lg" disabled={bookSeat.isPending}>
        Confirmer la réservation
      </Button>
    </form>
  );
}
