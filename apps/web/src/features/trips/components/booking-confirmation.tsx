import type { BookingConfirmationResponse, TripResponse } from '@joj/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { ConfettiRain } from './confetti-rain';
import { FlameCelebration } from './flame-celebration';
import { formatDeparture, formatPhone, phoneHref } from './format';

interface BookingConfirmationProps {
  trip: TripResponse;
  confirmation: BookingConfirmationResponse;
  onDone: () => void;
}

/** La place est réservée : le code à garder, et le conducteur à appeler pour le rendez-vous. */
export function BookingConfirmation({ trip, confirmation, onDone }: BookingConfirmationProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="relative flex flex-col gap-4 overflow-hidden border-2 border-foreground p-4"
    >
      <ConfettiRain />
      <FlameCelebration />
      <h2 id={titleId} className="text-2xl font-bold">
        Place réservée
      </h2>
      <p>
        {trip.departurePlace}, {formatDeparture(trip.departureAt)}
      </p>
      <div className="flex flex-col gap-1">
        <span className="text-sm">Votre code de réservation</span>
        <strong className="text-3xl tracking-wider select-all">{confirmation.bookingCode}</strong>
        <span className="text-sm">Gardez ce code : il identifie votre réservation.</span>
      </div>
      <p>
        Appelez le conducteur pour fixer le point de rendez-vous :{' '}
        <a href={phoneHref(confirmation.driverPhone)} className="font-bold underline">
          {formatPhone(confirmation.driverPhone)}
        </a>
      </p>
      <Button variant="outline" onClick={onDone} className="self-start">
        Voir les autres départs
      </Button>
    </section>
  );
}
