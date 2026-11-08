/** Trois cartes d'attente : assez pour remplir la place d'une liste sur un téléphone. */
const PLACEHOLDERS = [0, 1, 2];

/**
 * Les départs se chargent : des cartes à la forme des départs (l'heure, le trajet, les places),
 * plutôt qu'une zone vide. Le lecteur d'écran entend « Chargement des départs… ».
 */
export function DeparturesLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement des départs…"
      aria-busy="true"
      className="departures-loading"
    >
      <p className="text-muted-foreground">Chargement des départs…</p>
      <ul className="departure-grid" aria-hidden="true">
        {PLACEHOLDERS.map((index) => (
          <li
            key={index}
            className="departure-bubble departure-placeholder"
            data-part="departure-placeholder"
          >
            <span className="placeholder-bar placeholder-time" />
            <span className="placeholder-bar placeholder-route" />
            <span className="placeholder-bar placeholder-meta" />
          </li>
        ))}
      </ul>
    </div>
  );
}
