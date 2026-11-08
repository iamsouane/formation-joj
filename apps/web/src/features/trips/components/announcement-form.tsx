import { TRIP_MESSAGE_MAX_LENGTH } from '@joj/shared';
import { type FormEvent, type ReactNode, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AnnouncementFormProps {
  message: string;
  onMessageChange: (message: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  pending: boolean;
  onPublish: () => void;
  onSwitchToForm: () => void;
  /** Les champs qu'un refus VALIDATION_FAILED désigne : `message`, `driverPhone`. */
  refusedFields?: readonly string[];
  /** Sous le bouton : l'attente, ou le refus traduit. */
  children?: ReactNode;
}

/**
 * L'annonce telle que le conducteur l'écrit sur WhatsApp, collée dans une bulle comme celles du
 * logo, et son téléphone. À tout moment, le conducteur peut passer au formulaire. Le bouton
 * reste désactivé pendant la publication : un second appui ne publie pas deux fois.
 */
export function AnnouncementForm({
  message,
  onMessageChange,
  phone,
  onPhoneChange,
  pending,
  onPublish,
  onSwitchToForm,
  refusedFields = [],
  children,
}: AnnouncementFormProps) {
  const refused = (field: string) => (refusedFields.includes(field) ? true : undefined);
  const messageId = useId();
  const phoneId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) onPublish();
  }

  return (
    <form aria-label="Publier depuis votre annonce" onSubmit={submit} className="publish-form">
      <div className="publish-field">
        <Label htmlFor={messageId}>Votre annonce WhatsApp</Label>
        <textarea
          id={messageId}
          name="message"
          rows={4}
          maxLength={TRIP_MESSAGE_MAX_LENGTH}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          aria-invalid={refused('message')}
          placeholder="Je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F"
          className="announcement-bubble"
        />
      </div>
      <div className="publish-field">
        <Label htmlFor={phoneId}>Votre téléphone</Label>
        <Input
          id={phoneId}
          name="driverPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={refused('driverPhone')}
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          className="h-11"
        />
      </div>
      <Button type="submit" size="lg" className="thumb-action" disabled={pending}>
        Publier
      </Button>
      {children}
      <p className="publish-switch">
        Vous préférez saisir le trajet vous-même ?{' '}
        <button type="button" onClick={onSwitchToForm} className="publish-switch-button">
          Remplir le formulaire
        </button>
      </p>
    </form>
  );
}
