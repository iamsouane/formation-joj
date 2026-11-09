import type { MouseEvent } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { isPhonePointer, whatsappAppUrl, whatsappShareUrl } from './whatsapp-share';

/**
 * Le bouton « Envoyer sur WhatsApp » d'un billet, celui du conducteur comme celui du supporter.
 * Sur téléphone, la feuille de partage du système, avec le seul texte : un `url` à part, WhatsApp
 * ne garderait que lui. Sans feuille de partage, le lien ouvre l'application WhatsApp ; sur
 * ordinateur, WhatsApp Web. Si le partage échoue (hors annulation), on ouvre l'application.
 */
export function WhatsappShareLink({ message }: { message: string }) {
  const onPhone = isPhonePointer();

  function share(event: MouseEvent<HTMLAnchorElement>) {
    if (!onPhone || typeof navigator.share !== 'function') return;
    event.preventDefault();
    navigator.share({ text: message }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      window.location.assign(whatsappAppUrl(message));
    });
  }

  return (
    <a
      href={onPhone ? whatsappAppUrl(message) : whatsappShareUrl(message)}
      onClick={share}
      // L'application WhatsApp s'ouvre dans le même onglet, comme une adresse tapée ;
      // WhatsApp Web, dans un nouvel onglet.
      {...(onPhone ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={buttonVariants({ size: 'lg', className: 'thumb-action whatsapp-action' })}
    >
      Envoyer sur WhatsApp
    </a>
  );
}
