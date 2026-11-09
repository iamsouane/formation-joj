import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmCancellationProps {
  /** Le bouton qui ouvre la confirmation : « Annuler ma réservation ». */
  trigger: string;
  /** La question posée : « Annuler votre réservation ? ». */
  title: string;
  /** Ce que l'annulation change, en une phrase. */
  description: string;
  /** Le bouton qui renonce : « Garder ma réservation ». */
  keep: string;
  /** L'annulation est en cours : le bouton attend, un second appui n'annule pas deux fois. */
  pending: boolean;
  /** Avant d'ouvrir la question : `false` la garde fermée (un code qui reste à saisir). */
  canAsk?: () => boolean;
  onConfirm: () => void;
}

/**
 * Une annulation est définitive : elle se demande en deux temps. Le premier bouton ouvre la
 * question, et rien ne part tant que « Oui, annuler » n'est pas choisi. Renoncer est le choix le
 * plus proche du pouce sur téléphone, et celui qui reçoit le focus.
 */
export function ConfirmCancellation({
  trigger,
  title,
  description,
  keep,
  pending,
  canAsk,
  onConfirm,
}: ConfirmCancellationProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="thumb-action cancel-action"
          disabled={pending}
          // Radix n'ouvre pas la question si l'appui a été annulé.
          onClick={(event) => {
            if (canAsk && !canAsk()) event.preventDefault();
          }}
        >
          {pending ? 'Annulation en cours…' : trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="confirm-dialog-title">{title}</AlertDialogTitle>
          <AlertDialogDescription className="confirm-dialog-text">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{keep}</AlertDialogCancel>
          <AlertDialogAction className="confirm-dialog-action h-11" onClick={onConfirm}>
            Oui, annuler
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
