/**
 * Publier un trajet depuis son téléphone, monté par la route `/publier` sur la fausse API :
 * l'annonce ou le formulaire, ce qui part sur le réseau, l'attente, puis la confirmation.
 * L'horloge est figée au 8 novembre 2026 à 15 h à Dakar (UTC+0) ; seule `Date` est simulée,
 * les délais de la fausse API restent réels.
 */
import type { TripDraft } from '@joj/shared';
import { screen, within } from '@testing-library/react';
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
