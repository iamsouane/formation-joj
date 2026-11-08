import type { PublishedTripResponse, PublishTripInput } from '@joj/shared';
import { useId, useState } from 'react';
import { ApiError } from '@/lib/api';
import { usePublishTrip, usePublishTripFromMessage } from '../api/trips.queries';
import { AnnouncementForm } from './announcement-form';
import { BrandLink } from './brand-link';
import { HeroBackdrop } from './hero-backdrop';
import { MascotStage } from './mascot-stage';
import { missingFieldsOf, type TripDraftField } from './missing-fields';
import { publishErrorMessage, refusedFieldsOf } from './publish-error-message';
import { PublishedTrip } from './published-trip';
import { TripForm, type TripFormFieldErrors } from './trip-form';

const REFUSED_FIELD = 'À vérifier';

/**
 * Pourquoi l'application a amené le conducteur au formulaire : une annonce incomplète (avec ce
 * qui y manque), une annonce dont l'API refuse des champs (avec ces champs), ou un assistant qui
 * ne répond pas.
 */
type Fallback =
  | { reason: 'unreadable'; missing: TripDraftField[] }
  | { reason: 'refused'; error: ApiError; refused: TripFormFieldErrors }
  | { reason: 'unavailable' };

/** Les champs qu'un refus VALIDATION_FAILED désigne, marqués « À vérifier ». */
const refusedMarks = (error: unknown): TripFormFieldErrors =>
  Object.fromEntries(refusedFieldsOf(error).map((field) => [field, REFUSED_FIELD]));

/** L'annonce n'a pas pu être lue jusqu'au bout : le conducteur la complète dans le formulaire. */
function fallbackFor(error: unknown): Fallback | null {
  const missing = missingFieldsOf(error);
  if (missing) {
    return { reason: 'unreadable', missing };
  }
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
    return { reason: 'refused', error, refused: refusedMarks(error) };
  }
  return error instanceof ApiError && error.code === 'ASSISTANT_UNAVAILABLE'
    ? { reason: 'unavailable' }
    : null;
}

/**
 * Publier un trajet depuis son téléphone. Sous le bandeau de l'accueil (le ciel, la frise, la
 * mascotte au repos), le conducteur colle son annonce WhatsApp avec son téléphone, ou passe à
 * tout moment au formulaire classique, sans perdre son téléphone. L'application l'y amène
 * d'elle-même quand l'annonce est incomplète ou que l'API en refuse des champs (son annonce
 * reste au-dessus, ce qui y manque ou y est refusé est signalé), ou quand l'assistant ne répond
 * pas. Le trajet publié s'affiche ensuite en billet, avec
 * son code et son lien de gestion.
 */
export function PublishPage() {
  const [mode, setMode] = useState<'announcement' | 'form'>('announcement');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [published, setPublished] = useState<PublishedTripResponse>();
  const [fallback, setFallback] = useState<Fallback>();
  const fromMessage = usePublishTripFromMessage();
  const fromForm = usePublishTrip();
  const waiting = fromMessage.isPending || fromForm.isPending;

  function publishFromMessage() {
    fromMessage.mutate(
      { message, driverPhone: phone },
      {
        onSuccess: setPublished,
        onError: (error) => {
          const next = fallbackFor(error);
          if (!next) return;
          setFallback(next);
          setMode('form');
        },
      },
    );
  }

  function publishFromForm(input: PublishTripInput) {
    fromForm.mutate(input, { onSuccess: setPublished });
  }

  // Un refus de l'annonce qui ne mène pas au formulaire s'affiche sous l'annonce.
  const announcementError =
    fromMessage.isError && !fallbackFor(fromMessage.error) ? fromMessage.error : null;
  // Les champs refusés par l'API, au formulaire ou à l'annonce ; ceux absents de l'annonce, le
  // formulaire les signale lui-même tant qu'ils ne sont pas remplis.
  const refusedFields: TripFormFieldErrors | undefined = fromForm.isError
    ? refusedMarks(fromForm.error)
    : fallback?.reason === 'refused'
      ? fallback.refused
      : undefined;
  const missingFields = fallback?.reason === 'unreadable' ? fallback.missing : undefined;

  return (
    <>
      <PublishBand waiting={waiting} />
      <div data-column="content" className="content-column publish-content">
        {published ? (
          <PublishedTrip trip={published} />
        ) : mode === 'form' ? (
          <>
            {fallback && <AnnouncementRecall message={message} fallback={fallback} />}
            <TripForm
              phone={phone}
              onPhoneChange={setPhone}
              pending={waiting}
              onPublish={publishFromForm}
              missingFields={missingFields}
              fieldErrors={refusedFields}
            >
              <p role="status" className="publish-status">
                {waiting && 'Publication en cours…'}
              </p>
              {fromForm.isError && <PublishError error={fromForm.error} />}
            </TripForm>
          </>
        ) : (
          <AnnouncementForm
            message={message}
            onMessageChange={setMessage}
            phone={phone}
            onPhoneChange={setPhone}
            pending={waiting}
            onPublish={publishFromMessage}
            onSwitchToForm={() => setMode('form')}
          >
            <p role="status" className="publish-status">
              {waiting && 'L’assistant lit votre annonce…'}
            </p>
            {announcementError && <PublishError error={announcementError} />}
          </AnnouncementForm>
        )}
      </div>
    </>
  );
}

/** Un refus de la publication, dit en français. */
function PublishError({ error }: { error: unknown }) {
  return (
    <p role="alert" className="font-semibold text-destructive">
      {publishErrorMessage(error)}
    </p>
  );
}

/**
 * Au-dessus du formulaire, l'annonce du conducteur, telle qu'il l'a collée, pour qu'il la
 * relise en complétant ; et pourquoi il est là.
 */
function AnnouncementRecall({ message, fallback }: { message: string; fallback: Fallback }) {
  const captionId = useId();
  return (
    <div className="announcement-recall">
      {fallback.reason === 'unavailable' ? (
        <p role="alert" className="publish-notice">
          L’assistant ne répond pas. Remplissez le formulaire, c’est rapide.
        </p>
      ) : fallback.reason === 'refused' ? (
        <p role="alert" className="publish-notice">
          {publishErrorMessage(fallback.error)}
        </p>
      ) : (
        <p className="publish-notice">
          Il manque des informations dans votre annonce : complétez les champs signalés.
        </p>
      )}
      <figure aria-labelledby={captionId} className="announcement-recall-figure">
        <figcaption id={captionId} className="announcement-recall-caption">
          Votre annonce
        </figcaption>
        <blockquote className="announcement-bubble announcement-recall-quote">{message}</blockquote>
      </figure>
    </div>
  );
}

/**
 * Le bandeau de l'accueil, replié : la marque ramène à l'accueil, le titre dit où l'on est, la
 * mascotte respire. Pendant une publication, elle attend (`data-pose="waiting"`).
 */
function PublishBand({ waiting }: { waiting: boolean }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="hero" data-state="band" data-fold="band">
      <HeroBackdrop compact />
      <div className="hero-inner">
        <div className="hero-copy">
          <BrandLink />
          <h1 id={titleId} className="hero-title">
            <span>Proposer</span> <span>un trajet</span>
          </h1>
        </div>
        <div className="hero-scene">
          <div className="publish-mascot" data-pose={waiting ? 'waiting' : 'rest'}>
            <MascotStage compact />
          </div>
        </div>
      </div>
    </section>
  );
}
