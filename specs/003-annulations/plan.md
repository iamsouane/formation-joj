# 003 — Annuler une réservation ou un trajet : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module `trips` trois actions : consulter une réservation avec son code, annuler une réservation avec son code, et annuler un trajet avec son code de gestion. À la fin, un supporter voit par l'API le trajet de sa réservation et l'un des trois statuts « actif », « annulé » ou « trajet annulé » ; une réservation annulée libère sa place, et un trajet annulé sort de la liste des départs et refuse toute nouvelle réservation. Rien n'est supprimé : une annulation est une date d'annulation enregistrée sur la réservation ou sur le trajet, ce qui permet de continuer à montrer la réservation après coup. Comme la spec impose un refus 403, on ajoute au socle commun une catégorie d'erreur `FORBIDDEN`. Le travail tient en six tâches, dans l'ordre des couches : socle des erreurs, schémas partagés et domaine, cas d'usage, persistance, routes HTTP, puis fausse API du front. Il n'y a ni écran, ni notification, ni modification d'un trajet ou d'une réservation.

Les mots de la spec et leur nom dans le code :

| Dans la spec             | Dans le code             | Ce que c'est                                                                                 |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| consulter sa réservation | `GetBooking`             | Le cas d'usage qui retrouve une réservation et son trajet par le code de réservation.        |
| annuler sa réservation   | `CancelBooking`          | Le cas d'usage qui annule une réservation par son code.                                      |
| annuler son trajet       | `CancelTrip`             | Le cas d'usage qui annule un trajet après avoir vérifié le code de gestion.                  |
| date d'annulation        | `cancelledAt`            | L'instant de l'annulation, sur `Trip` et sur `Booking` ; absent tant que rien n'est annulé.  |
| statut de la réservation | `BookingStatus`          | `'active'`, `'cancelled'` ou `'trip_cancelled'`, calculé par `Booking.statusOn(trip)`.       |
| « actif »                | `'active'`               | Ni la réservation ni le trajet ne sont annulés.                                              |
| « annulé »               | `'cancelled'`            | Le supporter a annulé sa réservation ; ce statut l'emporte sur celui du trajet.              |
| « trajet annulé »        | `'trip_cancelled'`       | Le conducteur a annulé le trajet, la réservation ne l'a pas été.                             |
| réservation consultée    | `BookingDetailsResponse` | Ce que renvoie la consultation : code, nom du supporter, statut et trajet avec le téléphone. |
| code de gestion          | `managementCode`         | Déjà stocké en TR1 ; le conducteur le donne pour annuler son trajet.                         |
| supporters déjà inscrits | `passengerPhones`        | Déjà en TR2 ; ne contient plus que les réservations non annulées.                            |

## 2. Fichiers par couche

On ne crée pas de nouveau module : les annulations sont ajoutées au module `trips` (`apps/api/src/modules/trips/`), qui porte déjà les trajets et les réservations. Les fichiers suivent l'organisation déjà en place dans ce module.

- **core** :
  - `apps/api/src/core/errors/app-error.ts` : le type `ErrorKind` reçoit la catégorie `FORBIDDEN`, pour un appelant qui donne un secret qui ne correspond pas.
  - `apps/api/src/core/errors/problem-details.filter.ts` : `STATUS_BY_KIND` associe `FORBIDDEN` au statut 403. `problem-details.filter.spec.ts` reçoit le test de cette correspondance.
- **shared** : `packages/shared/src/trips.ts` reçoit :
  - `bookingCodeParamSchema` (`bookingCode`, chaîne non vide de 32 caractères au plus), le paramètre de chemin des deux routes de réservation ;
  - `cancelTripSchema` (`managementCode`, chaîne non vide, coupée aux deux bouts, de 32 caractères au plus), le corps de l'annulation d'un trajet ;
  - `BOOKING_STATUSES` (`'active'`, `'cancelled'`, `'trip_cancelled'`) et le type `BookingStatus` ;
  - `bookingDetailsSchema` (`bookingCode`, `passengerName`, `status`, et `trip` avec `id`, `departurePlace`, `site`, `departureAt`, `pricePerSeat`, `driverPhone`), la réponse de la consultation.
  - `packages/shared/src/trips.spec.ts` teste ces schémas.
- **domain** :
  - `domain/trip.ts` : `Trip` reçoit `cancelledAt` (absent à la création, relu par `restore()`), le calcul `isCancelled` et la méthode `cancel(managementCode, now)`. Elle lève `MANAGEMENT_CODE_INVALID` si le code ne correspond pas, renvoie le même trajet s'il est déjà annulé, et sinon un nouveau `Trip` annulé à `now`.
  - `domain/booking.ts` : `Booking` reçoit `cancelledAt`, la méthode `cancel(now)` (même trajet déjà annulé : la réservation est renvoyée telle quelle, sa première date conservée) et la méthode `statusOn(trip)`, qui renvoie le statut. `Booking.create()` refuse d'abord un trajet annulé (`TRIP_CANCELLED`), avant les refus de TR2.
  - `domain/trips.errors.ts` ajoute les codes `BOOKING_NOT_FOUND`, `MANAGEMENT_CODE_INVALID` et `TRIP_CANCELLED`.
  - `domain/trip.spec.ts` et `domain/booking.spec.ts` reçoivent les tests unitaires de ces règles.
- **application** :
  - `application/trip.repository.ts` : le port `TripRepository` reçoit `findTrip(tripId)`, `findBookingByCode(bookingCode)` (la réservation et son trajet, ou `undefined`), `saveTripCancellation(trip)` et `saveBookingCancellation(booking)`. Les méthodes existantes ne voient plus les réservations annulées dans `passengerPhones`, et `listUpcomingBySite()` ne renvoie plus les trajets annulés.
  - `application/use-cases/get-booking.ts` est le cas d'usage `GetBooking` : il lève `BOOKING_NOT_FOUND` si le code est inconnu, et renvoie la réservation, son trajet et son statut.
  - `application/use-cases/cancel-booking.ts` est le cas d'usage `CancelBooking` : il lève `BOOKING_NOT_FOUND` si le code est inconnu, annule la réservation et l'enregistre.
  - `application/use-cases/cancel-trip.ts` est le cas d'usage `CancelTrip` : il lève `TRIP_NOT_FOUND` si le trajet est inconnu, appelle `trip.cancel()` et enregistre le trajet annulé.
  - `application/testing/in-memory-trip.repository.ts` implémente les quatre méthodes et applique les mêmes filtres que la base.
  - `application/trips.application.spec.ts` reçoit les tests des trois cas d'usage.
- **infra** :
  - `infra/trips.schema.ts` et `infra/bookings.schema.ts` reçoivent la colonne `cancelled_at` ; l'index unique (`trip_id`, `passenger_phone`) devient partiel (voir section 3).
  - `infra/trip.mapper.ts` relit et écrit `cancelledAt` pour les deux entités, et reconstruit une `Booking` depuis sa ligne.
  - `infra/drizzle-trip.repository.ts` implémente les quatre méthodes, exclut les trajets annulés de `listUpcomingBySite()` et les réservations annulées de `passengerPhonesOf()`. `saveTripCancellation()` met à jour la ligne du trajet : cette mise à jour attend la fin d'une réservation en cours, qui verrouille le trajet (`FOR UPDATE`), et une réservation qui suit voit le trajet annulé.
  - `infra/drizzle-trip.repository.int.spec.ts` reçoit les tests de ces comportements sur PGlite.
- **http** : `http/trips.controller.ts` reçoit l'annulation d'un trajet, et un nouveau `http/bookings.controller.ts`, déclaré dans `trips.module.ts`, reçoit les deux routes d'une réservation :
  - `GET /api/bookings/:bookingCode` renvoie `200` avec `bookingDetailsSchema`.
  - `POST /api/bookings/:bookingCode/cancellation` annule la réservation et renvoie `204` sans corps.
  - `POST /api/trips/:tripId/cancellation` annule le trajet à partir du corps `cancelTripSchema` et renvoie `204` sans corps. Le code de gestion est dans le corps, pas dans l'URL, pour ne pas finir dans les journaux.
- **module** : `trips.module.ts` déclare `GetBooking`, `CancelBooking`, `CancelTrip` et `BookingsController`. `apps/api/test/trips.e2e.spec.ts` reçoit les tests de ces routes.
- **web** : aucun écran, l'écran est hors périmètre. La fausse API reçoit les trois routes : `apps/web/src/mocks/handlers.ts` (trois handlers, le titre du statut 403, les trajets annulés retirés de la liste et refusés à la réservation, les réservations annulées hors du calcul des places), `apps/web/src/mocks/fixture.ts` (`cancelledAt` facultatif sur `StoredTrip` et `StoredBooking`) et `apps/web/src/mocks/handlers.test.ts` (leurs tests).

## 3. Données

On n'ajoute pas de table : chaque annulation est une date, enregistrée sur la ligne existante. Migration : `pnpm db:generate --name=cancellations`.

| Table      | Colonne ou contrainte               | Type et règle protégée                                                                                                                                                                                   |
| ---------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trips`    | `cancelled_at`                      | `timestamptz`, précision 3, nullable : nulle tant que le trajet n'est pas annulé. Un trajet annulé n'est pas listé (AS4) et refuse les réservations (AS7).                                               |
| `bookings` | `cancelled_at`                      | `timestamptz`, précision 3, nullable : nulle tant que la réservation n'est pas annulée. Une réservation annulée ne compte plus dans les places (AS3) et reste consultable.                               |
| `bookings` | `bookings_trip_passenger_phone_key` | Devient un index unique partiel, `WHERE cancelled_at IS NULL` : un téléphone n'a qu'une réservation active par trajet (002-AS4), et un supporter qui a annulé peut réserver de nouveau la place libérée. |

L'index unique `bookings_booking_code_key` ne change pas : il garantit qu'un code de réservation désigne une seule réservation (AS1, AS2). L'index `trips_management_code_key` ne change pas non plus.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier `TripError`, avec le code et le statut imposés par la spec. Un code de réservation trop long ou un code de gestion vide est refusé par la validation Zod existante, avec le code `VALIDATION_FAILED`.

| Code AppError             | Catégorie | HTTP | Quand                                                                     | Scénario |
| ------------------------- | --------- | ---- | ------------------------------------------------------------------------- | -------- |
| `BOOKING_NOT_FOUND`       | NOT_FOUND | 404  | Aucune réservation n'a ce code, à la consultation comme à l'annulation.   | AS2      |
| `MANAGEMENT_CODE_INVALID` | FORBIDDEN | 403  | Le code de gestion donné n'est pas celui du trajet.                       | AS6      |
| `TRIP_CANCELLED`          | CONFLICT  | 409  | Le supporter réserve une place sur un trajet que son conducteur a annulé. | AS7      |
| `TRIP_NOT_FOUND`          | NOT_FOUND | 404  | Déjà créé en TR2 ; levé aussi quand on annule un trajet qui n'existe pas. | AS6      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit, puis par le test e2e qui vérifie la réponse observée par l'appelant. Les trajets sont publiés et réservés par les routes existantes, puis annulés par les nouvelles.

| Scénario | Fichier de test                                           | Niveau      | Ce que le test vérifie                                                                                                                          |
| -------- | --------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/booking.spec.ts`       | unitaire    | `statusOn(trip)` renvoie `'active'` pour une réservation et un trajet non annulés.                                                              |
| AS1      | `…/trips/infra/drizzle-trip.repository.int.spec.ts`       | intégration | `findBookingByCode()` renvoie la réservation d'Awa et son trajet.                                                                               |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | `GET /api/bookings/:bookingCode` répond 200 avec le trajet Pikine → Diamniadio, son heure, le téléphone du conducteur et `status` à `'active'`. |
| AS2      | `…/trips/application/trips.application.spec.ts`           | application | `GetBooking` et `CancelBooking` lèvent `BOOKING_NOT_FOUND` pour un code inconnu.                                                                |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | La consultation et l'annulation d'un code inconnu répondent toutes deux 404 `BOOKING_NOT_FOUND`.                                                |
| AS3      | `apps/api/src/modules/trips/domain/booking.spec.ts`       | unitaire    | `cancel(now)` donne une réservation dont `statusOn(trip)` vaut `'cancelled'`.                                                                   |
| AS3      | `…/trips/infra/drizzle-trip.repository.int.spec.ts`       | intégration | Après `saveBookingCancellation()`, `listUpcomingBySite()` renvoie le trajet sans ce téléphone dans `passengerPhones`.                           |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | L'annulation répond 204 ; la liste montre de nouveau 3 places restantes et la consultation renvoie `status` à `'cancelled'`.                    |
| AS4      | `apps/api/src/modules/trips/domain/trip.spec.ts`          | unitaire    | `cancel()` avec le bon code donne un trajet `isCancelled`.                                                                                      |
| AS4      | `…/trips/infra/drizzle-trip.repository.int.spec.ts`       | intégration | Après `saveTripCancellation()`, `listUpcomingBySite()` ne renvoie plus ce trajet.                                                               |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | `POST /api/trips/:tripId/cancellation` répond 204, et `GET /api/trips?site=diamniadio` ne contient plus le trajet.                              |
| AS5      | `apps/api/src/modules/trips/domain/booking.spec.ts`       | unitaire    | `statusOn(trip)` renvoie `'trip_cancelled'` pour une réservation active sur un trajet annulé.                                                   |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | Après l'annulation du trajet, la consultation de la réservation d'Awa renvoie le trajet et `status` à `'trip_cancelled'`.                       |
| AS6      | `apps/api/src/core/errors/problem-details.filter.spec.ts` | unitaire    | Une `AppError` de catégorie `FORBIDDEN` donne le statut 403.                                                                                    |
| AS6      | `apps/api/src/modules/trips/domain/trip.spec.ts`          | unitaire    | `cancel()` avec un autre code lève `MANAGEMENT_CODE_INVALID`.                                                                                   |
| AS6      | `…/trips/application/trips.application.spec.ts`           | application | `CancelTrip` sur un trajet inconnu lève `TRIP_NOT_FOUND` ; avec un mauvais code, le trajet enregistré n'est pas annulé.                         |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | L'annulation avec un autre code répond 403 `MANAGEMENT_CODE_INVALID`, et le trajet est toujours dans la liste.                                  |
| AS7      | `apps/api/src/modules/trips/domain/booking.spec.ts`       | unitaire    | `Booking.create()` sur un trajet annulé avec des places libres lève `TRIP_CANCELLED`.                                                           |
| AS7      | `apps/api/test/trips.e2e.spec.ts`                         | e2e         | La réservation d'un trajet annulé répond 409 `TRIP_CANCELLED`, et la consultation d'une réservation existante ne change pas.                    |

La fausse API reprend AS1 à AS7 dans `apps/web/src/mocks/handlers.test.ts`, avec les mêmes statuts et codes.

## 6. Tâches

Six tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [003-AS6] Écrire d'abord, dans `apps/api/src/core/errors/problem-details.filter.spec.ts`, le test « 003-AS6: maps a FORBIDDEN error to 403 », puis la catégorie `FORBIDDEN` dans `app-error.ts` et `STATUS_BY_KIND`
- [x] T02 [003-AS1, AS3, AS4, AS5, AS6, AS7] Écrire d'abord les tests de `domain/trip.spec.ts` (« 003-AS4: cancels a trip with its management code », « 003-AS6: rejects another management code »), de `domain/booking.spec.ts` (« 003-AS1: … active », « 003-AS3: … cancelled », « 003-AS5: … trip_cancelled », « 003-AS7: rejects a cancelled trip ») et de `packages/shared/src/trips.spec.ts`, puis les schémas de `packages/shared/src/trips.ts`, `cancelledAt`, `cancel()` et `statusOn()` dans `trip.ts` et `booking.ts`, et les trois codes de `trips.errors.ts`
- [x] T03 [003-AS1, AS2, AS3, AS4, AS6] Écrire d'abord les tests de `application/trips.application.spec.ts` (« 003-AS1: gets a booking with its trip », « 003-AS2: rejects an unknown booking code », « 003-AS3: cancelling a booking frees its seat », « 003-AS4: a cancelled trip is no longer listed », « 003-AS6: … »), puis les quatre méthodes du port et du dépôt en mémoire, et `GetBooking`, `CancelBooking`, `CancelTrip`
- [x] T04 [003-AS1, AS3, AS4] Écrire d'abord les tests de `infra/drizzle-trip.repository.int.spec.ts` (« 003-AS1: finds a booking and its trip by code », « 003-AS3: a cancelled booking no longer holds a seat », « 003-AS4: a cancelled trip is not listed »), puis les colonnes `cancelled_at`, l'index partiel, les ajouts à `trip.mapper.ts` et à `drizzle-trip.repository.ts`, et la migration générée
- [x] T05 [003-AS1, AS2, AS3, AS4, AS5, AS6, AS7] Écrire d'abord les tests de `apps/api/test/trips.e2e.spec.ts` (un par scénario, « 003-AS1: … » à « 003-AS7: … »), puis `bookings.controller.ts`, la route d'annulation dans `trips.controller.ts`, et les déclarations de `trips.module.ts`
- [x] T06 [003-AS1, AS2, AS3, AS4, AS5, AS6, AS7] Écrire d'abord les tests de `apps/web/src/mocks/handlers.test.ts` (« 003-AS1: … » à « 003-AS7: … »), puis les trois handlers, le statut 403, les filtres des trajets et réservations annulés dans `handlers.ts`, et `cancelledAt` dans `fixture.ts`
