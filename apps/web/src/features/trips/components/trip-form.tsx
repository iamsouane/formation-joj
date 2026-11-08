import { type PublishTripInput, TRIP_DEPARTURE_PLACE_MAX_LENGTH, TRIP_SITES } from '@joj/shared';
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SITE_LABELS } from './format';

export type TripFormField = keyof PublishTripInput;

/** Le message à côté d'un champ signalé : absent de l'annonce, ou refusé. */
export type TripFormFieldErrors = Partial<Record<TripFormField, string>>;

interface TripFormProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  pending: boolean;
  onPublish: (input: PublishTripInput) => void;
  /** Les champs que l'annonce n'a pas donnés : signalés tant qu'ils ne sont pas remplis. */
  missingFields?: readonly TripFormField[];
  /** Les champs refusés par l'API, chacun avec son message. */
  fieldErrors?: TripFormFieldErrors;
  /** Sous le bouton : l'attente, ou le refus traduit. */
  children?: ReactNode;
}

const MISSING_IN_ANNOUNCEMENT = 'Absent de votre annonce';

/** « 2026-11-08T15:00 » : l'instant présent, à l'heure de Dakar (UTC+0), au format du champ. */
const dakarNow = () => new Date().toISOString().slice(0, 16);

/**
 * Un nombre entier saisi : des chiffres, groupés ou non par des espaces (« 1 000 », comme le billet
 * l'affiche). Toute autre saisie (« 3,5 », « 2 places », un champ vide) n'est ni tronquée ni
 * devinée : elle vaut `NaN`, qui part `null`, et l'API la refuse comme une saisie invalide.
 */
function wholeNumber(value: FormDataEntryValue | null): number {
  const digits = String(value ?? '').replace(/[\s\u00a0\u202f]/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/**
 * Le formulaire classique d'un trajet. Le site se choisit parmi les trois sites des JOJ ; le jour
 * et l'heure se saisissent à l'heure de Dakar, et le champ ne propose pas d'heure passée (une
 * aide de saisie : la règle reste celle de l'API). Le téléphone est partagé avec l'annonce.
 * Un champ signalé porte `aria-invalid` et son message, lu avec lui. Un champ absent de l'annonce
 * le reste tant qu'il n'est pas rempli, quel que soit le refus suivant ; un champ refusé perd sa
 * marque dès que le conducteur le modifie. À son arrivée, le
 * formulaire prend le focus de ce qui vient de disparaître : le premier champ signalé, sinon le
 * premier champ.
 */
export function TripForm({
  phone,
  onPhoneChange,
  pending,
  onPublish,
  missingFields = [],
  fieldErrors = {},
  children,
}: TripFormProps) {
  const [filled, setFilled] = useState<ReadonlySet<string>>(new Set());
  // Les champs modifiés depuis le dernier refus : leur marque « À vérifier » est retirée.
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const errorOf = (field: TripFormField) =>
    missingFields.includes(field) && !filled.has(field)
      ? MISSING_IN_ANNOUNCEMENT
      : edited.has(field)
        ? undefined
        : fieldErrors[field];
  const siteErrorId = useId();
  const siteError = errorOf('site');
  const formRef = useRef<HTMLFormElement>(null);

  // Au montage seulement : ensuite, le focus reste où le conducteur le met.
  useEffect(() => {
    const form = formRef.current;
    // `querySelector` rend le premier élément du document parmi toutes les variantes : on cherche
    // donc d'abord un champ signalé, et seulement à défaut le premier champ.
    const flagged = form?.querySelector<HTMLInputElement>(
      '[aria-invalid="true"], [data-invalid] input',
    );
    (flagged ?? form?.querySelector<HTMLInputElement>('input'))?.focus();
  }, []);

  /**
   * Un champ qui reçoit une valeur est rempli ; vidé, il ne l'est plus. Toute modification efface
   * sa marque de refus.
   */
  function trackFilled(event: FormEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    setEdited((current) => new Set(current).add(input.name));
    setFilled((current) => {
      const next = new Set(current);
      if (input.value.trim() === '') next.delete(input.name);
      else next.add(input.name);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    // Une nouvelle publication : les marques de son éventuel refus s'affichent de nouveau.
    setEdited(new Set());
    const data = new FormData(event.currentTarget);
    const departure = String(data.get('departureAt') ?? '');
    onPublish({
      departurePlace: String(data.get('departurePlace') ?? ''),
      site: String(data.get('site') ?? ''),
      departureAt: departure && `${departure}:00.000Z`,
      seats: wholeNumber(data.get('seats')),
      pricePerSeat: wholeNumber(data.get('pricePerSeat')),
      driverPhone: phone,
    });
  }

  return (
    <form
      ref={formRef}
      aria-label="Publier avec le formulaire"
      onSubmit={submit}
      onInput={trackFilled}
      className="publish-form"
    >
      <TripField
        label="Lieu de départ"
        error={errorOf('departurePlace')}
        name="departurePlace"
        maxLength={TRIP_DEPARTURE_PLACE_MAX_LENGTH}
        autoComplete="off"
      />
      <fieldset
        className="publish-field"
        aria-describedby={siteError ? siteErrorId : undefined}
        data-invalid={siteError ? true : undefined}
      >
        <legend className="text-sm leading-none font-medium">Site des Jeux</legend>
        <div className="site-choice">
          {TRIP_SITES.map((site) => (
            <label key={site} className="site-choice-option">
              <input type="radio" name="site" value={site} />
              <span>{SITE_LABELS[site]}</span>
            </label>
          ))}
        </div>
        {siteError && (
          <p id={siteErrorId} className="field-error">
            {siteError}
          </p>
        )}
      </fieldset>
      <TripField
        label="Jour et heure de départ"
        error={errorOf('departureAt')}
        name="departureAt"
        type="datetime-local"
        min={dakarNow()}
      />
      <div className="publish-pair">
        <TripField
          label="Places proposées"
          error={errorOf('seats')}
          name="seats"
          inputMode="numeric"
        />
        <TripField
          label="Participation par place, en FCFA"
          error={errorOf('pricePerSeat')}
          name="pricePerSeat"
          inputMode="numeric"
        />
      </div>
      <TripField
        label="Votre téléphone"
        error={errorOf('driverPhone')}
        name="driverPhone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
      />
      <Button type="submit" size="lg" className="thumb-action" disabled={pending}>
        Publier
      </Button>
      {children}
    </form>
  );
}

type TripFieldProps = ComponentProps<typeof Input> & {
  label: string;
  error: string | undefined;
};

/** Un champ du formulaire, avec son étiquette et, s'il est signalé, son message. */
function TripField({ label, error, ...input }: TripFieldProps) {
  const inputId = useId();
  const errorId = useId();
  return (
    <div className="publish-field">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-11"
        {...input}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
