import type { TripSite } from '@joj/shared';
import { useUpcomingTrips } from '../api/trips.queries';
import { DepartureList } from './departure-list';
import { SitePicker } from './site-picker';

interface HomePageProps {
  site: TripSite | undefined;
  onSiteChange: (site: TripSite) => void;
}

/** L'accueil : choisir son site, puis voir ses départs à venir. */
export function HomePage({ site, onSiteChange }: HomePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Où allez-vous pour les Jeux ?</h1>
      <SitePicker value={site} onChange={onSiteChange} />
      {site && <UpcomingDepartures site={site} />}
    </div>
  );
}

function UpcomingDepartures({ site }: { site: TripSite }) {
  const trips = useUpcomingTrips(site);
  if (trips.isPending) return <p className="text-muted-foreground">Chargement des départs…</p>;
  if (trips.isError) {
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger les départs. Réessayez dans un instant.
      </p>
    );
  }
  return <DepartureList site={site} trips={trips.data} />;
}
