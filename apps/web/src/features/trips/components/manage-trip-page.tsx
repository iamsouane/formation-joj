import type { TripDetailsResponse } from '@joj/shared';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useCancelTrip, useTrip } from '../api/trips.queries';
import {
  CODE_MISSING_MESSAGE,
  codeErrorMessage,
  isCodeRefusal,
  managementLinkErrorMessage,
} from './code-error-message';
import { CodeField } from './code-field';
import { ConfirmCancellation } from './confirm-cancellation';
import {
  formatDepartureDay,
  formatDepartureTime,
  formatPlace,
  formatPrice,
  formatRemainingSeats,
  SITE_LABELS,
} from './format';
import { PageBand } from './page-band';

/**
 * Gérer son trajet depuis son lien de gestion. Sous le bandeau de l'accueil, le conducteur voit
 * d'abord le trajet que son lien désigne, tel que la liste des départs le montre, pour le
 * reconnaître ; puis il saisit son code de gestion et annule, après confirmation. Le code vit dans
 * l'état de la page et part dans le corps de la demande, jamais dans une adresse. Un trajet déjà
 * annulé ne demande plus rien. Chaque refus (lien qui ne désigne aucun trajet, code erroné) se lit
 * en français.
 */
export function ManageTripPage({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const cancellation = useCancelTrip();

  return (
    <>
      <PageBand title={['Gérer', 'mon trajet']} />
      {/* La colonne de `/publier` : mêmes largeurs, mêmes espacements. */}
      <div data-column="content" className="content-column publish-content">
        <p role="status" className="publish-status">
          {trip.isPending && 'Chargement de votre trajet…'}
        </p>
        {/* Sans trajet à montrer seulement : une relecture qui échoue ne retire pas le trajet affiché. */}
        {trip.isError && !trip.data && (
          <p role="alert" className="font-semibold text-destructive">
            {managementLinkErrorMessage(trip.error)}
          </p>
        )}
        {trip.data && (
          <ManagedTrip
            trip={trip.data}
            justCancelled={cancellation.isSuccess}
            pending={cancellation.isPending}
            error={cancellation.isError ? cancellation.error : undefined}
            onEdit={() => {
              if (cancellation.isError) cancellation.reset();
            }}
            onCancel={(managementCode) => cancellation.mutate({ tripId, managementCode })}
          />
        )}
      </div>
    </>
  );
}

interface ManagedTripProps {
  trip: TripDetailsResponse;
  /** Le conducteur vient de l'annuler ici même : « Votre trajet est annulé ». */
  justCancelled: boolean;
  pending: boolean;
  /** Le refus de la dernière annulation, tel que l'API l'a renvoyé. */
  error: unknown;
  /** Le conducteur corrige son code : le refus précédent ne vaut plus. */
  onEdit: () => void;
  onCancel: (managementCode: string) => void;
}

/**
 * Le trajet du lien, en billet comme les autres : l'heure, le trajet, les places restantes et la
 * participation. Dessous, le code de gestion à saisir et l'annulation ; une fois le trajet annulé,
 * la bande rouge le dit en tête, et il ne reste rien à saisir.
 */
function ManagedTrip({ trip, justCancelled, pending, error, onEdit, onCancel }: ManagedTripProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [code, setCode] = useState('');
  const [missing, setMissing] = useState(false);
  const managementCode = code.trim();

  function edit(value: string) {
    setCode(value);
    setMissing(false);
    onEdit();
  }

  /** Sans code, la question ne s'ouvre pas : le conducteur est invité à le saisir. */
  function canAsk(): boolean {
    setMissing(managementCode === '');
    return managementCode !== '';
  }

  // Le bouton « Annuler mon trajet » a disparu avec l'annulation : le focus passe au trajet.
  useEffect(() => {
    if (justCancelled) titleRef.current?.focus();
  }, [justCancelled]);

  return (
    <section
      aria-labelledby={titleId}
      className="ticket"
      data-status={trip.cancelled ? 'cancelled' : 'active'}
    >
      <header className="ticket-trip">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="ticket-title">
          Votre trajet
        </h2>
        <p className="ticket-when" data-part="ticket-time">
          <time dateTime={trip.departureAt}>
            <span className="ticket-time">{formatDepartureTime(trip.departureAt)}</span>{' '}
            <span className="ticket-day">{formatDepartureDay(trip.departureAt)}</span>
          </time>
        </p>
        <p className="ticket-route" data-part="ticket-route">
          {formatPlace(trip.departurePlace)} → {SITE_LABELS[trip.site]}
        </p>
        <p className="ticket-terms">
          {/* Un trajet annulé n'a plus de places à proposer. */}
          {!trip.cancelled && (
            <span>
              {formatRemainingSeats(trip.remainingSeats)} sur {trip.seats}
            </span>
          )}
          <span>{formatPrice(trip.pricePerSeat)} par place</span>
        </p>
      </header>
      {/*
       * Toujours présente, vide tant que le trajet tient : l'annulation y est annoncée à la
       * lecture. À l'écran, elle passe en tête du billet (`order` dans styles.css).
       */}
      <p role="status" className="ticket-status" data-part="trip-status">
        {trip.cancelled &&
          (justCancelled ? 'Votre trajet est annulé' : 'Ce trajet est déjà annulé')}
      </p>
      {trip.cancelled ? (
        <p className="ticket-note">
          Il n’apparaît plus dans les départs. Vos passagers le voient en consultant leur
          réservation.
        </p>
      ) : (
        <>
          <div className="ticket-tear" aria-hidden="true" />
          <form
            aria-label="Annuler mon trajet"
            noValidate
            onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
            className="publish-form"
          >
            <CodeField
              label="Votre code de gestion"
              name="managementCode"
              hint="C’est le code reçu à la publication de votre trajet."
              value={code}
              onChange={edit}
              error={
                missing ? CODE_MISSING_MESSAGE : error == null ? undefined : codeErrorMessage(error)
              }
              invalid={missing || isCodeRefusal(error)}
            />
            <ConfirmCancellation
              trigger="Annuler mon trajet"
              title="Annuler votre trajet ?"
              description="Il ne sera plus proposé aux supporters, et vos passagers le verront annulé. Une annulation est définitive."
              keep="Garder mon trajet"
              pending={pending}
              canAsk={canAsk}
              onConfirm={() => onCancel(managementCode)}
            />
          </form>
        </>
      )}
    </section>
  );
}
