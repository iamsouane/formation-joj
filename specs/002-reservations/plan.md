# 002 — Réserver une place : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module `trips` la réservation d'une place : un supporter donne son nom et son téléphone, et reçoit un code de réservation et le téléphone du conducteur. À la fin, un supporter réserve une place par l'API sur un trajet à venir, et la liste des départs montre pour chaque trajet ses places restantes. Un trajet complet, une seconde réservation du même téléphone, un trajet déjà parti et un trajet inexistant sont refusés avec les codes `TRIP_FULL`, `PASSENGER_ALREADY_BOOKED`, `TRIP_DEPARTED` et `TRIP_NOT_FOUND`. Le travail tient en cinq tâches, dans l'ordre des couches : schémas partagés et domaine, cas d'usage, persistance, routes HTTP, puis fausse API du front. Les téléphones du supporter et du conducteur sont normalisés avant d'être comparés et enregistrés, pour que « 77 123 45 67 » et « +221771234567 » désignent le même supporter. Il n'y a ni écran, ni réservation de plusieurs places, ni consultation ou annulation d'une réservation.

Les mots de la spec et leur nom dans le code :

| Dans la spec             | Dans le code       | Ce que c'est                                                                           |
| ------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| réservation              | `Booking`          | L'entité du domaine : une place réservée par un supporter sur un trajet.               |
| réserver une place       | `BookSeat`         | Le cas d'usage qui vérifie les règles, crée la réservation et l'enregistre.            |
| nom du supporter         | `passengerName`    | Le nom saisi par le supporter, par exemple « Awa ».                                    |
| téléphone du supporter   | `passengerPhone`   | Le numéro du supporter ; il sert à reconnaître un supporter qui a déjà réservé.        |
| code de réservation      | `bookingCode`      | Le code secret renvoyé au supporter, qui servira à consulter et annuler en TR3.        |
| téléphone du conducteur  | `driverPhone`      | Déjà stocké en TR1 ; renvoyé seulement au supporter qui vient de réserver.             |
| places restantes         | `remainingSeats`   | Le nombre de places du trajet moins le nombre de réservations.                         |
| supporters déjà inscrits | `passengerPhones`  | Les téléphones des réservations d'un trajet, que le trajet connaît pour appliquer AS4. |
| téléphone normalisé      | `normalisePhone()` | Le numéro sans espaces ni tirets, et sans préfixe `+221` ou `00221` : « 771234567 ».   |

## 2. Fichiers par couche

On ne crée pas de nouveau module : la réservation est ajoutée au module `trips` (`apps/api/src/modules/trips/`), car ses règles portent sur le trajet (places, heure de départ) et la liste des trajets doit connaître le nombre de réservations. Les fichiers suivent l'organisation déjà en place dans ce module.

- **shared** : `packages/shared/src/trips.ts` reçoit le schéma du corps de réservation `bookSeatSchema` (`passengerName`, `passengerPhone`, chaînes non vides, coupées aux deux bouts, de 100 et 20 caractères au plus), le schéma du paramètre de chemin `tripIdParamSchema` (`tripId`, un UUID) et le schéma de la réponse `bookingConfirmationSchema` (`bookingCode`, `driverPhone`). `tripSchema` gagne le champ `remainingSeats`. `packages/shared/src/trips.spec.ts` teste ces schémas.
- **domain** :
  - `domain/phone.ts` exporte `normalisePhone()`, qui retire les espaces et les tirets, puis le préfixe `+221` ou `00221` : « 77 123 45 67 », « 77-123-45-67 », « +221771234567 » et « 00221 77 123 45 67 » donnent tous « 771234567 ». Ce n'est pas une nouvelle règle, seulement la façon de lire un téléphone, comme `parseTripSite()` pour le site. `domain/phone.spec.ts` la teste.
  - `domain/booking.ts` définit l'entité `Booking` (`id`, `tripId`, `passengerName`, `passengerPhone`, `bookingCode`, `createdAt`). `Booking.create()` reçoit le trajet et l'instant présent, normalise le téléphone du supporter avec `normalisePhone()`, puis refuse, dans cet ordre : un trajet déjà parti (`TRIP_DEPARTED`), un téléphone qui a déjà réservé ce trajet (`PASSENGER_ALREADY_BOOKED`), un trajet sans place restante (`TRIP_FULL`). `Booking.restore()` la reconstruit depuis la base sans rejouer ces règles.
  - `domain/trip.ts` : `Trip.create()` normalise désormais le téléphone du conducteur avec `normalisePhone()`. `Trip` reçoit la liste `passengerPhones` (vide à la création, relue depuis la base par `restore()`), le calcul `remainingSeats` et la méthode `hasPassenger(phone)`, qui compare des téléphones normalisés ; elles sont utilisées par `Booking.create()`.
  - `domain/trips.errors.ts` ajoute les codes `TRIP_FULL`, `PASSENGER_ALREADY_BOOKED`, `TRIP_DEPARTED` et `TRIP_NOT_FOUND`.
  - `domain/booking.spec.ts` contient les tests unitaires de la réservation ; `domain/trip.spec.ts` reçoit celui des places restantes.
- **application** :
  - `application/trip.repository.ts` : le port `TripRepository` reçoit `reserve(tripId, book)`. Cette méthode lit le trajet avec ses réservations, appelle `book(trip)` qui applique les règles et renvoie la `Booking`, puis l'enregistre ; elle renvoie `undefined` si le trajet n'existe pas. Le rappel permet à l'implémentation Drizzle de faire lecture, règles et écriture dans une même transaction, le trajet verrouillé, pour que deux réservations simultanées ne prennent pas la dernière place.
  - `application/use-cases/book-seat.ts` est le cas d'usage `BookSeat` : il génère l'identifiant et le code de réservation, appelle `reserve()` avec `Booking.create()`, lève `TRIP_NOT_FOUND` si le trajet n'existe pas, et renvoie la réservation et le téléphone du conducteur.
  - `application/testing/in-memory-trip.repository.ts` garde aussi les réservations, implémente `reserve()` et remplit `passengerPhones` des trajets qu'il renvoie.
  - `application/trips.application.spec.ts` reçoit les tests de `BookSeat` et des places restantes renvoyées par `ListUpcomingTrips`.
- **infra** :
  - `infra/bookings.schema.ts` décrit la table `bookings` pour Drizzle.
  - `infra/trip.mapper.ts` reçoit les téléphones des réservations pour reconstruire un `Trip`, et convertit une `Booking` en ligne.
  - `infra/drizzle-trip.repository.ts` implémente `reserve()` dans une transaction (`SELECT … FOR UPDATE` sur le trajet), traduit la violation de la contrainte d'unicité (`trip_id`, `passenger_phone`) en `PASSENGER_ALREADY_BOOKED` grâce à `isUniqueViolation` de `core/database/pg-errors.ts`, et charge les téléphones des réservations des trajets listés.
  - `infra/drizzle-trip.repository.int.spec.ts` reçoit les tests de ces deux comportements sur PGlite.
- **http** : `http/trips.controller.ts` reçoit une route, et la liste existante renvoie désormais `remainingSeats` :
  - `POST /api/trips/:tripId/bookings` réserve une place à partir du corps `bookSeatSchema` et renvoie `201` avec `{ bookingCode, driverPhone }`.
  - `GET /api/trips?site=<site>` renvoie, en plus des champs de TR1, `remainingSeats` pour chaque trajet, toujours sans `driverPhone`.
- **module** : `trips.module.ts` déclare `BookSeat`. `apps/api/test/trips.e2e.spec.ts` reçoit les tests de la route de réservation et des places restantes.
- **web** : aucun écran, l'écran est hors périmètre. La fausse API reçoit la route de réservation et les places restantes : `apps/web/src/mocks/handlers.ts` (un handler, le calcul dans la liste, et la même normalisation des téléphones à la publication et à la réservation), `apps/web/src/mocks/fixture.ts` (une liste `bookings`, un trajet complet de départ, et des téléphones de conducteur écrits sous leur forme normalisée) et `apps/web/src/mocks/handlers.test.ts` (leurs tests).

## 3. Données

On stocke chaque réservation dans une nouvelle table, `bookings`, reliée au trajet ; la table `trips` ne change pas. Migration : `pnpm db:generate --name=bookings`.

| Colonne           | Type                       | Contrainte et règle protégée                                                                                                        |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `uuid`                     | Clé primaire.                                                                                                                       |
| `trip_id`         | `uuid`                     | Non nul, clé étrangère vers `trips.id` : une réservation porte sur un trajet qui existe.                                            |
| `passenger_name`  | `varchar(100)`             | Non nul.                                                                                                                            |
| `passenger_phone` | `varchar(20)`              | Non nul ; unique avec `trip_id` (`bookings_trip_passenger_phone_key`) : un même téléphone ne réserve pas deux fois un trajet (AS4). |
| `booking_code`    | `varchar(32)`              | Non nul et unique (`bookings_booking_code_key`) : un code désigne une seule réservation en TR3.                                     |
| `created_at`      | `timestamptz`, précision 3 | Non nul.                                                                                                                            |

Les colonnes `passenger_phone` et `trips.driver_phone` contiennent le téléphone normalisé : c'est lui que la contrainte d'unicité compare. La règle du trajet complet (AS3) n'a pas de contrainte en base : elle est vérifiée par le domaine, le trajet verrouillé pendant la transaction de `reserve()`. L'index unique sur (`trip_id`, `passenger_phone`) sert aussi à compter les réservations d'un trajet.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier `TripError`, avec le code et le statut imposés par la spec. Une saisie invalide (nom vide, téléphone trop long, identifiant de trajet qui n'est pas un UUID) est refusée par la validation Zod existante, avec le code `VALIDATION_FAILED`.

| Code AppError              | Catégorie | HTTP | Quand                                                                    | Scénario |
| -------------------------- | --------- | ---- | ------------------------------------------------------------------------ | -------- |
| `TRIP_FULL`                | CONFLICT  | 409  | Le trajet n'a plus de place restante.                                    | AS3      |
| `PASSENGER_ALREADY_BOOKED` | CONFLICT  | 409  | Une réservation du trajet porte déjà ce téléphone.                       | AS4      |
| `TRIP_DEPARTED`            | CONFLICT  | 409  | L'heure de départ du trajet est égale ou antérieure à l'instant présent. | AS5      |
| `TRIP_NOT_FOUND`           | NOT_FOUND | 404  | Aucun trajet n'a cet identifiant.                                        | AS6      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit, puis par le test e2e qui vérifie la réponse observée par l'appelant.

Le trajet déjà parti d'AS5 ne peut pas être publié ; comme en TR1, chaque test le place directement dans le dépôt avec `Trip.restore()` (le dépôt en mémoire, `app.get(TripRepository)` en e2e, la liste `trips` de `fixture.ts`). Les autres trajets sont publiés normalement, et les réservations préalables passent par la route de réservation.

| Scénario | Fichier de test                                     | Niveau      | Ce que le test vérifie                                                                                                                                                              |
| -------- | --------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/booking.spec.ts` | unitaire    | `Booking.create()` sur un trajet à venir de 3 places crée la réservation d'Awa, 77 123 45 67, avec le code fourni.                                                                  |
| AS1      | `…/trips/application/trips.application.spec.ts`     | application | `BookSeat` renvoie un code de réservation non vide et le téléphone du conducteur, et la réservation est enregistrée.                                                                |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `POST /api/trips/:tripId/bookings` répond 201 avec un `bookingCode` non vide et le `driverPhone` du trajet, normalisé : « 771234567 » pour un trajet publié avec « +221771234567 ». |
| AS2      | `apps/api/src/modules/trips/domain/trip.spec.ts`    | unitaire    | Un trajet de 3 places avec un téléphone inscrit a 2 places restantes.                                                                                                               |
| AS2      | `…/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Après une réservation enregistrée par `reserve()`, `listUpcomingBySite()` renvoie le trajet avec ce téléphone inscrit.                                                              |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | Après une réservation, `GET /api/trips?site=diamniadio` renvoie le trajet avec `remainingSeats` à 2, sans `driverPhone`.                                                            |
| AS3      | `apps/api/src/modules/trips/domain/booking.spec.ts` | unitaire    | `Booking.create()` sur un trajet de 1 place déjà réservée lève `TRIP_FULL`.                                                                                                         |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | La seconde réservation d'un trajet de 1 place répond 409 `TRIP_FULL`, et la liste montre toujours 0 place restante.                                                                 |
| AS4      | `apps/api/src/modules/trips/domain/booking.spec.ts` | unitaire    | `Booking.create()` avec un téléphone déjà inscrit sur le trajet lève `PASSENGER_ALREADY_BOOKED`, y compris quand « 77 123 45 67 » est inscrit et que « +221771234567 » réserve.     |
| AS4      | `apps/api/src/modules/trips/domain/phone.spec.ts`   | unitaire    | `normalisePhone()` donne « 771234567 » pour « 77 123 45 67 », « 77-123-45-67 », « +221771234567 » et « 00221 77 123 45 67 ».                                                        |
| AS4      | `…/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Une seconde ligne avec le même trajet et le même téléphone, insérée sans passer par le domaine, lève `PASSENGER_ALREADY_BOOKED`.                                                    |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | Après une réservation avec « 77 123 45 67 », une seconde avec « +221771234567 » répond 409 `PASSENGER_ALREADY_BOOKED`, et la liste montre toujours 2 places restantes.              |
| AS5      | `apps/api/src/modules/trips/domain/booking.spec.ts` | unitaire    | `Booking.create()` sur un trajet parti hier à 8 h lève `TRIP_DEPARTED`.                                                                                                             |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | La réservation d'un trajet parti, placé par `app.get(TripRepository)`, répond 409 `TRIP_DEPARTED`.                                                                                  |
| AS6      | `…/trips/application/trips.application.spec.ts`     | application | `BookSeat` sur un identifiant inconnu lève `TRIP_NOT_FOUND`.                                                                                                                        |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `POST /api/trips/<uuid inconnu>/bookings` répond 404 `TRIP_NOT_FOUND`.                                                                                                              |

La fausse API reprend AS1 à AS6 dans `apps/web/src/mocks/handlers.test.ts`, avec les mêmes statuts et codes.

## 6. Tâches

Cinq tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [002-AS1, AS2, AS3, AS4, AS5] Écrire d'abord `apps/api/src/modules/trips/domain/booking.spec.ts` (« 002-AS1: creates a booking… », « 002-AS3: rejects a full trip », « 002-AS4: rejects a passenger who already booked », « 002-AS5: rejects a departed trip »), `domain/phone.spec.ts` (« 002-AS4: normalises a phone… »), le test des places restantes dans `domain/trip.spec.ts` (« 002-AS2: … ») et ceux de `packages/shared/src/trips.spec.ts`, puis les schémas de `packages/shared/src/trips.ts`, `domain/phone.ts`, `domain/booking.ts`, les ajouts à `domain/trip.ts` (dont la normalisation du téléphone du conducteur) et les quatre codes de `domain/trips.errors.ts`
- [x] T02 [002-AS1, AS2, AS6] Écrire d'abord les tests de `apps/api/src/modules/trips/application/trips.application.spec.ts` (« 002-AS1: books a seat and returns the driver phone », « 002-AS2: lists remaining seats », « 002-AS6: rejects an unknown trip »), puis `reserve()` dans le port et le dépôt en mémoire, et `BookSeat`
- [x] T03 [002-AS2, AS4] Écrire d'abord les tests de `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` (« 002-AS2: lists trips with their booked passengers », « 002-AS4: the database refuses a second booking with the same phone »), puis `bookings.schema.ts`, les ajouts à `trip.mapper.ts` et à `drizzle-trip.repository.ts`, et la migration générée
- [x] T04 [002-AS1, AS2, AS3, AS4, AS5, AS6] Écrire d'abord les tests de `apps/api/test/trips.e2e.spec.ts` (un par scénario, « 002-AS1: … » à « 002-AS6: … »), puis la route de réservation et `remainingSeats` dans `trips.controller.ts`, et `BookSeat` dans `trips.module.ts`
- [x] T05 [002-AS1, AS2, AS3, AS4, AS5, AS6] Écrire d'abord les tests de `apps/web/src/mocks/handlers.test.ts` (« 002-AS1: … » à « 002-AS6: … »), puis le handler de réservation, les places restantes et la normalisation des téléphones dans `handlers.ts`, et la liste `bookings` dans `fixture.ts`

## 7. Corrections

### Passage 1

Le relecteur a trouvé un écart bloquant. La spec a tranché, dans « Questions ouvertes », qu'un téléphone mal formé est refusé comme saisie invalide. Pourtant, `bookSeatSchema` (`packages/shared/src/trips.ts:59`) accepte « abc », « +221 » ou « ---- ». `normalisePhone()` (`apps/api/src/modules/trips/domain/phone.ts:4`) réduit alors « +221 » et « ---- » à une chaîne vide, qui est enregistrée : deux supporters différents se voient l'un l'autre comme « déjà inscrit ». La fausse API (`apps/web/src/mocks/handlers.ts`) se comporte de la même façon.

- [ ] T06 [002-AS1] Écrire d'abord, dans `packages/shared/src/trips.spec.ts`, le test « 002-AS1: rejects a malformed phone » : « abc », « +221 », « ---- » et « hello world » sont refusés comme téléphone du supporter (`bookSeatSchema`) et comme téléphone du conducteur (`publishTripSchema`). Écrire aussi le test e2e correspondant dans `apps/api/test/trips.e2e.spec.ts` (400 `VALIDATION_FAILED`, aucune réservation créée) et celui de `apps/web/src/mocks/handlers.test.ts`. Puis ajouter aux deux schémas la règle suivante : une fois retirés les espaces, les tirets et le préfixe `+221` ou `00221`, le téléphone ne contient que des chiffres et n'est pas vide.
