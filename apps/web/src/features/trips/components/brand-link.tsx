import { Link } from '@tanstack/react-router';

/**
 * La marque, en haut de chaque page : le logo des JOJ Dakar 2026 et le nom du service ; elle
 * ramène à l'accueil, sans site choisi. Le logo est recadré d'avance (`logo-mark.jpg`) : aucun
 * `transform` dans un cadre `overflow: hidden`, que Safari iOS ne peignait pas sous le hero animé.
 */
export function BrandLink() {
  return (
    <Link to="/" className="hero-brand">
      <span className="hero-logo">
        <img src="/brand/logo-mark.jpg" alt="" width={176} height={176} />
      </span>
      <span>
        <span className="block">Covoiturage</span> <span className="block">des JOJ</span>
      </span>
    </Link>
  );
}
