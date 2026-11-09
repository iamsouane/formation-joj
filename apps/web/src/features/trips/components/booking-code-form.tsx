import { type FormEvent, type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CODE_MISSING_MESSAGE, codeErrorMessage, isCodeRefusal } from './code-error-message';
import { CodeField } from './code-field';

interface BookingCodeFormProps {
  pending: boolean;
  /** Le code saisi, sans les espaces autour ; jamais vide. */
  onSubmit: (bookingCode: string) => void;
  /** Le refus de la dernière recherche, tel que l'API l'a renvoyé. */
  error: unknown;
  /** Le supporter corrige son code : le refus précédent ne vaut plus. */
  onEdit: () => void;
  /** Sous le bouton : l'attente. */
  children?: ReactNode;
}

/**
 * Le code de réservation à saisir pour retrouver son billet. Un champ vide ne part pas vers
 * l'API : le supporter est invité à saisir son code. Le bouton reste désactivé pendant la
 * recherche.
 */
export function BookingCodeForm({
  pending,
  onSubmit,
  error,
  onEdit,
  children,
}: BookingCodeFormProps) {
  const [code, setCode] = useState('');
  const [missing, setMissing] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const bookingCode = code.trim();
    if (bookingCode === '') setMissing(true);
    else onSubmit(bookingCode);
  }

  function edit(value: string) {
    setCode(value);
    setMissing(false);
    onEdit();
  }

  return (
    <form
      aria-label="Retrouver ma réservation"
      noValidate
      onSubmit={submit}
      className="publish-form"
    >
      <CodeField
        label="Votre code de réservation"
        name="bookingCode"
        hint="C’est le code affiché sur votre billet, juste après la réservation."
        value={code}
        onChange={edit}
        error={missing ? CODE_MISSING_MESSAGE : error == null ? undefined : codeErrorMessage(error)}
        invalid={missing || isCodeRefusal(error)}
      />
      <Button type="submit" size="lg" className="thumb-action" disabled={pending}>
        Voir ma réservation
      </Button>
      {children}
    </form>
  );
}
