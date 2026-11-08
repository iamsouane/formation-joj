import { TRIP_SITES, type TripSite } from '@joj/shared';
import { useRef } from 'react';
import { SITE_LABELS } from './format';

/** Comment le site a été choisi : au doigt ou à la souris, ou au clavier. */
export type SiteChoiceGesture = 'pointer' | 'keyboard';

/** Le sens de chaque flèche, comme sur les panneaux de la route : Dakar à gauche, le reste à droite. */
const DIRECTIONS: Record<TripSite, 'left' | 'right'> = {
  dakar: 'left',
  diamniadio: 'right',
  saly: 'right',
};

interface SitePickerProps {
  value: TripSite | undefined;
  onChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/**
 * Les trois sites des JOJ, en panneaux de direction sur leur poteau : chaque panneau est un bouton
 * radio, assez grand pour un pouce, avec un focus clavier visible.
 */
export function SitePicker({ value, onChange }: SitePickerProps) {
  // Un choix au clavier ne s'anime pas : on retient si le choix suit un appui du doigt ou de la souris.
  const pointerPressed = useRef(false);

  function choose(site: TripSite) {
    onChange(site, pointerPressed.current ? 'pointer' : 'keyboard');
    pointerPressed.current = false;
  }

  return (
    <fieldset
      className="signpost"
      data-part="signpost"
      // Une touche pressée annonce un choix au clavier, même après un toucher resté sans effet.
      onKeyDown={() => {
        pointerPressed.current = false;
      }}
    >
      <legend>Votre site d’épreuve</legend>
      <span className="signpost-pole" aria-hidden="true" />
      {TRIP_SITES.map((site) => (
        <label
          key={site}
          className="sign"
          data-site={site}
          data-direction={DIRECTIONS[site]}
          onPointerDown={() => {
            pointerPressed.current = true;
          }}
        >
          <input
            type="radio"
            name="site"
            value={site}
            checked={value === site}
            onChange={() => choose(site)}
            className="sr-only"
          />
          <span className="sign-panel">{SITE_LABELS[site]}</span>
        </label>
      ))}
    </fieldset>
  );
}
