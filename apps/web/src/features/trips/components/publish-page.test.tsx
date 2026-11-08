/**
 * Publier un trajet depuis son téléphone, monté par la route `/publier` sur la fausse API :
 * l'annonce ou le formulaire, ce qui part sur le réseau, l'attente, puis la confirmation.
 * L'horloge est figée au 8 novembre 2026 à 15 h à Dakar (UTC+0) ; seule `Date` est simulée,
 * les délais de la fausse API restent réels.
 */
import type { TripDraft } from '@joj/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockControl } from '@/mocks/control';
import { fixture } from '@/mocks/fixture';
import { renderRoute, trackRequests, writes } from '@/test/utils';

const NOW = new Date('2026-11-08T15:00:00.000Z');
const ANNOUNCEMENT = 'je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F';

const understood = (draft: Partial<TripDraft> = {}): TripDraft => ({
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt: '2026-11-09T08:00',
  seats: 3,
  pricePerSeat: 1000,
  ...draft,
});

async function openPublishPage() {
  const user = userEvent.setup();
  const seen = trackRequests();
  const rendered = await renderRoute({ initialEntries: ['/publier'] });
  return { user, seen, ...rendered };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PublishPage', () => {
  it('006-AS1: publishes from the announcement and shows the trip as understood', async () => {
    mockControl.setTripDraft(understood());
    mockControl.setLatency(80);
    const { user, seen } = await openPublishPage();

    await user.type(screen.getByLabelText('Votre annonce WhatsApp'), ANNOUNCEMENT);
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');
    const publish = screen.getByRole('button', { name: 'Publier' });
    await user.click(publish);

    // L'attente : l'assistant lit, la mascotte attend, un second appui ne publie pas deux fois.
    expect(await screen.findByText('L’assistant lit votre annonce…')).toBeInTheDocument();
    expect(document.querySelector('[data-pose="waiting"]')).toBeInTheDocument();
    expect(publish).toBeDisabled();
    await user.click(publish);

    const confirmation = await screen.findByRole('region', { name: 'Trajet publié' });
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: '/api/trips/from-message',
        body: { message: ANNOUNCEMENT, driverPhone: '77 123 45 67' },
      },
    ]);
    const published = fixture.trips.at(-1)!;
    expect(confirmation.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Pikine → Diamniadio',
    );
    expect(confirmation.querySelector('[data-part="ticket-time"]')).toHaveTextContent(
      /08:00\s*lun\. 9 nov\./,
    );
    expect(confirmation).toHaveTextContent('3 places');
    expect(confirmation).toHaveTextContent('1 000 FCFA par place');
    expect(confirmation.querySelector('[data-part="management-code"]')).toHaveTextContent(
      published.managementCode,
    );
    expect(confirmation.querySelector('[data-part="management-link"]')).toHaveTextContent(
      `${window.location.origin}/trajets/${published.id}/gestion`,
    );
    expect(document.querySelector('[data-pose="waiting"]')).not.toBeInTheDocument();
  });

  it('006-AS2: switches to the form at any time, keeping the phone', async () => {
    mockControl.setLatency(80);
    const { user, seen } = await openPublishPage();
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(screen.getByRole('button', { name: 'Remplir le formulaire' }));

    const form = screen.getByRole('form', { name: 'Publier avec le formulaire' });
    const phone = within(form).getByLabelText('Votre téléphone');
    expect(phone).toHaveValue('77 123 45 67');
    expect(phone).toHaveAttribute('type', 'tel');
    expect(phone).toHaveAttribute('inputmode', 'tel');
    expect(phone).toHaveAttribute('autocomplete', 'tel');
    const seats = within(form).getByLabelText('Places proposées');
    const price = within(form).getByLabelText('Participation par place, en FCFA');
    expect(seats).toHaveAttribute('inputmode', 'numeric');
    expect(price).toHaveAttribute('inputmode', 'numeric');
    // Une aide de saisie : la règle du départ passé reste celle de l'API.
    const departure = within(form).getByLabelText('Jour et heure de départ');
    expect(departure).toHaveAttribute('type', 'datetime-local');
    expect(departure).toHaveAttribute('min', '2026-11-08T15:00');

    await user.type(within(form).getByLabelText('Lieu de départ'), 'Pikine');
    await user.click(within(form).getByRole('radio', { name: 'Diamniadio' }));
    fireEvent.change(departure, { target: { value: '2026-11-09T08:00' } });
    await user.type(seats, '3');
    await user.type(price, '1000');
    const publish = within(form).getByRole('button', { name: 'Publier' });
    await user.click(publish);

    expect(await screen.findByText('Publication en cours…')).toBeInTheDocument();
    expect(document.querySelector('[data-pose="waiting"]')).toBeInTheDocument();
    expect(publish).toBeDisabled();
    await user.click(publish);

    const confirmation = await screen.findByRole('region', { name: 'Trajet publié' });
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: '/api/trips',
        body: {
          departurePlace: 'Pikine',
          site: 'diamniadio',
          departureAt: '2026-11-09T08:00:00.000Z',
          seats: 3,
          pricePerSeat: 1000,
          driverPhone: '77 123 45 67',
        },
      },
    ]);
    expect(confirmation.querySelector('[data-part="ticket-route"]')).toHaveTextContent(
      'Pikine → Diamniadio',
    );
    // Comme en AS1 : le trajet compris, puis le code et le lien de gestion.
    const published = fixture.trips.at(-1)!;
    expect(confirmation.querySelector('[data-part="ticket-time"]')).toHaveTextContent(
      /08:00\s*lun\. 9 nov\./,
    );
    expect(confirmation).toHaveTextContent('3 places');
    expect(confirmation).toHaveTextContent('1 000 FCFA par place');
    expect(confirmation.querySelector('[data-part="management-code"]')).toHaveTextContent(
      published.managementCode,
    );
    expect(confirmation.querySelector('[data-part="management-link"]')).toHaveTextContent(
      `${window.location.origin}/trajets/${published.id}/gestion`,
    );
  });

  it('006-AS2: sends the seats and the price as typed, never a truncated number', async () => {
    const { user, seen } = await openPublishPage();
    await user.click(screen.getByRole('button', { name: 'Remplir le formulaire' }));
    const form = screen.getByRole('form', { name: 'Publier avec le formulaire' });
    await user.type(within(form).getByLabelText('Lieu de départ'), 'Pikine');
    await user.click(within(form).getByRole('radio', { name: 'Diamniadio' }));
    fireEvent.change(within(form).getByLabelText('Jour et heure de départ'), {
      target: { value: '2026-11-09T08:00' },
    });
    await user.type(within(form).getByLabelText('Votre téléphone'), '77 123 45 67');
    const seats = within(form).getByLabelText('Places proposées');
    const price = within(form).getByLabelText('Participation par place, en FCFA');

    // « 2 places » n'est pas un nombre : il n'est pas deviné, l'API le refuse.
    await user.type(seats, '2 places');
    await user.type(price, '1 000');
    await user.click(within(form).getByRole('button', { name: 'Publier' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Vérifiez les champs signalés.',
    );
    expect(seats).toHaveAttribute('aria-invalid', 'true');
    expect(writes(seen).at(-1)?.body).toMatchObject({ seats: null, pricePerSeat: 1000 });

    // « 1 000 », comme l'affiche le billet, se lit mille ; « 3,5 » n'est pas tronqué en 3.
    await user.clear(seats);
    await user.type(seats, '3,5');
    await user.click(within(form).getByRole('button', { name: 'Publier' }));
    await waitFor(() => expect(writes(seen)).toHaveLength(2));
    expect(writes(seen).at(-1)?.body).toMatchObject({ seats: null, pricePerSeat: 1000 });

    await user.clear(seats);
    await user.type(seats, '3');
    await user.click(within(form).getByRole('button', { name: 'Publier' }));
    await screen.findByRole('region', { name: 'Trajet publié' });
    expect(writes(seen).at(-1)?.body).toMatchObject({ seats: 3, pricePerSeat: 1000 });
    expect(fixture.trips.at(-1)).toMatchObject({ seats: 3, pricePerSeat: 1000 });
  });

  it('006-AS2: disables the switch to the form while the announcement is read', async () => {
    mockControl.setTripDraft(understood({ site: 'Thiès' }));
    mockControl.setLatency(80);
    const { user, seen } = await openPublishPage();
    await user.type(screen.getByLabelText('Votre annonce WhatsApp'), ANNOUNCEMENT);
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    // Pendant la lecture, le formulaire ne s'ouvre pas : pas de seconde publication en route.
    const wait = await screen.findByRole('button', { name: 'Patientez…' });
    expect(wait).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remplir le formulaire' })).not.toBeInTheDocument();
    await user.click(wait);
    expect(
      screen.queryByRole('form', { name: 'Publier avec le formulaire' }),
    ).not.toBeInTheDocument();

    // La réponse arrivée (ici un refus), le passage au formulaire redevient possible.
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Remplir le formulaire' })).toBeEnabled();
    expect(writes(seen)).toHaveLength(1);
  });

  it('006-AS3: falls back to the form with the announcement above and the missing fields marked', async () => {
    mockControl.setTripDraft(
      understood({ departurePlace: null, departureAt: null, seats: null, pricePerSeat: null }),
    );
    const before = fixture.trips.length;
    const { user } = await openPublishPage();
    await user.type(
      screen.getByLabelText('Votre annonce WhatsApp'),
      'je vais à Diamniadio, qui vient ?',
    );
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    const form = await screen.findByRole('form', { name: 'Publier avec le formulaire' });
    // L'annonce reste au-dessus du formulaire, pour que le conducteur la relise.
    const recall = screen.getByRole('figure', { name: 'Votre annonce' });
    expect(recall).toHaveTextContent('je vais à Diamniadio, qui vient ?');
    expect(recall.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const label of [
      'Lieu de départ',
      'Jour et heure de départ',
      'Places proposées',
      'Participation par place, en FCFA',
    ]) {
      const field = within(form).getByLabelText(label);
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription('Absent de votre annonce');
    }
    expect(within(form).getByLabelText('Votre téléphone')).not.toHaveAttribute('aria-invalid');
    expect(within(form).getByLabelText('Votre téléphone')).toHaveValue('77 123 45 67');
    expect(fixture.trips).toHaveLength(before);
  });

  it('006-AS4: falls back to the form when the assistant does not answer', async () => {
    mockControl.failAssistant();
    const before = fixture.trips.length;
    const { user } = await openPublishPage();
    await user.type(screen.getByLabelText('Votre annonce WhatsApp'), ANNOUNCEMENT);
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    const form = await screen.findByRole('form', { name: 'Publier avec le formulaire' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'L’assistant ne répond pas. Remplissez le formulaire, c’est rapide.',
    );
    expect(within(form).getByLabelText('Votre téléphone')).toHaveValue('77 123 45 67');
    expect(screen.queryByRole('region', { name: 'Trajet publié' })).not.toBeInTheDocument();
    expect(fixture.trips).toHaveLength(before);
  });

  it.each([
    {
      code: 'SITE_UNKNOWN',
      announcement: ANNOUNCEMENT,
      arrange: () => mockControl.setTripDraft(understood({ site: 'Thiès' })),
      says: 'Choisissez Dakar, Diamniadio ou Saly.',
    },
    {
      code: 'DEPARTURE_IN_PAST',
      announcement: ANNOUNCEMENT,
      arrange: () => mockControl.setTripDraft(understood({ departureAt: '2026-11-07T08:00' })),
      says: 'Cette heure est déjà passée. Indiquez un départ à venir.',
    },
    {
      code: 'MESSAGE_EMPTY',
      announcement: '   ',
      arrange: () => {},
      says: 'Collez votre annonce avant de publier.',
    },
    {
      code: 'VALIDATION_FAILED',
      announcement: ANNOUNCEMENT,
      arrange: () => mockControl.setTripDraft(understood({ seats: 0 })),
      says: 'Vérifiez les champs signalés.',
    },
    {
      code: 'INTERNAL_ERROR',
      announcement: ANNOUNCEMENT,
      arrange: () => mockControl.failNext('POST /api/trips/from-message'),
      says: 'Une erreur est survenue, réessayez.',
    },
  ])('006-AS7: explains $code in French', async ({ announcement, arrange, says }) => {
    arrange();
    const { user } = await openPublishPage();
    await user.type(screen.getByLabelText('Votre annonce WhatsApp'), announcement);
    await user.type(screen.getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(says);
    expect(screen.getByRole('form', { name: 'Publier depuis votre annonce' })).toBeInTheDocument();
  });

  it('006-AS7: marks the refused fields of the form', async () => {
    const { user } = await openPublishPage();
    await user.click(screen.getByRole('button', { name: 'Remplir le formulaire' }));
    const form = screen.getByRole('form', { name: 'Publier avec le formulaire' });
    await user.type(within(form).getByLabelText('Votre téléphone'), '77 123 45 67');

    await user.click(within(form).getByRole('button', { name: 'Publier' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Vérifiez les champs signalés.',
    );
    expect(within(form).getByLabelText('Lieu de départ')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByLabelText('Places proposées')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByLabelText('Votre téléphone')).not.toHaveAttribute('aria-invalid');
  });

  it('006-AS1: leads the driver from the home page to the publication page', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    await user.click(screen.getByRole('link', { name: 'Vous conduisez ? Proposez un trajet' }));

    expect(router.state.location.pathname).toBe('/publier');
    const band = await screen.findByRole('region', { name: 'Proposer un trajet' });
    expect(
      within(band).getByRole('img', { name: 'La mascotte des JOJ Dakar 2026' }),
    ).toBeInTheDocument();
  });
});
