import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBooking, useCancelBooking } from '../api/trips.queries';
import { BookingCodeForm } from './booking-code-form';
import { BookingTicket } from './booking-ticket';
import { codeErrorMessage } from './code-error-message';
import { ConfirmCancellation } from './confirm-cancellation';
import { PageBand } from './page-band';
import { bookingShareText } from './whatsapp-share';
import { WhatsappShareLink } from './whatsapp-share-link';

/**
 * Retrouver sa réservation depuis son téléphone. Sous le bandeau de l'accueil, le supporter saisit
 * son code de réservation, puis voit son billet et où il en est ; tant que sa réservation est
 * active, il peut envoyer son billet sur WhatsApp et l'annuler, après confirmation. Le code vit dans l'état de la
 * page, jamais dans son adresse : une adresse se partage et reste dans l'historique. Chaque refus
 * (code inconnu, annulation refusée) se lit en français, là où il s'est produit.
 */
export function BookingPage() {
  const [bookingCode, setBookingCode] = useState<string>();
  const booking = useBooking(bookingCode);
  const cancellation = useCancelBooking();

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
            <BookingTicket booking={booking.data}>
              {booking.data.status === 'active' && (
                <WhatsappShareLink
                  message={bookingShareText({
                    trip: booking.data.trip,
                    bookingCode: booking.data.bookingCode,
                    driverPhone: booking.data.trip.driverPhone,
                  })}
                />
              )}
              {booking.data.status === 'active' && (
                <ConfirmCancellation
                  trigger="Annuler ma réservation"
                  title="Annuler votre réservation ?"
                  description="Votre place sera proposée à un autre supporter. Une annulation est définitive."
                  keep="Garder ma réservation"
                  pending={cancellation.isPending}
                  onConfirm={() => cancellation.mutate(booking.data.bookingCode)}
                />
              )}
              {cancellation.isError && (
                <p role="alert" className="font-semibold text-destructive">
                  {codeErrorMessage(cancellation.error)}
                </p>
              )}
            </BookingTicket>
            <Button
              variant="outline"
              size="lg"
              className="thumb-action"
              onClick={() => {
                // Le refus d'une annulation appartient au billet que l'on quitte.
                cancellation.reset();
                setBookingCode(undefined);
              }}
            >
              Saisir un autre code
            </Button>
          </>
        ) : (
          <BookingCodeForm
            pending={booking.isFetching}
            onSubmit={search}
            // Pendant une nouvelle recherche, le refus de la précédente ne s'affiche plus.
            error={booking.isError && !booking.isFetching ? booking.error : undefined}
            onEdit={() => {
              if (booking.isError) setBookingCode(undefined);
            }}
          >
            <p role="status" className="publish-status">
              {booking.isFetching && 'Recherche de votre réservation…'}
            </p>
          </BookingCodeForm>
        )}
      </div>
    </>
  );
}
