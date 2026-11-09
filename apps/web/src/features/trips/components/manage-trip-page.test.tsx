/**
 * Gérer son trajet depuis son lien de gestion, monté par la route `/trajets/<id>/gestion` sur la
 * fausse API : le trajet que le lien désigne, le code de gestion à saisir, puis l'annulation en
 * deux temps. L'horloge est figée au 8 novembre 2026 à 15 h à Dakar (UTC+0) ; seule `Date` est
 * simulée.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, type StoredBooking, type StoredTrip } from '@/mocks/fixture';
import { renderRoute, trackRequests, writes } from '@/test/utils';

const NOW = new Date('2026-11-08T15:00:00.000Z');

/** Le trajet du scénario : Pikine → Diamniadio, demain à 8 h, 3 places, 1 000 F par place. */
const pikineTomorrow: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000701',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '776543210',
  managementCode: 'k7p2x9w4m1q8',
};

const awaBooking: StoredBooking = {
  id: '0199f5c2-0000-7000-8000-000000000711',
  tripId: pikineTomorrow.id,
  passengerName: 'Awa',
  passengerPhone: '771234567',
  bookingCode: 'AWA-2026',
};

const MANAGEMENT_LINK = `/trajets/${pikineTomorrow.id}/gestion`;

/** La fausse API ne garde que le trajet du scénario, avec ses réservations. */
function seedOnly(trip: StoredTrip, ...bookings: StoredBooking[]) {
  fixture.trips = [{ ...trip }];
  fixture.bookings = bookings.map((booking) => ({ ...booking }));
}

const tripRegion = () => screen.findByRole('region', { name: 'Votre trajet' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ManageTripPage', () => {
  it('007-AS5: shows the trip of the management link, then asks for the code', async () => {
    seedOnly(pikineTomorrow, awaBooking);
    const seen = trackRequests();
    await renderRoute({ initialEntries: [MANAGEMENT_LINK] });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gérer mon trajet' }),
    ).toBeInTheDocument();
    const trip = await tripRegion();

    expect(seen).toEqual([
      { method: 'GET', path: `/api/trips/${pikineTomorrow.id}`, body: undefined },
    ]);
    expect(trip.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Pikine → Diamniadio',
    );
    expect(trip.querySelector('[data-part="ticket-time"]')).toHaveTextContent(
      /08:00\s*lun\. 9 nov\./,
    );
    expect(trip).toHaveTextContent('2 places restantes');
    expect(trip).toHaveTextContent('1 000 FCFA par place');
    // Ni le téléphone du conducteur, ni le code de gestion : la page ne les connaît pas.
    expect(document.body).not.toHaveTextContent(/77\s?654\s?32\s?10/);
    expect(document.body).not.toHaveTextContent(pikineTomorrow.managementCode);
    // Puis le code est demandé.
    expect(within(trip).getByLabelText('Votre code de gestion')).toHaveValue('');
    expect(within(trip).getByRole('button', { name: 'Annuler mon trajet' })).toBeEnabled();
  });

  it('007-AS5: says a cancelled trip is already cancelled, without asking for the code', async () => {
    seedOnly({ ...pikineTomorrow, cancelledAt: '2026-11-08T12:00:00.000Z' });
    const seen = trackRequests();
    await renderRoute({ initialEntries: [MANAGEMENT_LINK] });

    const trip = await tripRegion();

    expect(trip.querySelector('[data-part="trip-status"]')).toHaveTextContent(
      'Ce trajet est déjà annulé',
    );
    expect(trip.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Pikine → Diamniadio',
    );
    // Le champ du code est absent, et rien ne permet d'annuler de nouveau.
    expect(screen.queryByLabelText('Votre code de gestion')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annuler mon trajet' })).toBeNull();
    expect(writes(seen)).toEqual([]);
  });

  it('007-AS6: cancels the trip with its management code after a confirmation', async () => {
    seedOnly(pikineTomorrow);
    const user = userEvent.setup();
    const seen = trackRequests();
    const { router } = await renderRoute({ initialEntries: ['/?site=diamniadio'] });
    expect(
      within(await screen.findByRole('list', { name: 'Départs vers Diamniadio' })).getByRole(
        'listitem',
      ),
    ).toHaveTextContent('Pikine → Diamniadio');

    await router.navigate({
      to: '/trajets/$tripId/gestion',
      params: { tripId: pikineTomorrow.id },
    });
    const trip = await tripRegion();
    await user.type(within(trip).getByLabelText('Votre code de gestion'), 'k7p2x9w4m1q8');

    // Premier temps : choisir d'annuler ouvre la confirmation, et rien ne part.
    await user.click(within(trip).getByRole('button', { name: 'Annuler mon trajet' }));
    const confirmation = await screen.findByRole('alertdialog', { name: 'Annuler votre trajet ?' });
    expect(writes(seen)).toEqual([]);

    // Renoncer garde le trajet, et le code saisi.
    await user.click(within(confirmation).getByRole('button', { name: 'Garder mon trajet' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(writes(seen)).toEqual([]);
    expect(within(trip).getByLabelText('Votre code de gestion')).toHaveValue('k7p2x9w4m1q8');

    // Second temps : confirmer annule, une seule fois.
    await user.click(within(trip).getByRole('button', { name: 'Annuler mon trajet' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Oui, annuler' }),
    );

    await waitFor(() =>
      expect(trip.querySelector('[data-part="trip-status"]')).toHaveTextContent(
        'Votre trajet est annulé',
      ),
    );
    // Le code part dans le corps de la demande : jamais dans une adresse, ni celle de l'API ni
    // celle de la page.
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: `/api/trips/${pikineTomorrow.id}/cancellation`,
        body: { managementCode: 'k7p2x9w4m1q8' },
      },
    ]);
    expect(seen.map((request) => request.path).join(' ')).not.toContain('k7p2x9w4m1q8');
    expect(router.state.location.href).not.toContain('k7p2x9w4m1q8');
    expect(screen.queryByLabelText('Votre code de gestion')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annuler mon trajet' })).toBeNull();

    // Le trajet a quitté les départs vers Diamniadio.
    await router.navigate({ to: '/', search: { site: 'diamniadio' } });
    expect(
      await screen.findByRole('region', { name: 'Aucun départ pour l’instant vers Diamniadio' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Départs vers Diamniadio' })).toBeNull();
  });
});
