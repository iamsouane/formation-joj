# 005 — Accueil, chercher et réserver depuis son téléphone : plan

**Statut** : Validé

## 1. Résumé

On construit le premier écran de l'application web : un accueil mobile aux couleurs des JOJ Dakar 2026, avec le logo, la mascotte animée en profondeur et une mention du bootcamp en pied de page. Une fois les six tâches terminées, le supporter choisit un site, voit les départs à venir triés par heure, réserve une place sur un trajet qui n'est pas complet avec son nom et son téléphone, puis voit son code de réservation, le téléphone du conducteur et la mascotte à la flamme qui saute de joie ; chaque refus de l'API est affiché en français. Le travail est uniquement côté front : l'API de TR1 et TR2 et sa fausse API existent déjà et ne changent pas. Les tâches suivent le parcours de l'utilisateur : lister les départs, marquer les trajets complets, réserver, traduire les refus, animer la mascotte, puis tenir la liste dans un écran de téléphone. Publier un trajet, consulter ou annuler restent pour TR6.

Les mots de la spec et leur nom dans le code :

| Dans la spec             | Dans le code                               | Ce que c'est                                                                      |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------- |
| site                     | `TripSite` (`dakar`, `diamniadio`, `saly`) | Un des trois sites des JOJ, déjà défini dans `packages/shared/src/trips.ts`.      |
| départ, trajet           | `TripResponse`                             | Un trajet de la liste, sans le téléphone du conducteur.                           |
| places restantes         | `remainingSeats`                           | Places publiées moins réservations, calculées par l'API.                          |
| participation            | `pricePerSeat`                             | Participation aux frais par place, en francs CFA.                                 |
| réserver                 | `useBookSeat()`, `BookingForm`             | La mutation qui envoie le nom et le téléphone, et le formulaire qui la déclenche. |
| code de réservation      | `bookingCode`                              | Le code renvoyé par l'API après une réservation.                                  |
| accueil                  | `HomePage`, route `/`                      | La page d'accueil, qui porte le site choisi dans son adresse : `/?site=saly`.     |
| mascotte, plans du décor | `MascotStage`                              | La scène de la mascotte debout, avec ses plans en parallaxe.                      |
| mascotte à la flamme     | `FlameCelebration`                         | La mascotte à la flamme qui apparaît avec un saut de joie après la réservation.   |
| moins d'animations       | `useReducedMotion()`                       | Vrai quand le système de l'utilisateur demande moins d'animations.                |

## 2. Fichiers par couche

On crée la fonctionnalité front `trips` dans `apps/web/src/features/trips/`, organisée comme `disciplines` sur la branche `main` : un dossier `api/` pour les appels et le cache, un dossier `components/` pour l'écran. Les tâches T01, T05 et T06, qui dessinent l'écran et ses animations, suivent les skills frontend-design et design-motion-principles, comme le demande `CLAUDE.md`. Aucune dépendance n'est ajoutée : l'animation est faite en CSS, avec quelques variables mises à jour en JavaScript.

- **shared** : rien. `packages/shared/src/trips.ts` contient déjà `tripListSchema`, `bookSeatSchema` et `bookingConfirmationSchema`.
- **domain, application, infra, http** : rien. L'écran utilise deux routes existantes : `GET /api/trips?site=<site>` renvoie les trajets à venir du site triés par heure, et `POST /api/trips/:tripId/bookings` réserve une place et renvoie `{ bookingCode, driverPhone }` avec un statut 201.
- **web** :
  - `apps/web/public/brand/logo.jpg`, `mascotte-debout-800.png`, `mascotte-flamme-800.png` : les images officielles. Le logo est déjà commité ; les deux mascottes en 800 pixels, plus légères que les originaux, sont affichées par une simple balise `<img>` et ajoutées au dépôt par la tâche T05. Les `mascotte-*.png` d'origine, déjà commités, ne sont pas utilisés.
  - `features/trips/api/trips.api.ts` : un appel par route, `upcoming(site)` et `bookSeat(tripId, input)`, chacun validé par son schéma partagé.
  - `features/trips/api/trips.queries.ts` : les clés de cache, `useUpcomingTrips(site)` et `useBookSeat()`, qui relit la liste après une réservation pour mettre à jour les places restantes.
  - `features/trips/components/home-page.tsx` : la page d'accueil, qui assemble la scène de la mascotte, le choix du site, la liste des départs et la réservation.
  - `features/trips/components/site-picker.tsx` : trois boutons radio, Dakar, Diamniadio et Saly, assez grands pour un doigt.
  - `features/trips/components/departure-list.tsx` : la liste des départs, chacun avec lieu, heure, places restantes et participation ; un trajet complet est marqué « Complet » et n'a pas de bouton « Réserver » ; un message s'affiche s'il n'y a aucun départ.
  - `features/trips/components/format.ts` : l'heure à Dakar (« sam. 9 nov., 08:00 ») et les francs CFA (« 1 000 FCFA »), avec `Intl`.
  - `features/trips/components/booking-form.tsx` : le nom et le téléphone, puis la réservation ; affiche le refus traduit sous le formulaire.
  - `features/trips/components/booking-confirmation.tsx` : le code de réservation, présenté comme à conserver, le téléphone du conducteur en lien `tel:` cliquable, qui ouvre l'appel sur le téléphone, et `FlameCelebration`.
  - `features/trips/components/booking-error-message.ts` : la table des codes de l'API vers les messages en français de la spec, et le message générique pour les autres.
  - `features/trips/components/mascot-stage.tsx` et `flame-celebration.tsx` : la scène de la mascotte et la célébration ; ils posent `data-motion="reduced"` quand l'utilisateur demande moins d'animations.
  - `apps/web/src/lib/use-reduced-motion.ts` : le hook qui lit `prefers-reduced-motion` avec `matchMedia` et suit ses changements.
  - `apps/web/src/routes/index.tsx` : la route `/`, qui valide le paramètre `site` avec Zod et rend `HomePage`.
  - `apps/web/src/routes/__root.tsx` : l'en-tête avec le logo, une mise en page mobile, et le pied de page « Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic ».
  - `apps/web/src/styles.css` : la palette officielle (orange, jaune, vert, rouge, noir, blanc) en variables de thème, les animations de la mascotte (entrée avec rebond, respiration, inclinaison, ombre, parallaxe, saut de joie), toutes coupées sous `prefers-reduced-motion: reduce`.
  - `apps/web/src/mocks/` : rien. La fausse API sert déjà ces deux routes avec les mêmes codes d'erreur, et `handlers.test.ts` les teste.

## 3. Données

Rien n'est stocké : cette tranche n'ajoute ni table ni migration. Le site choisi vit dans l'adresse de la page, le reste dans le cache de TanStack Query.

## 4. Erreurs

Aucune erreur métier n'est créée : l'écran affiche en français les refus que l'API de TR2 renvoie déjà.

| Code AppError              | Catégorie  | HTTP | Quand                                                                 | Scénario |
| -------------------------- | ---------- | ---- | --------------------------------------------------------------------- | -------- |
| `TRIP_FULL`                | CONFLICT   | 409  | Plus aucune place : « Ce trajet est complet »                         | AS5      |
| `PASSENGER_ALREADY_BOOKED` | CONFLICT   | 409  | Ce téléphone a déjà réservé : « Vous avez déjà réservé ce trajet »    | AS5      |
| `TRIP_DEPARTED`            | CONFLICT   | 409  | Le trajet est parti : « Ce trajet est déjà parti »                    | AS5      |
| `TRIP_CANCELLED`           | CONFLICT   | 409  | Le conducteur a annulé : « Ce trajet a été annulé »                   | AS5      |
| `VALIDATION_FAILED`        | VALIDATION | 400  | Nom ou téléphone invalide : « Vérifiez votre nom et votre téléphone » | AS5      |

Tout autre refus (`TRIP_NOT_FOUND`, panne, réseau) affiche « Une erreur est survenue, réessayez », comme le retient la spec.

## 5. Tests par scénario

Chaque scénario est prouvé par un test d'écran : la page est montée par sa vraie route sur la fausse API (`renderRoute`), et le test vérifie ce que l'écran montre et ce qui part sur le réseau (`trackRequests`). Le CSS n'est pas appliqué dans jsdom : les animations et la mise en page se vérifient par l'état que le code pose, puis dans un vrai navigateur.

| Scénario | Fichier de test                                     | Niveau | Ce que le test vérifie                                                                                                                 |
| -------- | --------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `features/trips/components/home-page.test.tsx`      | écran  | Choisir Diamniadio affiche Pikine puis Guédiawaye, chacun avec lieu, heure, places restantes et participation.                         |
| AS2      | `features/trips/components/home-page.test.tsx`      | écran  | Sans trajet vers Saly, le message « Aucun départ à venir vers Saly » s'affiche.                                                        |
| AS3      | `features/trips/components/departure-list.test.tsx` | écran  | Le trajet complet vers Dakar est marqué « Complet » et n'a pas de bouton « Réserver ».                                                 |
| AS4      | `features/trips/components/booking-form.test.tsx`   | écran  | Awa réserve Pikine → Diamniadio : le corps envoyé, puis le code, le téléphone du conducteur en lien `tel:` et la mascotte à la flamme. |
| AS5      | `features/trips/components/booking-form.test.tsx`   | écran  | Pour chacun des cinq codes, renvoyé par la fausse API, le message français attendu ; un autre code donne le message générique.         |
| AS6      | `features/trips/components/mascot-stage.test.tsx`   | écran  | Un mouvement du pointeur change l'inclinaison de la scène ; avec moins d'animations, `data-motion="reduced"` et aucune inclinaison.    |
| AS7      | `routes/index.a11y.test.tsx`                        | écran  | Une fois un site choisi, la scène passe en mode compact et la liste suit le choix du site ; chaque état est propre pour axe.           |

## 6. Tâches

Six tâches, dans l'ordre du parcours de l'utilisateur ; chacune tient dans un commit.

- [x] T01 [005-AS1, AS2] Écrire d'abord `features/trips/components/home-page.test.tsx` (« 005-AS1: lists the upcoming departures of the chosen site by time », « 005-AS2: says when no departure is planned »), puis `trips.api.ts`, `trips.queries.ts`, `format.ts`, `site-picker.tsx`, `departure-list.tsx`, `home-page.tsx` et la route `/` avec son paramètre `site`, en suivant les skills frontend-design et design-motion-principles
- [x] T02 [005-AS3] Écrire d'abord `features/trips/components/departure-list.test.tsx` (« 005-AS3: marks a full trip and offers no booking »), puis le badge « Complet » et le bouton « Réserver » des trajets qui ont des places
- [x] T03 [005-AS4] Écrire d'abord `features/trips/components/booking-form.test.tsx` (« 005-AS4: books a seat and shows the code, the driver phone and the flame mascot »), puis `useBookSeat()`, `booking-form.tsx`, `booking-confirmation.tsx` (téléphone du conducteur en lien `tel:`) et `flame-celebration.tsx`
- [x] T04 [005-AS5] Écrire d'abord le cas « 005-AS5: explains each refusal in French » dans `booking-form.test.tsx`, puis `booking-error-message.ts` et son affichage dans le formulaire
- [ ] T05 [005-AS6] Écrire d'abord `features/trips/components/mascot-stage.test.tsx` (« 005-AS6: tilts the mascot with the pointer, or keeps it still on reduced motion »), puis `use-reduced-motion.ts`, `mascot-stage.tsx`, la palette et les animations dans `styles.css`, le logo et le pied de page dans `__root.tsx`, en suivant les skills frontend-design et design-motion-principles ; le commit ajoute `mascotte-debout-800.png` et `mascotte-flamme-800.png`
- [ ] T06 [005-AS7] Écrire d'abord `routes/index.a11y.test.tsx` (« 005-AS7: shows the departures right after the site picker, with a compact stage »), puis le mode compact de la scène, en suivant les skills frontend-design et design-motion-principles ; vérifier ensuite dans un navigateur à 360 × 640 que le premier départ est visible sans défiler
