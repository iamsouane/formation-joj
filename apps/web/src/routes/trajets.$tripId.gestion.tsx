import { createFileRoute } from '@tanstack/react-router';
import { ManageTripPage } from '@/features/trips/components/manage-trip-page';

/**
 * Le lien de gestion d'un trajet (`management-link.ts`) : il désigne le trajet par son
 * identifiant ; le code de gestion se saisit sur la page, jamais dans l'adresse.
 */
function ManageTrip() {
  const { tripId } = Route.useParams();
  return <ManageTripPage tripId={tripId} />;
}

export const Route = createFileRoute('/trajets/$tripId/gestion')({
  component: ManageTrip,
});
