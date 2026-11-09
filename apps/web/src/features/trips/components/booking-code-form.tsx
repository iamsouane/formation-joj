import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingCodeFormProps {
  pending: boolean;
  /** Le code saisi, sans les espaces autour ; jamais vide. */
  onSubmit: (bookingCode: string) => void;
  /** Sous le bouton : l'attente. */
  children?: ReactNode;
}

/**
 * Le code de réservation, saisi comme il est écrit sur le billet : en grand, sans majuscule ni
 * correction automatique du téléphone. Le bouton reste désactivé pendant la recherche.
 */
export function BookingCodeForm({ pending, onSubmit, children }: BookingCodeFormProps) {
  const codeId = useId();
  const hintId = useId();
  const [code, setCode] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bookingCode = code.trim();
    if (!pending && bookingCode !== '') onSubmit(bookingCode);
  }

  return (
    <form
      aria-label="Retrouver ma réservation"
      noValidate
      onSubmit={submit}
      className="publish-form"
    >
      <div className="publish-field">
        <Label htmlFor={codeId}>Votre code de réservation</Label>
        <Input
          id={codeId}
          name="bookingCode"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hintId}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="code-input"
        />
        <p id={hintId} className="ticket-note">
          C’est le code affiché sur votre billet, juste après la réservation.
        </p>
      </div>
      <Button type="submit" size="lg" className="thumb-action" disabled={pending}>
        Voir ma réservation
      </Button>
      {children}
    </form>
  );
}
