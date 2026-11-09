import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBooking } from '../api/trips.queries';
import { BookingCodeForm } from './booking-code-form';
import { BookingTicket } from './booking-ticket';
import { PageBand } from './page-band';

/**
 * Retrouver sa réservation depuis son téléphone. Sous le bandeau de l'accueil, le supporter saisit
 * son code de réservation, puis voit son billet et où il en est. Le code vit dans l'état de la
 * page, jamais dans son adresse : une adresse se partage et reste dans l'historique.
 */
export function BookingPage() {
  const [bookingCode, setBookingCode] = useState<string>();
  const booking = useBooking(bookingCode);

  /** Le même code, redemandé après un échec, relance la recherche. */
  function search(code: string) {
    if (code === bookingCode) void booking.refetch();
    else setBookingCode(code);
  }

  return (
    <>
      <PageBand title={['Ma', 'réservation']} />
      {/* La colonne et le formulaire de `/publier` : mêmes largeurs, mêmes espacements. */}
      <div data-column="content" className="content-column publish-content">
        {booking.data ? (
          <>
            <BookingTicket booking={booking.data} />
            <Button
              variant="outline"
              size="lg"
              className="thumb-action"
              onClick={() => setBookingCode(undefined)}
            >
              Saisir un autre code
            </Button>
          </>
        ) : (
          <BookingCodeForm pending={booking.isFetching} onSubmit={search}>
            <p role="status" className="publish-status">
              {booking.isFetching && 'Recherche de votre réservation…'}
            </p>
          </BookingCodeForm>
        )}
      </div>
    </>
  );
}
