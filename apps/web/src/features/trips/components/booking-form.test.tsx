/**
 * Réserver une place depuis l'accueil, monté par la route `/` sur la fausse API : le formulaire
 * du trajet choisi, ce qui part sur le réseau, puis la confirmation.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, pikineToDiamniadio } from '@/mocks/fixture';
import { problem } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { renderRoute, trackRequests, writes } from '@/test/utils';

async function openBookingForm(departurePlace: string) {
  const user = userEvent.setup();
  const seen = trackRequests();
  await renderRoute({ initialEntries: ['/?site=diamniadio'] });
  await user.click(
    await screen.findByRole('button', { name: `Réserver une place depuis ${departurePlace}` }),
  );
  const form = screen.getByRole('form', { name: `Réserver depuis ${departurePlace}` });
  return { user, seen, form };
}

describe('BookingForm', () => {
  it('005-AS4: books a seat and shows the code, the driver phone and the flame mascot', async () => {
    const { user, seen, form } = await openBookingForm('Pikine');

    await user.type(within(form).getByLabelText('Votre nom'), 'Awa');
    await user.type(within(form).getByLabelText('Votre téléphone'), '77 123 45 67');
    await user.click(within(form).getByRole('button', { name: 'Confirmer la réservation' }));

    const confirmation = await screen.findByRole('region', { name: 'Place réservée' });
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: `/api/trips/${pikineToDiamniadio.id}/bookings`,
        body: { passengerName: 'Awa', passengerPhone: '77 123 45 67' },
      },
    ]);
    const { bookingCode } = fixture.bookings.at(-1)!;
    expect(within(confirmation).getByText(bookingCode)).toBeInTheDocument();
    expect(confirmation).toHaveTextContent('Gardez ce code');
    expect(within(confirmation).getByRole('link', { name: /77 123 45 67/ })).toHaveAttribute(
      'href',
      'tel:+221771234567',
    );
    expect(
      within(confirmation).getByRole('img', { name: 'La mascotte des JOJ saute de joie' }),
    ).toBeInTheDocument();
  });

  it('005-AS4: fits the thumb: full-width actions and phone-friendly fields', async () => {
    const { form } = await openBookingForm('Pikine');

    // Les actions principales prennent toute la largeur d'un téléphone (la classe le décide en CSS).
    expect(
      screen.getByRole('button', { name: 'Annuler : ne pas réserver depuis Pikine' }),
    ).toHaveClass('thumb-action');
    expect(within(form).getByRole('button', { name: 'Confirmer la réservation' })).toHaveClass(
      'thumb-action',
    );
    // Le clavier du téléphone propose le bon pavé et le bon remplissage automatique.
    expect(within(form).getByLabelText('Votre nom')).toHaveAttribute('autocomplete', 'name');
    const phone = within(form).getByLabelText('Votre téléphone');
    expect(phone).toHaveAttribute('type', 'tel');
    expect(phone).toHaveAttribute('inputmode', 'tel');
    expect(phone).toHaveAttribute('autocomplete', 'tel');
  });

  /** La fausse API refuse la prochaine réservation avec ce statut et ce code. */
  function refuseBooking(status: number, code: string) {
    server.use(
      http.post('*/api/trips/:tripId/bookings', () => problem(status, code, 'Refused.'), {
        once: true,
      }),
    );
  }

  async function bookAsAwa() {
    const { user, form } = await openBookingForm('Pikine');
    await user.type(within(form).getByLabelText('Votre nom'), 'Awa');
    await user.type(within(form).getByLabelText('Votre téléphone'), '77 123 45 67');
    await user.click(within(form).getByRole('button', { name: 'Confirmer la réservation' }));
    return form;
  }

  it.each([
    [409, 'TRIP_FULL', 'Ce trajet est complet.'],
    [409, 'PASSENGER_ALREADY_BOOKED', 'Vous avez déjà réservé ce trajet.'],
    [409, 'TRIP_DEPARTED', 'Ce trajet est déjà parti.'],
    [409, 'TRIP_CANCELLED', 'Ce trajet a été annulé.'],
    [400, 'VALIDATION_FAILED', 'Vérifiez votre nom et votre téléphone.'],
    [404, 'TRIP_NOT_FOUND', 'Une erreur est survenue, réessayez.'],
    [500, 'INTERNAL_ERROR', 'Une erreur est survenue, réessayez.'],
  ])('005-AS5: explains a %i %s refusal in French', async (status, code, message) => {
    refuseBooking(status, code);
    const form = await bookAsAwa();

    expect(await within(form).findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('region', { name: 'Place réservée' })).not.toBeInTheDocument();
  });

  it('005-AS5: explains a real refusal of the fake API, a second booking with the same phone', async () => {
    fixture.bookings.push({
      id: '0199f5c2-0000-7000-8000-000000000299',
      tripId: pikineToDiamniadio.id,
      passengerName: 'Awa',
      passengerPhone: '771234567',
      bookingCode: 'awa-booking',
    });
    const form = await bookAsAwa();

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Vous avez déjà réservé ce trajet.',
    );
  });

  describe('celebration', () => {
    function prefersReducedMotion(reduce: boolean) {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: reduce && query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    }

    async function bookAndConfirm() {
      await bookAsAwa();
      return screen.findByRole('region', { name: 'Place réservée' });
    }

    afterEach(() => vi.unstubAllGlobals());

    it('005-AS4: celebrates the booking with a rain of confetti, none on reduced motion', async () => {
      prefersReducedMotion(false);
      const confirmation = await bookAndConfirm();

      const rain = confirmation.querySelector('[data-part="confetti-rain"]');
      expect(rain).toHaveAttribute('aria-hidden', 'true');
      expect(rain?.children.length).toBeGreaterThanOrEqual(12);
      expect(
        within(confirmation).getByRole('img', { name: 'La mascotte des JOJ saute de joie' }),
      ).toHaveAttribute('data-motion', 'full');
    });

    it('005-AS4: shows the flame mascot still and no confetti on reduced motion', async () => {
      prefersReducedMotion(true);
      const confirmation = await bookAndConfirm();

      expect(confirmation.querySelector('[data-part="confetti-rain"]')).toBeNull();
      expect(
        within(confirmation).getByRole('img', { name: 'La mascotte des JOJ saute de joie' }),
      ).toHaveAttribute('data-motion', 'reduced');
    });
  });
});
