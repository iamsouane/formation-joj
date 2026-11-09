/**
 * Le billet du conducteur qui vient de publier : son code et son lien de gestion, à conserver,
 * et leur envoi sur WhatsApp.
 */
import type { PublishedTripResponse } from '@joj/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { PublishedTrip } from './published-trip';
import { publishedTripShareText } from './whatsapp-share';

const trip: PublishedTripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000201',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 3,
  remainingSeats: 3,
  pricePerSeat: 1000,
  managementCode: 'k7p2x9w4m1q8',
};

const managementLink = `${window.location.origin}/trajets/${trip.id}/gestion`;

/** Un téléphone : pointeur grossier (le doigt), et, au choix, la feuille de partage du système. */
function onPhone({ shareSheet }: { shareSheet: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: coarse)',
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  const share = vi.fn<(data: ShareData) => Promise<void>>(() => Promise.resolve());
  if (shareSheet) Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  return share;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'share');
});

describe('PublishedTrip', () => {
  it('006-AS5: presents the code and the link to keep, the code never in the link', () => {
    renderWithProviders(<PublishedTrip trip={trip} />);

    const ticket = screen.getByRole('region', { name: 'Trajet publié' });
    const keep = within(ticket).getByRole('group', { name: 'À conserver' });
    expect(keep.querySelector('[data-part="management-code"]')).toHaveTextContent(
      trip.managementCode,
    );
    const link = keep.querySelector('[data-part="management-link"]');
    expect(link).toHaveTextContent(managementLink);
    expect(link?.textContent).not.toContain(trip.managementCode);
    expect(ticket).toHaveTextContent(
      'Vérifiez votre trajet. S’il y a une erreur, annulez-le avec votre code.',
    );
  });

  it('006-AS6: sends the trip, the code with its warning and the link on WhatsApp', () => {
    renderWithProviders(<PublishedTrip trip={trip} />);

    const send = screen.getByRole('link', { name: 'Envoyer sur WhatsApp' });
    const href = send.getAttribute('href') ?? '';
    expect(href.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
    const text = new URL(href).searchParams.get('text') ?? '';
    expect(text).toContain('Pikine → Diamniadio');
    expect(text).toContain('08:00');
    expect(text).toContain('3 places');
    expect(text).toContain(`Code de gestion : ${trip.managementCode}`);
    expect(text).toContain('Code à garder pour vous, ne le partagez pas');
    expect(text).toContain(managementLink);
    expect(send).toHaveAttribute('target', '_blank');
    expect(send).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('006-AS6: keeps the whole message, line breaks included, in the WhatsApp link', () => {
    renderWithProviders(<PublishedTrip trip={trip} />);

    const href = screen.getByRole('link', { name: 'Envoyer sur WhatsApp' }).getAttribute('href');
    const url = new URL(href ?? '');
    // wa.me redirige vers `api.whatsapp.com/send/?…&type=custom_url` dès que le texte contient une
    // adresse : WhatsApp ne partage alors que le lien. On vise directement la page d'envoi.
    expect(`${url.origin}${url.pathname}`).toBe('https://api.whatsapp.com/send');
    expect([...url.searchParams.keys()]).toEqual(['text']);
    const text = url.searchParams.get('text') ?? '';
    expect(text).toBe(publishedTripShareText(trip, managementLink));
    expect(text.split('\n')[1]).toBe('Pikine → Diamniadio');
    // Tout le texte est encodé : aucun retour à la ligne ni espace brut dans l'adresse.
    expect(href).not.toMatch(/[\s\n]/);
  });

  it('006-AS6: shares the whole message through the phone share sheet', async () => {
    const share = onPhone({ shareSheet: true });
    renderWithProviders(<PublishedTrip trip={trip} />);

    await userEvent.click(screen.getByRole('link', { name: 'Envoyer sur WhatsApp' }));

    // Le seul `text` : avec un `url` à part, WhatsApp ne garde que le lien.
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ text: publishedTripShareText(trip, managementLink) });
    const [shared] = share.mock.calls[0] ?? [];
    expect(Object.keys(shared ?? {})).toEqual(['text']);
    // Le trajet et le code viennent avant le lien : ils restent si l'application retire l'adresse.
    const text = publishedTripShareText(trip, managementLink);
    expect(text.indexOf('Pikine → Diamniadio')).toBeLessThan(text.indexOf(managementLink));
    expect(text.indexOf(trip.managementCode)).toBeLessThan(text.indexOf(managementLink));
  });

  it('006-AS6: falls back to the WhatsApp app on a phone without share sheet', () => {
    onPhone({ shareSheet: false });
    renderWithProviders(<PublishedTrip trip={trip} />);

    const href =
      screen.getByRole('link', { name: 'Envoyer sur WhatsApp' }).getAttribute('href') ?? '';
    expect(href.startsWith('whatsapp://send?text=')).toBe(true);
    expect(decodeURIComponent(href.slice('whatsapp://send?text='.length))).toBe(
      publishedTripShareText(trip, managementLink),
    );
  });
});
