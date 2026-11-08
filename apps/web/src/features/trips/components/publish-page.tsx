import type { PublishedTripResponse, PublishTripInput } from '@joj/shared';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { usePublishTrip, usePublishTripFromMessage } from '../api/trips.queries';
import { AnnouncementForm } from './announcement-form';
import { HeroBackdrop } from './hero-backdrop';
import { MascotStage } from './mascot-stage';
import { PublishedTrip } from './published-trip';
import { TripForm } from './trip-form';

/**
 * Publier un trajet depuis son téléphone. Sous le bandeau de l'accueil (le ciel, la frise, la
 * mascotte au repos), le conducteur colle son annonce WhatsApp avec son téléphone, ou passe à
 * tout moment au formulaire classique, sans perdre son téléphone ; le trajet publié s'affiche
 * ensuite en billet, avec son code et son lien de gestion.
 */
export function PublishPage() {
  const [mode, setMode] = useState<'announcement' | 'form'>('announcement');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [published, setPublished] = useState<PublishedTripResponse>();
  const fromMessage = usePublishTripFromMessage();
  const fromForm = usePublishTrip();
  const waiting = fromMessage.isPending || fromForm.isPending;

  function publishFromMessage() {
    fromMessage.mutate({ message, driverPhone: phone }, { onSuccess: setPublished });
  }

  function publishFromForm(input: PublishTripInput) {
    fromForm.mutate(input, { onSuccess: setPublished });
  }

  return (
    <>
      <PublishBand waiting={waiting} />
      <div data-column="content" className="content-column publish-content">
        {published ? (
          <PublishedTrip trip={published} />
        ) : mode === 'form' ? (
          <TripForm
            phone={phone}
            onPhoneChange={setPhone}
            pending={waiting}
            onPublish={publishFromForm}
          >
            <p role="status" className="publish-status">
              {waiting && 'Publication en cours…'}
            </p>
          </TripForm>
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
          </AnnouncementForm>
        )}
      </div>
    </>
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
          <Link to="/" className="hero-brand">
            <span className="hero-logo">
              <img src="/brand/logo.jpg" alt="" width={900} height={900} />
            </span>
            <span>
              <span className="block">Covoiturage</span> <span className="block">des JOJ</span>
            </span>
          </Link>
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
