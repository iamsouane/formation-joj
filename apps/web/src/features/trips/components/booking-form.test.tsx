/**
 * Réserver une place depuis l'accueil, monté par la route `/` sur la fausse API : le formulaire
 * du trajet choisi, ce qui part sur le réseau, puis la confirmation.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fixture, pikineToDiamniadio } from '@/mocks/fixture';
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
});
