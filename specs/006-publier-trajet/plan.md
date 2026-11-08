# 006 — Publier un trajet depuis son téléphone : plan

**Statut** : Validé

## 1. Résumé

On construit l'écran de publication du conducteur : une page `/publier`, ouverte depuis l'accueil, où il colle son annonce WhatsApp avec son téléphone, ou passe à tout moment à un formulaire classique. Une fois les six tâches terminées, le conducteur publie son trajet par l'annonce ou par le formulaire, arrive de lui-même sur le formulaire quand l'annonce est incomplète ou que l'assistant ne répond pas, voit le trajet tel qu'il a été compris, son code et son lien de gestion à conserver, peut les envoyer sur WhatsApp, et lit chaque refus en français. Le travail est uniquement côté front : les routes de TR1 et TR4 et leur fausse API existent déjà et ne changent pas. Les tâches suivent le parcours du conducteur : publier par l'annonce, publier par le formulaire, basculer vers le formulaire, conserver et envoyer son code, traduire les refus, puis auditer l'accessibilité sur un téléphone. Ouvrir le lien de gestion et annuler son trajet restent pour TR7.

Les mots de la spec et leur nom dans le code :

| Dans la spec                 | Dans le code                             | Ce que c'est                                                                                       |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| annonce                      | `message`, `AnnouncementForm`            | Le texte libre collé par le conducteur, et le formulaire qui l'envoie avec son téléphone.          |
| formulaire classique         | `TripForm`                               | Les champs d'un trajet : lieu de départ, site, date et heure, places, participation, téléphone.    |
| page de publication          | `PublishPage`, route `/publier`          | La page qui passe de l'annonce au formulaire, puis à la confirmation.                              |
| trajet tel qu'il est compris | `PublishedTripResponse`, `PublishedTrip` | Le trajet renvoyé par l'API après publication, et la confirmation qui l'affiche.                   |
| code de gestion              | `managementCode`                         | Le code renvoyé avec le trajet publié, qui permettra de l'annuler.                                 |
| lien de gestion              | `managementLinkOf(tripId)`               | L'adresse `<origine>/trajets/<id>/gestion` : elle désigne le trajet et ne contient jamais le code. |
| informations manquantes      | `missingFields`                          | La liste des champs que l'assistant n'a pas trouvés, renvoyée avec le refus `MESSAGE_UNREADABLE`.  |
| envoyer sur WhatsApp         | `whatsappShareUrl(text)`                 | L'adresse `https://wa.me/?text=…` qui ouvre WhatsApp avec le message prérempli.                    |

## 2. Fichiers par couche

On complète la fonctionnalité front `trips` dans `apps/web/src/features/trips/`, déjà organisée en `api/` puis `components/` par TR5, et on lui ajoute une page. Les six tâches suivent les skills frontend-design et design-motion-principles, comme le demande `CLAUDE.md`. La page `/publier` reprend le bandeau et l'identité de TR5 : le ciel, la frise et la mascotte au repos, qui respire sans danser ; le billet du conducteur reprend le style de celui du supporter. Aucune dépendance n'est ajoutée.

- **shared** : rien. `packages/shared/src/trips.ts` contient déjà `publishTripSchema`, `publishTripFromMessageSchema`, `publishedTripSchema` et `TRIP_DRAFT_FIELDS`.
- **domain, application, infra, http** : rien. L'écran utilise deux routes existantes : `POST /api/trips` publie le trajet du formulaire et renvoie le trajet publié avec son `managementCode` (201) ; `POST /api/trips/from-message` publie le trajet tiré de l'annonce et renvoie la même réponse (201), ou refuse avec `MESSAGE_EMPTY`, `MESSAGE_UNREADABLE` (et `details.missingFields`) ou `ASSISTANT_UNAVAILABLE`.
- **web** :
  - `features/trips/api/trips.api.ts` : on ajoute `publish(input)` et `publishFromMessage(input)`, chacun validé par `publishedTripSchema`.
  - `features/trips/api/trips.queries.ts` : on ajoute `usePublishTrip()` et `usePublishTripFromMessage()`, qui relisent les listes de départs après une publication.
  - `features/trips/components/publish-page.tsx` : la page, sous le bandeau de TR5 (`HeroBackdrop` et `MascotStage` au repos) ; elle tient le mode (annonce ou formulaire), le téléphone saisi, l'annonce envoyée et les champs manquants, puis affiche la confirmation. Pendant que la demande part, elle montre l'état d'attente : « L'assistant lit votre annonce… » (ou « Publication en cours… » pour le formulaire), la mascotte en attente (`data-pose="waiting"`), et le bouton « Publier » désactivé, pour qu'un second appui ne publie pas deux fois.
  - `features/trips/components/announcement-form.tsx` : le grand champ de l'annonce, le téléphone (`type="tel"`, `inputmode="tel"`, `autocomplete="tel"`), le bouton « Publier » et le lien « Remplir le formulaire ».
  - `features/trips/components/trip-form.tsx` : le formulaire classique ; le site se choisit parmi les trois sites, la date et l'heure sont saisies à l'heure de Dakar, avec `min` à l'instant présent comme aide de saisie (la règle du départ passé reste celle de l'API) ; les places et la participation sont en `inputmode="numeric"`, le téléphone comme dans l'annonce ; au-dessus, l'annonce envoyée en lecture seule quand on y arrive depuis l'annonce ; les champs manquants ou refusés portent `aria-invalid` et un message.
  - `features/trips/components/missing-fields.ts` : lit `details.missingFields` d'un refus `MESSAGE_UNREADABLE` avec un schéma Zod sur `TRIP_DRAFT_FIELDS`, sans `as`.
  - `features/trips/components/published-trip.tsx` : la confirmation, en billet comme celui du supporter : le trajet compris (lieu → site, jour et heure, places, participation), puis le code et le lien de gestion présentés comme à conserver, la phrase « Vérifiez votre trajet. S'il y a une erreur, annulez-le avec votre code. », et le bouton « Envoyer sur WhatsApp ».
  - `features/trips/components/management-link.ts` : `managementLinkOf(tripId)`, l'adresse du lien de gestion, construite à partir de l'origine de la page.
  - `features/trips/components/whatsapp-share.ts` : `whatsappShareUrl(text)` et `publishedTripShareText(trip, link)`, le texte prérempli avec le trajet, le code suivi de « Code à garder pour vous, ne le partagez pas » et le lien.
  - `features/trips/components/publish-error-message.ts` : la table des codes de l'API vers les messages en français de la spec, et le message générique pour les autres.
  - `features/trips/components/hero.tsx` : on ajoute sous les panneaux un lien « Vous conduisez ? Proposez un trajet » vers `/publier`.
  - `apps/web/src/routes/publier.tsx` : la route `/publier`, qui rend `PublishPage`.
  - `apps/web/src/styles.css` : les styles de la page et du billet du conducteur.
  - `apps/web/src/mocks/` : rien. La fausse API sert déjà les deux routes avec les mêmes codes, et `handlers.test.ts` les teste.

## 3. Données

Rien n'est stocké : cette tranche n'ajoute ni table ni migration. Le mode, le téléphone et l'annonce vivent dans l'état de la page ; le trajet publié, dans la réponse de la mutation.

## 4. Erreurs

Aucune erreur métier n'est créée : l'écran affiche en français les refus que l'API de TR1 et TR4 renvoie déjà, ou bascule vers le formulaire.

| Code AppError           | Catégorie     | HTTP | Quand                                                                                           | Scénario |
| ----------------------- | ------------- | ---- | ----------------------------------------------------------------------------------------------- | -------- |
| `MESSAGE_UNREADABLE`    | BUSINESS_RULE | 422  | Annonce incomplète : bascule vers le formulaire, champs manquants signalés                      | AS3      |
| `ASSISTANT_UNAVAILABLE` | UNAVAILABLE   | 503  | Assistant indisponible : « L'assistant ne répond pas. Remplissez le formulaire, c'est rapide. » | AS4      |
| `SITE_UNKNOWN`          | VALIDATION    | 400  | « Choisissez Dakar, Diamniadio ou Saly. »                                                       | AS7      |
| `DEPARTURE_IN_PAST`     | VALIDATION    | 400  | « Cette heure est déjà passée. Indiquez un départ à venir. »                                    | AS7      |
| `MESSAGE_EMPTY`         | VALIDATION    | 400  | « Collez votre annonce avant de publier. »                                                      | AS7      |
| `VALIDATION_FAILED`     | VALIDATION    | 400  | « Vérifiez les champs signalés. », et les champs de `errors[].path` marqués                     | AS7      |

Tout autre refus (panne, réseau) affiche « Une erreur est survenue, réessayez. », comme le retient la spec.

## 5. Tests par scénario

Chaque scénario est prouvé par un test d'écran : la page est montée par sa vraie route `/publier` sur la fausse API (`renderRoute`), le faux assistant est réglé par `mockControl.setTripDraft()` ou `failAssistant()`, l'attente est rendue observable par `mockControl.setLatency()`, et le test vérifie ce que l'écran montre et ce qui part sur le réseau (`trackRequests`). L'heure est figée au 8 novembre 2026 à 15 h.

| Scénario | Fichier de test                                     | Niveau | Ce que le test vérifie                                                                                                                                                                                                                                                                                        |
| -------- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `features/trips/components/publish-page.test.tsx`   | écran  | L'annonce et le téléphone partent vers `from-message` ; pendant l'attente, « L'assistant lit votre annonce… », la mascotte en attente et le bouton désactivé, une seule requête malgré deux appuis ; puis la confirmation montre Pikine → Diamniadio, 9 nov. 08:00, 3 places, 1 000 FCFA, le code et le lien. |
| AS2      | `features/trips/components/publish-page.test.tsx`   | écran  | Après « Remplir le formulaire », le téléphone saisi est conservé ; les champs portent leurs attributs de saisie mobile et l'heure son `min` ; pendant l'attente le bouton est désactivé ; le corps envoyé à `POST /api/trips` ; la même confirmation.                                                         |
| AS3      | `features/trips/components/publish-page.test.tsx`   | écran  | Après un 422, le formulaire s'affiche, l'annonce au-dessus, et lieu, heure, places et participation marqués manquants.                                                                                                                                                                                        |
| AS4      | `features/trips/components/publish-page.test.tsx`   | écran  | Assistant en panne : le formulaire s'affiche avec le message de la spec, et aucun trajet n'apparaît dans la liste.                                                                                                                                                                                            |
| AS5      | `features/trips/components/published-trip.test.tsx` | écran  | Le code et le lien sont présentés comme à conserver, avec « Vérifiez votre trajet. S'il y a une erreur, annulez-le avec votre code. » ; le lien vaut `<origine>/trajets/<id>/gestion` et ne contient pas le code.                                                                                             |
| AS6      | `features/trips/components/published-trip.test.tsx` | écran  | Le bouton WhatsApp pointe vers `wa.me` avec un texte qui contient le trajet, le code, la mention de la spec et le lien.                                                                                                                                                                                       |
| AS7      | `features/trips/components/publish-page.test.tsx`   | écran  | Pour chacun des quatre codes renvoyés par la fausse API, le message français attendu ; un autre code donne le message générique.                                                                                                                                                                              |

## 6. Tâches

Six tâches, dans l'ordre du parcours du conducteur ; chacune tient dans un commit.

- [x] T01 [006-AS1] Écrire d'abord `features/trips/components/publish-page.test.tsx` (« 006-AS1: publishes from the announcement and shows the trip as understood »), puis `publish` et `publishFromMessage` dans `trips.api.ts`, `usePublishTripFromMessage()`, `announcement-form.tsx` avec ses attributs de saisie mobile, `publish-page.tsx` sous le bandeau de TR5 et son état d'attente, une première version de `published-trip.tsx`, la route `/publier` et le lien depuis `hero.tsx`, en suivant les skills frontend-design et design-motion-principles
- [x] T02 [006-AS2] Écrire d'abord le cas « 006-AS2: switches to the form at any time, keeping the phone » dans `publish-page.test.tsx`, puis `usePublishTrip()`, `trip-form.tsx` avec ses attributs de saisie mobile et le `min` de l'heure, son état d'attente et le passage de l'annonce au formulaire, en suivant les skills frontend-design et design-motion-principles
- [x] T03 [006-AS3, AS4] Écrire d'abord les cas « 006-AS3: falls back to the form with the announcement above and the missing fields marked » et « 006-AS4: falls back to the form when the assistant does not answer » dans `publish-page.test.tsx`, puis `missing-fields.ts`, l'annonce en lecture seule au-dessus du formulaire et la bascule sur `MESSAGE_UNREADABLE` et `ASSISTANT_UNAVAILABLE`, en suivant les skills frontend-design et design-motion-principles
- [x] T04 [006-AS5, AS6] Écrire d'abord `features/trips/components/published-trip.test.tsx` (« 006-AS5: presents the code and the link to keep, the code never in the link », « 006-AS6: sends the trip, the code with its warning and the link on WhatsApp »), puis `management-link.ts`, `whatsapp-share.ts` et le billet du conducteur dans `published-trip.tsx`, avec la phrase « Vérifiez votre trajet. S'il y a une erreur, annulez-le avec votre code. », en suivant les skills frontend-design et design-motion-principles
- [ ] T05 [006-AS7] Écrire d'abord le cas « 006-AS7: explains each refusal in French » dans `publish-page.test.tsx`, puis `publish-error-message.ts`, son affichage sous l'annonce et sous le formulaire, et les champs de `errors[].path` marqués sur `VALIDATION_FAILED`, en suivant les skills frontend-design et design-motion-principles
- [ ] T06 [006-AS1, AS3] Écrire d'abord `routes/publier.a11y.test.tsx` (« 006-AS1: the announcement and the confirmation are clean », « 006-AS3: the form with missing fields is clean »), puis corriger ce qu'axe relève, en suivant les skills frontend-design et design-motion-principles ; vérifier ensuite dans un navigateur à 360 × 640 et 1440 × 900 le parcours de l'annonce à la confirmation
