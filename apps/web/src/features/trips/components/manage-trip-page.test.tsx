/**
 * Gérer son trajet depuis son lien de gestion, monté par la route `/trajets/<id>/gestion` sur la
 * fausse API : le trajet que le lien désigne, le code de gestion à saisir, puis l'annulation en
 * deux temps. L'horloge est figée au 8 novembre 2026 à 15 h à Dakar (UTC+0) ; seule `Date` est
 * simulée.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from 'msw';
import { fixture, type StoredBooking, type StoredTrip } from '@/mocks/fixture';
import { problem } from '@/mocks/handlers';
import { server } from '@/mocks/node';
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

  it.each([
    ['unknown', '/trajets/0199f5c2-0000-7000-8000-0000000000ff/gestion'],
    ['malformed', '/trajets/pas-un-identifiant/gestion'],
  ])(
    '007-AS7: says a management link that designates no trip is not found (%s link)',
    async (_kind, link) => {
      seedOnly(pikineTomorrow);
      const seen = trackRequests();
      await renderRoute({ initialEntries: [link] });

      // Dès l'ouverture, avant toute saisie : aucun code n'est demandé.
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Ce trajet est introuvable. Vérifiez votre lien de gestion.',
      );
      expect(screen.queryByRole('region', { name: 'Votre trajet' })).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(writes(seen)).toEqual([]);
    },
  );

  it('007-AS7: explains each refusal of the management link and code in French', async () => {
    seedOnly(pikineTomorrow);
    const user = userEvent.setup();
    const seen = trackRequests();
    const { router } = await renderRoute({ initialEntries: [MANAGEMENT_LINK] });
    const trip = await tripRegion();
    const code = within(trip).getByLabelText('Votre code de gestion');
    const alert = (message: string) =>
      waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(message));
    /** Demande l'annulation, puis la confirme. */
    const cancel = async () => {
      await user.click(within(trip).getByRole('button', { name: 'Annuler mon trajet' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: 'Oui, annuler',
        }),
      );
    };
    /** La fausse API refuse la prochaine annulation avec ce statut et ce code. */
    const refuseNextCancellation = (status: number, errorCode: string) =>
      server.use(
        http.post(
          '*/api/trips/:tripId/cancellation',
          () => problem(status, errorCode, 'Refused.'),
          {
            once: true,
          },
        ),
      );

    // Sans code, la question ne s'ouvre pas : le conducteur est invité à le saisir.
    await user.click(within(trip).getByRole('button', { name: 'Annuler mon trajet' }));
    await alert('Saisissez votre code.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(writes(seen)).toEqual([]);

    // Un autre code que celui du trajet (403 MANAGEMENT_CODE_INVALID).
    await user.type(code, 'other-code');
    expect(screen.queryByRole('alert')).toBeNull();
    await cancel();
    await alert('Ce code de gestion n’est pas le bon.');
    expect(code).toHaveAttribute('aria-invalid', 'true');

    // Le message s'efface dès que le conducteur corrige son code.
    await user.type(code, '-2');
    expect(screen.queryByRole('alert')).toBeNull();

    refuseNextCancellation(400, 'VALIDATION_FAILED');
    await cancel();
    await alert('Saisissez votre code.');

    await user.type(code, '3');
    refuseNextCancellation(404, 'TRIP_NOT_FOUND');
    await cancel();
    await alert('Ce trajet est introuvable. Vérifiez votre lien de gestion.');

    await user.type(code, '4');
    refuseNextCancellation(500, 'INTERNAL_ERROR');
    await cancel();
    await alert('Une erreur est survenue, réessayez.');

    // Rien n'est annulé : le trajet tient, et reste dans les départs vers Diamniadio.
    expect(trip.querySelector('[data-part="trip-status"]')).toBeEmptyDOMElement();
    expect(fixture.trips[0]?.cancelledAt).toBeUndefined();
    await router.navigate({ to: '/', search: { site: 'diamniadio' } });
    expect(
      within(await screen.findByRole('list', { name: 'Départs vers Diamniadio' })).getByRole(
        'listitem',
      ),
    ).toHaveTextContent('Pikine → Diamniadio');
  });
});
