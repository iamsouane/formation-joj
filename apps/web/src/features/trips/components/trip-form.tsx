import { type PublishTripInput, TRIP_DEPARTURE_PLACE_MAX_LENGTH, TRIP_SITES } from '@joj/shared';
import { type FormEvent, type ReactNode, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SITE_LABELS } from './format';

interface TripFormProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  pending: boolean;
  onPublish: (input: PublishTripInput) => void;
  /** Sous le bouton : l'attente, ou le refus traduit. */
  children?: ReactNode;
}

/** « 2026-11-08T15:00 » : l'instant présent, à l'heure de Dakar (UTC+0), au format du champ. */
const dakarNow = () => new Date().toISOString().slice(0, 16);

/** Un nombre saisi ; un champ vide ou illisible n'est pas deviné, l'API le refusera. */
const wholeNumber = (value: FormDataEntryValue | null) => Number.parseInt(String(value ?? ''), 10);

/**
 * Le formulaire classique d'un trajet. Le site se choisit parmi les trois sites des JOJ ; le jour
 * et l'heure se saisissent à l'heure de Dakar, et le champ ne propose pas d'heure passée (une
 * aide de saisie : la règle reste celle de l'API). Le téléphone est partagé avec l'annonce.
 */
export function TripForm({ phone, onPhoneChange, pending, onPublish, children }: TripFormProps) {
  const ids = {
    place: useId(),
    departure: useId(),
    seats: useId(),
    price: useId(),
    phone: useId(),
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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
    <form aria-label="Publier avec le formulaire" onSubmit={submit} className="publish-form">
      <div className="publish-field">
        <Label htmlFor={ids.place}>Lieu de départ</Label>
        <Input
          id={ids.place}
          name="departurePlace"
          maxLength={TRIP_DEPARTURE_PLACE_MAX_LENGTH}
          autoComplete="off"
          className="h-11"
        />
      </div>
      <fieldset className="publish-field">
        <legend className="text-sm leading-none font-medium">Site des Jeux</legend>
        <div className="site-choice">
          {TRIP_SITES.map((site) => (
            <label key={site} className="site-choice-option">
              <input type="radio" name="site" value={site} />
              <span>{SITE_LABELS[site]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="publish-field">
        <Label htmlFor={ids.departure}>Jour et heure de départ</Label>
        <Input
          id={ids.departure}
          name="departureAt"
          type="datetime-local"
          min={dakarNow()}
          className="h-11"
        />
      </div>
      <div className="publish-pair">
        <div className="publish-field">
          <Label htmlFor={ids.seats}>Places proposées</Label>
          <Input id={ids.seats} name="seats" inputMode="numeric" className="h-11" />
        </div>
        <div className="publish-field">
          <Label htmlFor={ids.price}>Participation par place, en FCFA</Label>
          <Input id={ids.price} name="pricePerSeat" inputMode="numeric" className="h-11" />
        </div>
      </div>
      <div className="publish-field">
        <Label htmlFor={ids.phone}>Votre téléphone</Label>
        <Input
          id={ids.phone}
          name="driverPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          className="h-11"
        />
      </div>
      <Button type="submit" size="lg" className="thumb-action" disabled={pending}>
        Publier
      </Button>
      {children}
    </form>
  );
}
