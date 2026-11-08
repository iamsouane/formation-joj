# 004 — Publier un trajet depuis un message libre

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR4

## Contexte

Le conducteur écrit déjà son annonce sur WhatsApp ; lui imposer un formulaire le freine. Cette tranche lui permet de coller ce message tel quel : un assistant IA en extrait le trajet, et l'application applique les mêmes contrôles qu'en TR1 avant de publier, car ce que l'assistant propose n'est jamais publié sans contrôle.

## User stories

- En tant que conducteur qui se rend sur un site, je veux publier mon trajet en collant mon annonce WhatsApp avec mon téléphone, afin de ne pas remplir de formulaire.
- En tant que conducteur, je veux recevoir le trajet tel qu'il a été compris, afin de vérifier que l'heure, le site et les places sont les bons.

## Scénarios d'acceptation

### AS1 — Publier un trajet depuis un message

- **Étant donné** nous sommes le 8 novembre 2026 à 15 h, heure de Dakar, et un conducteur colle « je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F » avec son téléphone
- **Quand** il publie son message
- **Alors** il reçoit le trajet publié (Pikine, Diamniadio, 9 novembre 2026 à 8 h, 3 places, 1 000 F) et un code de gestion, comme en TR1, et ce trajet apparaît dans les départs vers Diamniadio

### AS2 — Refuser un site inconnu

- **Étant donné** un message dont l'assistant extrait le site « Thiès »
- **Quand** le conducteur publie son message
- **Alors** la publication est refusée : 400 avec le code SITE_UNKNOWN, et aucun trajet n'est créé

### AS3 — Refuser un départ dans le passé

- **Étant donné** un message dont l'assistant extrait un départ hier à 8 h
- **Quand** le conducteur publie son message
- **Alors** la publication est refusée : 400 avec le code DEPARTURE_IN_PAST, et aucun trajet n'est créé

### AS4 — Refuser un message vide

- **Étant donné** un conducteur dont le message est vide ou ne contient que des espaces
- **Quand** il publie son message
- **Alors** la publication est refusée : 400 avec le code MESSAGE_EMPTY, l'assistant n'est pas sollicité, et aucun trajet n'est créé

### AS5 — Refuser un message où manquent des informations obligatoires

- **Étant donné** un message « je vais à Diamniadio, qui vient ? » dont l'assistant ne tire que le site
- **Quand** le conducteur publie son message
- **Alors** la publication est refusée : 422 avec le code MESSAGE_UNREADABLE et la liste des champs manquants (lieu de départ, heure de départ, places, participation), et aucun trajet n'est créé

## Hors périmètre

- Écran : cette tranche ne livre que l'API.
- Aperçu ou correction du trajet compris avant sa publication.
- Détecter une heure mal interprétée par l'assistant au-delà d'un départ passé (risque assumé du PRD).
- Les tests n'appellent jamais le vrai assistant : il est remplacé par un faux.

## Questions ouvertes

- Lieu de départ absent du message : hypothèse, il compte aussi parmi les champs manquants (422 MESSAGE_UNREADABLE), puisque TR1 l'exige pour publier.
- Participation absente du message : décidé, elle compte parmi les champs manquants (422 MESSAGE_UNREADABLE) ; « gratuit » ou « 0 F » écrit dans le message donne 0. Rien n'est déduit par défaut.
- Assistant indisponible ou réponse inexploitable : décidé, refus 503 avec le code ASSISTANT_UNAVAILABLE, sans scénario ; rien n'est publié.
- Téléphone invalide ou places extraites inférieures à 1 : hypothèse, refusés comme une saisie invalide, comme en TR1.
