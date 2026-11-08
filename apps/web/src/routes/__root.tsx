import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';

/** Chaque page choisit sa largeur : l'accueil ouvre sur un hero bord à bord. */
function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <footer className="mx-auto mt-8 w-full max-w-md border-t-2 border-foreground px-4 pt-3 pb-6 text-sm text-muted-foreground">
        Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 pt-6">
      <h1 className="font-display text-3xl font-extrabold">Page introuvable</h1>
      <Link to="/" className={buttonVariants()}>
        Retour à l’accueil
      </Link>
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: NotFound });
