import { createFileRoute } from '@tanstack/react-router';
import { BookingPage } from '@/features/trips/components/booking-page';

/** Le supporter retrouve sa réservation avec son code, saisi sur la page, jamais dans l'adresse. */
export const Route = createFileRoute('/reservation')({
  component: BookingPage,
});
