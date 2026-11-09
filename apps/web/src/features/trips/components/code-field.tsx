import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CodeFieldProps {
  label: string;
  name: string;
  /** Où trouver ce code, en une phrase. */
  hint: string;
  value: string;
  onChange: (value: string) => void;
  /** Le refus à dire sous le champ, déjà en français. */
  error: string | undefined;
  /** Le refus porte sur le code saisi : le champ est signalé. */
  invalid: boolean;
}

/**
 * Un code à saisir, de réservation ou de gestion : en grand, comme il est imprimé sur le billet,
 * sans majuscule ni correction automatique du téléphone. Son refus s'affiche juste dessous.
 */
export function CodeField({ label, name, hint, value, onChange, error, invalid }: CodeFieldProps) {
  const codeId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <div className="publish-field">
      <Label htmlFor={codeId}>{label}</Label>
      <Input
        id={codeId}
        name={name}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={error === undefined ? hintId : `${errorId} ${hintId}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="code-input"
      />
      {error !== undefined && (
        <p id={errorId} role="alert" className="font-semibold text-destructive">
          {error}
        </p>
      )}
      <p id={hintId} className="ticket-note">
        {hint}
      </p>
    </div>
  );
}
