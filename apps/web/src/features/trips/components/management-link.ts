/**
 * Le lien de gestion d'un trajet : il désigne le trajet, jamais son code de gestion, qui se saisit
 * à part sur la page qu'il ouvre (TR7). Une adresse se partage, s'affiche et reste dans
 * l'historique : le code n'a rien à y faire.
 */
export function managementLinkOf(tripId: string, origin: string = window.location.origin): string {
  return `${origin}/trajets/${encodeURIComponent(tripId)}/gestion`;
}
