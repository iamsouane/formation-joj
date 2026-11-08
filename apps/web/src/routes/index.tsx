import { TRIP_SITES } from '@joj/shared';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { HomePage } from '@/features/trips/components/home-page';

/** Le site choisi vit dans l'adresse : `/?site=saly` se partage et survit au retour arrière. */
const homeSearchSchema = z.object({ site: z.enum(TRIP_SITES).optional().catch(undefined) });

function Home() {
  const { site } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <HomePage
      site={site}
      onSiteChange={(next) => navigate({ search: { site: next }, viewTransition: true })}
    />
  );
}

export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  component: Home,
});
