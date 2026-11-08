import { createFileRoute } from '@tanstack/react-router';
import { PublishPage } from '@/features/trips/components/publish-page';

/** Le conducteur publie son trajet : depuis son annonce WhatsApp, ou par le formulaire. */
export const Route = createFileRoute('/publier')({
  component: PublishPage,
});
