import { TRIP_SITES, type TripSite } from '@joj/shared';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { SITE_LABELS } from './format';

/** Comment le site a été choisi : au doigt ou à la souris, ou au clavier. */
export type SiteChoiceGesture = 'pointer' | 'keyboard';

interface SitePickerProps {
  value: TripSite | undefined;
  onChange: (site: TripSite, gesture: SiteChoiceGesture) => void;
}

/** Les trois sites des JOJ, en boutons radio assez grands pour un pouce. */
export function SitePicker({ value, onChange }: SitePickerProps) {
  // Un choix au clavier ne s'anime pas : on retient si le choix suit un appui du doigt ou de la souris.
  const pointerPressed = useRef(false);

  function choose(site: TripSite) {
    onChange(site, pointerPressed.current ? 'pointer' : 'keyboard');
    pointerPressed.current = false;
  }

  return (
    <fieldset className="site-picker flex flex-col">
      <legend className="mb-2 text-sm font-semibold">Votre site d’épreuve</legend>
      <div className="grid grid-cols-3 border-2 border-foreground">
        {TRIP_SITES.map((site) => (
          <label
            key={site}
            onPointerDown={() => {
              pointerPressed.current = true;
            }}
            className={cn(
              'flex min-h-12 cursor-pointer items-center justify-center px-2 text-base font-semibold',
              'border-foreground not-first:border-l-2',
              'has-checked:bg-foreground has-checked:text-background',
              'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
            )}
          >
            <input
              type="radio"
              name="site"
              value={site}
              checked={value === site}
              onChange={() => choose(site)}
              className="sr-only"
            />
            {SITE_LABELS[site]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
