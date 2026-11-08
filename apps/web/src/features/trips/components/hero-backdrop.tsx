import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * Les arbres de chaque plan : position (0 à 1200, la largeur du plan), taille, et espèce.
 * Baobabs et acacias se mêlent ; les plans lointains sont plus petits et plus serrés.
 */
interface Tree {
  x: number;
  scale: number;
  kind: 'baobab' | 'acacia';
}

const TREE_LAYERS: { depth: 'far' | 'mid' | 'near'; trees: Tree[] }[] = [
  {
    depth: 'far',
    trees: [
      { x: 60, scale: 0.28, kind: 'acacia' },
      { x: 210, scale: 0.34, kind: 'baobab' },
      { x: 420, scale: 0.26, kind: 'acacia' },
      { x: 530, scale: 0.3, kind: 'baobab' },
      { x: 660, scale: 0.3, kind: 'acacia' },
      { x: 760, scale: 0.24, kind: 'acacia' },
      { x: 860, scale: 0.36, kind: 'baobab' },
      { x: 1080, scale: 0.27, kind: 'acacia' },
    ],
  },
  {
    depth: 'mid',
    trees: [
      { x: 40, scale: 0.55, kind: 'baobab' },
      { x: 470, scale: 0.48, kind: 'acacia' },
      { x: 700, scale: 0.42, kind: 'acacia' },
      { x: 1120, scale: 0.6, kind: 'baobab' },
    ],
  },
  {
    depth: 'near',
    trees: [
      { x: -45, scale: 1, kind: 'baobab' },
      { x: 575, scale: 0.62, kind: 'acacia' },
      { x: 1160, scale: 0.9, kind: 'acacia' },
    ],
  },
];

/** Les touffes d'herbes hautes du premier plan : position, taille et déphasage de leur ondulation. */
const GRASS_CLUMPS = [
  { x: 40, scale: 1, delay: '0s' },
  { x: 170, scale: 0.8, delay: '-1.3s' },
  { x: 300, scale: 1.1, delay: '-2.1s' },
  { x: 450, scale: 0.7, delay: '-3.1s' },
  { x: 760, scale: 0.75, delay: '-0.4s' },
  { x: 900, scale: 0.9, delay: '-0.7s' },
  { x: 1040, scale: 1.15, delay: '-2.8s' },
  { x: 1160, scale: 0.85, delay: '-1.7s' },
];

/** La poussière qui scintille au ras de la route : position et rythme. */
const DUST = Array.from({ length: 10 }, (_, index) => ({
  left: `${8 + ((index * 37) % 84)}%`,
  bottom: `${6 + ((index * 23) % 26)}%`,
  duration: `${2.6 + (index % 4) * 0.7}s`,
  delay: `${-(index * 0.9)}s`,
}));

/** Les oiseaux en V, vus de loin : de simples ailes en « m ». */
const BIRDS = [
  { x: 0, y: 14, s: 1 },
  { x: 22, y: 6, s: 0.85 },
  { x: 44, y: 0, s: 0.95 },
  { x: 66, y: 7, s: 0.8 },
  { x: 86, y: 15, s: 0.9 },
];

/**
 * Les silhouettes, définies une fois : un baobab (tronc épais, couronne de branches nues) et un
 * acacia (tronc fin, cime en parasol). Les pieds sont en (0, 0), les arbres montent vers les y
 * négatifs ; chaque `<use>` les place et les met à l'échelle.
 */
function TreeSymbols() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="sahel-baobab" overflow="visible">
          <path d="M-18 0 L-12 -70 Q-14 -95 -10 -110 L10 -110 Q14 -95 12 -70 L18 0 Z" />
          <path
            d="M-9 -108 L-48 -150 M-11 -104 L-70 -118 M9 -108 L50 -148 M11 -104 L70 -122 M0 -110 L-6 -170 M2 -110 L22 -168 M-4 -110 L-28 -162"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M-48 -150 L-62 -166 M-48 -150 L-40 -170 M50 -148 L64 -164 M50 -148 L44 -170 M-70 -118 L-88 -126 M70 -122 L88 -130 M-6 -170 L-14 -186 M22 -168 L30 -184"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="sahel-acacia" overflow="visible">
          <path d="M-5 0 L-3 -80 L3 -80 L5 0 Z" />
          <path
            d="M0 -78 L-42 -104 M0 -78 L40 -102 M0 -78 L-14 -112 M0 -78 L16 -110"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M-78 -104 Q-40 -132 0 -128 Q40 -132 78 -102 Q40 -92 0 -94 Q-40 -92 -78 -104 Z" />
        </symbol>
        <symbol id="sahel-grass" overflow="visible">
          <path
            d="M0 0 Q-6 -24 -16 -40 M0 0 Q-2 -28 -6 -50 M0 0 Q4 -26 10 -46 M0 0 Q10 -22 22 -36 M0 0 Q-10 -18 -26 -28 M0 0 Q14 -16 30 -22"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}

function TreeLayer({ depth, trees }: (typeof TREE_LAYERS)[number]) {
  return (
    <svg
      className={`hero-trees hero-trees-${depth}`}
      data-part={`trees-${depth}`}
      data-depth={depth}
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {trees.map((tree) => (
        <use
          key={`${tree.kind}-${tree.x}`}
          href={`#sahel-${tree.kind}`}
          transform={`translate(${tree.x} 200) scale(${tree.scale})`}
        />
      ))}
    </svg>
  );
}

/**
 * Le décor du hero : un paysage du Sahel au coucher du soleil, dessiné dans le style de la mascotte
 * (à plat, sans photo) mais vrai dans sa lumière et sa profondeur. Du fond vers l'avant : le ciel
 * ocre et rose, le soleil bas, le liseré de l'Atlantique à l'horizon, trois plans de baobabs et
 * d'acacias qui pâlissent avec la distance, la savane et ses herbes hautes, la route en latérite
 * rouge qui mène aux panneaux. La vie discrète (un vol d'oiseaux, la poussière qui scintille,
 * l'ondulation de chaleur) n'existe qu'avec le mouvement permis et dans le hero ouvert. Chaque plan
 * glisse en parallaxe à sa profondeur sous le doigt (`--tilt-x`, posé par le hero). Tout est hors de
 * l'arbre d'accessibilité.
 */
export function HeroBackdrop({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion();
  const lively = !reduced && !compact;

  return (
    <div
      className="hero-backdrop"
      aria-hidden="true"
      data-motion={reduced ? 'reduced' : 'full'}
      data-compact={compact}
    >
      <TreeSymbols />
      <div className="hero-sky" data-part="sky" />
      <div className="hero-sun" data-part="sun" />
      {lively && (
        <svg
          className="hero-birds"
          data-part="birds"
          viewBox="0 0 100 24"
          aria-hidden="true"
          focusable="false"
        >
          {/* Le placement sur le groupe, le battement d'ailes (CSS) sur le tracé : l'un n'écrase pas l'autre. */}
          {BIRDS.map((bird) => (
            <g key={bird.x} transform={`translate(${bird.x} ${bird.y}) scale(${bird.s})`}>
              <path className="hero-bird" d="M0 6 q4 -6 8 0 q4 -6 8 0" />
            </g>
          ))}
        </svg>
      )}
      <div className="hero-ocean" data-part="ocean" />
      {lively && <div className="hero-heat" data-part="heat" />}
      <div className="hero-land" />
      {TREE_LAYERS.map((layer) => (
        <TreeLayer key={layer.depth} {...layer} />
      ))}
      <div className="hero-road" data-part="road">
        <div className="hero-road-shoulder" />
        <div className="hero-road-surface" />
      </div>
      {lively && (
        <div className="hero-dust" data-part="dust">
          {DUST.map((mote) => (
            <span
              key={mote.left + mote.bottom}
              className="hero-dust-mote"
              data-part="dust-mote"
              style={{
                left: mote.left,
                bottom: mote.bottom,
                animationDuration: mote.duration,
                animationDelay: mote.delay,
              }}
            />
          ))}
        </div>
      )}
      {!compact && (
        <svg
          className="hero-grass"
          data-part="grass"
          viewBox="0 0 1200 80"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          focusable="false"
        >
          {GRASS_CLUMPS.map((clump) => (
            <g key={clump.x} transform={`translate(${clump.x} 80) scale(${clump.scale})`}>
              <g className="hero-grass-clump" style={{ animationDelay: clump.delay }}>
                <use href="#sahel-grass" />
              </g>
            </g>
          ))}
        </svg>
      )}
      <div className="hero-frieze" data-part="frieze" />
    </div>
  );
}
