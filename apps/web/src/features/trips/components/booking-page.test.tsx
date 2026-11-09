/**
 * Retrouver sa réservation depuis son téléphone, montée par la route `/reservation` sur la fausse
 * API : le code saisi, ce qui part sur le réseau, puis le billet et sa mention. L'horloge est
 * figée au 8 novembre 2026 à 15 h à Dakar (UTC+0) ; seule `Date` est simulée.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from 'msw';
import { mockControl } from '@/mocks/control';
import { fixture, type StoredBooking, type StoredTrip } from '@/mocks/fixture';
import { problem } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { renderRoute, trackRequests, writes } from '@/test/utils';

const NOW = new Date('2026-11-08T15:00:00.000Z');

/** Le trajet du scénario : Pikine → Diamniadio, demain à 8 h, 1 000 F par place. */
const pikineTomorrow: StoredTrip = {
  id: '0199f5c2-0000-7000-8000-000000000701',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '776543210',
  managementCode: 'pikine-tomorrow-code',
};

const awaBooking: StoredBooking = {
  id: '0199f5c2-0000-7000-8000-000000000711',
  tripId: pikineTomorrow.id,
  passengerName: 'Awa',
  passengerPhone: '771234567',
  bookingCode: 'AWA-2026',
};

function seed(trip: StoredTrip, ...bookings: StoredBooking[]) {
  fixture.trips.push({ ...trip });
  fixture.bookings.push(...bookings.map((booking) => ({ ...booking })));
}

/** Saisit le code et demande la réservation ; renvoie le billet affiché. */
async function findTicket(user: UserEvent, bookingCode: string) {
  await user.type(screen.getByLabelText('Votre code de réservation'), bookingCode);
  await user.click(screen.getByRole('button', { name: 'Voir ma réservation' }));
  return screen.findByRole('region', { name: 'Votre billet' });
}

const statusOf = (ticket: HTMLElement) => ticket.querySelector('[data-part="ticket-status"]');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BookingPage', () => {
  it('007-AS1: finds a booking from the home page with its code', async () => {
    seed(pikineTomorrow, awaBooking);
    const user = userEvent.setup();
    const seen = trackRequests();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    // L'accès est visible sur l'accueil, et mène à la page où le code se saisit.
    await user.click(screen.getByRole('link', { name: 'Retrouver ma réservation' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ma réservation' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/reservation');

    const ticket = await findTicket(user, 'AWA-2026');

    expect(seen.filter((request) => request.path.startsWith('/api/bookings'))).toEqual([
      { method: 'GET', path: '/api/bookings/AWA-2026', body: undefined },
    ]);
    expect(ticket.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Pikine → Diamniadio',
    );
    expect(ticket.querySelector('[data-part="ticket-time"]')).toHaveTextContent(
      /08:00\s*lun\. 9 nov\./,
    );
    expect(ticket).toHaveTextContent('1 000 FCFA par place');
    expect(ticket.querySelector('[data-part="ticket-code"]')).toHaveTextContent('AWA-2026');
    expect(within(ticket).getByRole('link', { name: '77 654 32 10' })).toHaveAttribute(
      'href',
      'tel:+221776543210',
    );
    expect(statusOf(ticket)).toHaveTextContent('Réservation active');
    // Le code se saisit : il n'entre jamais dans l'adresse de la page.
    expect(router.state.location.href).not.toContain('AWA-2026');
  });

  it('007-AS2: shows a cancelled booking and a cancelled trip, without offering to cancel', async () => {
    seed(pikineTomorrow, { ...awaBooking, cancelledAt: '2026-11-08T12:00:00.000Z' });
    seed(
      {
        ...pikineTomorrow,
        id: '0199f5c2-0000-7000-8000-000000000702',
        departurePlace: 'Rufisque',
        managementCode: 'rufisque-code',
        cancelledAt: '2026-11-08T13:00:00.000Z',
      },
      {
        ...awaBooking,
        id: '0199f5c2-0000-7000-8000-000000000712',
        tripId: '0199f5c2-0000-7000-8000-000000000702',
        bookingCode: 'AWA-RUFISQUE',
      },
    );
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/reservation'] });

    const cancelled = await findTicket(user, 'AWA-2026');

    expect(statusOf(cancelled)).toHaveTextContent('Réservation annulée');
    expect(statusOf(cancelled)).not.toHaveTextContent('Réservation active');
    expect(screen.queryByRole('button', { name: 'Annuler ma réservation' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Envoyer sur WhatsApp' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Saisir un autre code' }));
    const tripCancelled = await findTicket(user, 'AWA-RUFISQUE');

    expect(statusOf(tripCancelled)).toHaveTextContent('Trajet annulé par le conducteur');
    expect(tripCancelled.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Rufisque → Diamniadio',
    );
    expect(screen.queryByRole('button', { name: 'Annuler ma réservation' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Envoyer sur WhatsApp' })).toBeNull();
  });

  it('007-AS3: cancels a booking after a confirmation and frees its seat', async () => {
    // Un seul trajet vers Diamniadio : 3 places, dont celle d'Awa.
    fixture.trips = [];
    fixture.bookings = [];
    seed(pikineTomorrow, awaBooking);
    const user = userEvent.setup();
    const seen = trackRequests();
    const { router } = await renderRoute({ initialEntries: ['/?site=diamniadio'] });
    const departures = () => screen.findByRole('list', { name: 'Départs vers Diamniadio' });
    expect(within(await departures()).getByRole('listitem')).toHaveTextContent(
      '2 places restantes',
    );

    await router.navigate({ to: '/reservation' });
    const ticket = await findTicket(user, 'AWA-2026');

    // Premier temps : choisir d'annuler ouvre la confirmation, et rien ne part.
    await user.click(within(ticket).getByRole('button', { name: 'Annuler ma réservation' }));
    const confirmation = await screen.findByRole('alertdialog', {
      name: 'Annuler votre réservation ?',
    });
    expect(writes(seen)).toEqual([]);

    // Renoncer garde la réservation.
    await user.click(within(confirmation).getByRole('button', { name: 'Garder ma réservation' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(writes(seen)).toEqual([]);
    expect(statusOf(ticket)).toHaveTextContent('Réservation active');

    // Second temps : confirmer annule, une seule fois.
    await user.click(within(ticket).getByRole('button', { name: 'Annuler ma réservation' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Oui, annuler' }),
    );

    await waitFor(() => expect(statusOf(ticket)).toHaveTextContent('Réservation annulée'));
    expect(writes(seen)).toEqual([
      { method: 'POST', path: '/api/bookings/AWA-2026/cancellation', body: undefined },
    ]);
    expect(screen.queryByRole('button', { name: 'Annuler ma réservation' })).toBeNull();

    // La place est rendue : la liste des départs, relue à l'arrivée sur l'accueil, la compte de
    // nouveau.
    await router.navigate({ to: '/', search: { site: 'diamniadio' } });
    const list = await departures();
    await waitFor(() =>
      expect(within(list).getByRole('listitem')).toHaveTextContent('3 places restantes'),
    );
  });

  it('007-AS4: sends the consulted ticket on WhatsApp', async () => {
    seed(pikineTomorrow, awaBooking);
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/reservation'] });

    const ticket = await findTicket(user, 'AWA-2026');

    const send = within(ticket).getByRole('link', { name: 'Envoyer sur WhatsApp' });
    const url = new URL(send.getAttribute('href') ?? '');
    expect(`${url.origin}${url.pathname}`).toBe('https://api.whatsapp.com/send');
    // Le trajet, le code et le téléphone du conducteur, sans lien : le code se saisit sur
    // l'accueil. Des mots et des espaces simples, aucune ligne vide, comme WhatsApp les lit.
    expect(url.searchParams.get('text')).toBe(
      [
        'Ma place pour les JOJ Dakar 2026',
        'Trajet Pikine vers Diamniadio',
        'lun. 9 nov. à 08:00',
        '1 000 FCFA par place',
        'Code de réservation : AWA-2026',
        'Conducteur : 77 654 32 10',
      ].join('\n'),
    );
  });

  it('007-AS7: explains each refusal of a booking code in French', async () => {
    seed(pikineTomorrow, awaBooking);
    const user = userEvent.setup();
    const seen = trackRequests();
    await renderRoute({ initialEntries: ['/reservation'] });
    const code = screen.getByLabelText('Votre code de réservation');
    const search = screen.getByRole('button', { name: 'Voir ma réservation' });
    const alert = (message: string) =>
      waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(message));
    /** La fausse API refuse la prochaine consultation avec ce statut et ce code. */
    const refuseNextSearch = (status: number, errorCode: string) =>
      server.use(
        http.get('*/api/bookings/:bookingCode', () => problem(status, errorCode, 'Refused.'), {
          once: true,
        }),
      );

    // Un champ vide ne part pas : le supporter est invité à saisir son code.
    await user.click(search);
    await alert('Saisissez votre code.');
    expect(seen).toEqual([]);

    // Un code inconnu de l'API (404 BOOKING_NOT_FOUND).
    await user.type(code, 'NO-SUCH-CODE');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(search);
    await alert('Aucune réservation ne correspond à ce code. Vérifiez-le.');
    expect(code).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('region', { name: 'Votre billet' })).toBeNull();

    // Le message s'efface dès que le supporter corrige son code.
    await user.type(code, '-2');
    expect(screen.queryByRole('alert')).toBeNull();

    refuseNextSearch(400, 'VALIDATION_FAILED');
    await user.click(search);
    await alert('Saisissez votre code.');

    await user.type(code, '3');
    refuseNextSearch(500, 'INTERNAL_ERROR');
    await user.click(search);
    await alert('Une erreur est survenue, réessayez.');

    // Une annulation refusée s'explique aussi, et rien n'est annulé.
    await user.clear(code);
    const ticket = await findTicket(user, 'AWA-2026');
    server.use(
      http.post(
        '*/api/bookings/:bookingCode/cancellation',
        () => problem(404, 'BOOKING_NOT_FOUND', 'Refused.'),
        { once: true },
      ),
    );
    await user.click(within(ticket).getByRole('button', { name: 'Annuler ma réservation' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Oui, annuler' }),
    );
    await alert('Aucune réservation ne correspond à ce code. Vérifiez-le.');
    expect(statusOf(ticket)).toHaveTextContent('Réservation active');
    expect(fixture.bookings.find((b) => b.bookingCode === 'AWA-2026')?.cancelledAt).toBeUndefined();
  });

  it('007-AS3: shows the booking as cancelled even when the re-read fails', async () => {
    seed(pikineTomorrow, awaBooking);
    const user = userEvent.setup();
    const seen = trackRequests();
    await renderRoute({ initialEntries: ['/reservation'] });
    const ticket = await findTicket(user, 'AWA-2026');

    // L'API accepte l'annulation, puis ne répond plus aux lectures : le réseau est tombé.
    mockControl.failPersistently('GET /api/bookings/:bookingCode');
    await user.click(within(ticket).getByRole('button', { name: 'Annuler ma réservation' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Oui, annuler' }),
    );

    // L'annulation est faite : le billet le dit, sans attendre une relecture qui a échoué.
    await waitFor(() => expect(statusOf(ticket)).toHaveTextContent('Réservation annulée'));
    expect(fixture.bookings.find((b) => b.bookingCode === 'AWA-2026')?.cancelledAt).toBeDefined();
    await waitFor(() =>
      expect(
        seen.filter((r) => r.method === 'GET' && r.path === '/api/bookings/AWA-2026'),
      ).toHaveLength(2),
    );
    expect(statusOf(ticket)).toHaveTextContent('Réservation annulée');
    expect(screen.queryByRole('button', { name: 'Annuler ma réservation' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
