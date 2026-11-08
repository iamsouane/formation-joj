import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';

function RootLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-3 pb-6">
      <header className="flex items-center gap-3">
        <Link to="/" className="block size-14 shrink-0 overflow-hidden">
          {/* Le logo occupe le centre de son carré blanc : on l'agrandit pour le lire. */}
          <img
            src="/brand/logo.jpg"
            alt="Dakar 2026, Jeux Olympiques de la Jeunesse : retour à l’accueil"
            width={900}
            height={900}
            className="size-full scale-[1.55] object-cover"
          />
        </Link>
        <p className="font-display text-2xl leading-none font-extrabold">
          Covoiturage
          <br />
          des Jeux
        </p>
      </header>
      <main className="flex flex-1 flex-col gap-6">
        <Outlet />
      </main>
      <footer className="border-t-2 border-foreground pt-3 text-sm text-muted-foreground">
        Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-display text-3xl font-extrabold">Page introuvable</h1>
      <Link to="/" className={buttonVariants()}>
        Retour à l’accueil
      </Link>
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: NotFound });
