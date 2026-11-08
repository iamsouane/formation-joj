import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Les confettis du ciel : position, durée et décalage, pour qu'ils ne flottent jamais ensemble. */
const CONFETTI = [
  { left: '6%', top: '20%', duration: '7s', delay: '-1s' },
  { left: '18%', top: '46%', duration: '9s', delay: '-4s' },
  { left: '31%', top: '8%', duration: '8s', delay: '-2s' },
  { left: '47%', top: '38%', duration: '6.5s', delay: '-5s' },
  { left: '62%', top: '14%', duration: '8.5s', delay: '-3s' },
  { left: '74%', top: '30%', duration: '7.5s', delay: '-6s' },
  { left: '86%', top: '9%', duration: '9.5s', delay: '-2.5s' },
  { left: '92%', top: '44%', duration: '6s', delay: '-1.5s' },
  { left: '40%', top: '52%', duration: '8s', delay: '-7s' },
];

/** Les voitures, deux voies : elles roulent vers l'horizon, l'une après l'autre. */
const CARS = [
  { lane: 'left', delay: '0s' },
  { lane: 'right', delay: '-2.6s' },
  { lane: 'left', delay: '-5.2s' },
] as const;

const SIGNS = [
  { label: 'Dakar', direction: 'left' },
  { label: 'Diamniadio', direction: 'right' },
  { label: 'Saly', direction: 'right' },
] as const;

/** Une voiture vue de dos, en silhouette : carrosserie noire, feux rouges. */
function CarSilhouette() {
  return (
    <svg viewBox="0 0 40 26" className="hero-car-body">
      <path d="M8 9 L12 2 H28 L32 9 Z" fill="#111" />
      <rect x="2" y="9" width="36" height="12" rx="3" fill="#000" />
      <rect x="5" y="12" width="6" height="3" rx="1" fill="var(--joj-red)" />
      <rect x="29" y="12" width="6" height="3" rx="1" fill="var(--joj-red)" />
      <rect x="4" y="20" width="7" height="6" rx="1.5" fill="#000" />
      <rect x="29" y="20" width="7" height="6" rx="1.5" fill="#000" />
    </svg>
  );
}

/**
 * Le décor du hero, purement visuel (hors de l'arbre d'accessibilité) : un soleil levant dont les
 * rayons tournent, une route en perspective où des voitures roulent vers le poteau Dakar,
 * Diamniadio, Saly, des confettis qui flottent et la frise du maillot qui défile. Sous moins
 * d'animations, ni confettis ni voitures ; le reste est figé par `styles.css`.
 */
export function HeroBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div className="hero-backdrop" aria-hidden="true" data-motion={reduced ? 'reduced' : 'full'}>
      <div className="hero-sun-rays" data-part="sun-rays" />
      <div className="hero-sun" data-part="sun" />
      {!reduced &&
        CONFETTI.map((confetto) => (
          <span
            key={`${confetto.left}-${confetto.top}`}
            className="hero-confetto"
            data-part="confetto"
            style={{
              left: confetto.left,
              top: confetto.top,
              animationDuration: confetto.duration,
              animationDelay: confetto.delay,
            }}
          />
        ))}
      <div className="hero-ground" />
      <div className="hero-road" data-part="road">
        <div className="hero-road-edge" data-part="road-edge" />
        <div className="hero-road-surface" data-part="road-surface" />
        <div className="hero-road-line" data-part="road-line" />
        {!reduced &&
          CARS.map((car) => (
            <div
              key={car.delay}
              className="hero-car-track"
              data-part="car-track"
              style={{ animationDelay: car.delay }}
            >
              <span className="hero-car" data-part="car" data-lane={car.lane}>
                <CarSilhouette />
              </span>
            </div>
          ))}
      </div>
      <div className="hero-signpost" data-part="signpost">
        {SIGNS.map((sign) => (
          <span key={sign.label} className="hero-sign" data-direction={sign.direction}>
            {sign.label}
          </span>
        ))}
      </div>
      <div className="hero-frieze" data-part="frieze" />
    </div>
  );
}
