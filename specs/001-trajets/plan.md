# 001 — Publier et lister les trajets : plan

**Statut** : Validé

## 1. Résumé

On construit le premier module métier du projet, `trips`, qui permet de publier un trajet vers un site des JOJ et de lister les départs à venir vers un site. À la fin, un conducteur publie son trajet par l'API et reçoit le trajet créé avec un code de gestion ; un supporter obtient la liste des départs à venir vers Dakar, Diamniadio ou Saly, triée par heure, sans le téléphone du conducteur ni le code de gestion. Un site inconnu et un départ dans le passé sont refusés avec les codes `SITE_UNKNOWN` et `DEPARTURE_IN_PAST`. Le travail tient en cinq tâches, dans l'ordre des couches : schémas partagés et domaine, cas d'usage, persistance, routes HTTP, puis fausse API du front. Il n'y a ni écran, ni réservation, ni annulation, ni calcul des places restantes.

Les mots de la spec et leur nom dans le code :

| Dans la spec                  | Dans le code        | Ce que c'est                                                                  |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| trajet                        | `Trip`              | L'entité du domaine : un départ publié par un conducteur vers un site.        |
| lieu de départ                | `departurePlace`    | Le texte libre saisi par le conducteur, par exemple « Pikine ».               |
| site                          | `site` (`TripSite`) | L'un des trois sites des JOJ : `dakar`, `diamniadio` ou `saly`.               |
| heure de départ               | `departureAt`       | La date et l'heure du départ, en ISO 8601.                                    |
| nombre de places              | `seats`             | Le nombre de places proposées, un entier d'au moins 1.                        |
| participation aux frais/place | `pricePerSeat`      | Le montant en francs CFA demandé par place, un entier positif ou nul.         |
| téléphone du conducteur       | `driverPhone`       | Le numéro du conducteur, stocké mais jamais renvoyé par la liste.             |
| code de gestion               | `managementCode`    | Le code secret renvoyé à la publication, qui servira à annuler en TR3.        |
| publier un trajet             | `PublishTrip`       | Le cas d'usage qui crée et enregistre un trajet.                              |
| lister les départs à venir    | `ListUpcomingTrips` | Le cas d'usage qui renvoie les trajets à venir vers un site, triés par heure. |

## 2. Fichiers par couche

On crée le module `trips` dans `apps/api/src/modules/trips/`, organisé comme le module de référence `disciplines` de la branche `main` : un dossier par couche, et un fichier `trips.module.ts`.

- **shared** : `packages/shared/src/trips.ts` contient la liste fermée `TRIP_SITES`, le schéma du corps de publication `publishTripSchema`, le schéma de la requête de liste `upcomingTripsQuerySchema`, le trajet public `tripSchema`, le trajet publié `publishedTripSchema` (le trajet public plus `managementCode`) et `tripListSchema`. Le site y est une chaîne non vide et non une énumération, pour que le domaine puisse refuser un site inconnu avec `SITE_UNKNOWN` plutôt qu'avec une erreur de saisie générique. `packages/shared/src/trips.spec.ts` teste ces schémas, et `packages/shared/src/index.ts` exporte le nouveau fichier.
- **domain** : `domain/trip.ts` définit l'entité `Trip`, avec `create()` qui vérifie que le site est dans `TRIP_SITES` et que le départ est strictement après l'instant présent, et `restore()` qui la reconstruit depuis la base sans rejouer ces règles. Il exporte aussi `parseTripSite()`, utilisé par `create()` et par la liste : cette fonction normalise d'abord le site (espaces retirés aux deux bouts, passage en minuscules), puis vérifie qu'il est dans `TRIP_SITES`. Ainsi « Diamniadio » ou « DAKAR » sont acceptés et enregistrés sous la forme `diamniadio` ou `dakar` ; ce n'est pas une nouvelle règle, seulement la façon de lire le site. `domain/trips.errors.ts` définit `TripError`, sous-classe d'`AppError`, avec les codes `SITE_UNKNOWN` et `DEPARTURE_IN_PAST`. `domain/trip.spec.ts` contient les tests unitaires.
- **application** : `application/trip.repository.ts` est le port `TripRepository`, avec `insert(trip)` et `listUpcomingBySite(site, now)`, qui renvoie les trajets triés par heure de départ croissante. `application/use-cases/publish-trip.ts` est le cas d'usage `PublishTrip` : il génère l'identifiant et le code de gestion, crée le trajet et l'enregistre. `application/use-cases/list-upcoming-trips.ts` est le cas d'usage `ListUpcomingTrips` : il valide le site puis interroge le port. `application/testing/in-memory-trip.repository.ts` est le dépôt en mémoire des tests, et `application/trips.application.spec.ts` teste les deux cas d'usage avec lui.
- **infra** : `infra/trips.schema.ts` décrit la table `trips` pour Drizzle. `infra/trip.mapper.ts` convertit une ligne en entité et inversement. `infra/drizzle-trip.repository.ts` implémente le port. `infra/drizzle-trip.repository.int.spec.ts` le teste sur PGlite.
- **http** : `http/trips.controller.ts` est le controller fin, qui valide avec les DTO `createZodDto`, appelle un cas d'usage et sérialise. Deux routes :
  - `POST /api/trips` publie un trajet à partir du corps `publishTripSchema` et renvoie `201` avec le trajet publié, c'est-à-dire le trajet public et son `managementCode`, sans le téléphone.
  - `GET /api/trips?site=<site>` renvoie `200` avec la liste des trajets à venir vers ce site, triés par heure de départ, chacun au format `tripSchema`, sans `driverPhone` ni `managementCode`.
- **module** : `trips.module.ts` relie le port `TripRepository` à `DrizzleTripRepository` et déclare les deux cas d'usage ; il est ajouté aux `imports` de `apps/api/src/app.module.ts`. `apps/api/test/trips.e2e.spec.ts` teste les deux routes.
- **web** : aucun écran, l'écran est hors périmètre. Seule la fausse API reçoit les deux routes, comme le demande la règle du dépôt : `apps/web/src/mocks/handlers.ts` (deux handlers), `apps/web/src/mocks/fixture.ts` (une liste `trips` de départ) et `apps/web/src/mocks/handlers.test.ts` (leurs tests).

## 3. Données

On stocke chaque trajet publié dans une seule table, `trips`. Migration : `pnpm db:generate --name=trips`.

| Colonne           | Type                       | Contrainte et règle protégée                                                             |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `id`              | `uuid`                     | Clé primaire.                                                                            |
| `departure_place` | `varchar(100)`             | Non nul.                                                                                 |
| `site`            | `varchar(20)`              | Non nul ; la liste des sites est vérifiée par le domaine (`TRIP_SITES`).                 |
| `departure_at`    | `timestamptz`, précision 3 | Non nul ; le refus d'un départ passé est vérifié par le domaine.                         |
| `seats`           | `integer`                  | Non nul.                                                                                 |
| `price_per_seat`  | `integer`                  | Non nul.                                                                                 |
| `driver_phone`    | `varchar(20)`              | Non nul.                                                                                 |
| `management_code` | `varchar(32)`              | Non nul et unique (`trips_management_code_key`) : un code désigne un seul trajet en TR3. |
| `created_at`      | `timestamptz`, précision 3 | Non nul.                                                                                 |

Un index sur (`site`, `departure_at`) sert la liste des départs à venir d'un site, triés par heure.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier `TripError`, avec le code et le statut imposés par la spec. Une saisie incomplète ou incohérente (champ manquant, moins d'une place, participation négative) est refusée par la validation Zod existante, avec le code `VALIDATION_FAILED`.

| Code AppError       | Catégorie  | HTTP | Quand                                                                   | Scénario |
| ------------------- | ---------- | ---- | ----------------------------------------------------------------------- | -------- |
| `SITE_UNKNOWN`      | VALIDATION | 400  | Le site publié ou demandé n'est ni `dakar`, ni `diamniadio`, ni `saly`. | AS3      |
| `DEPARTURE_IN_PAST` | VALIDATION | 400  | L'heure de départ est égale ou antérieure à l'instant présent.          | AS4      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit, puis par le test e2e qui vérifie la réponse observée par l'appelant.

Le trajet déjà parti d'AS2 ne peut pas être publié, puisque la publication refuse un départ passé (AS4). Chaque test le place donc directement dans le dépôt, construit avec `Trip.restore()`, qui ne rejoue pas les règles de création : dans le dépôt en mémoire pour le test de l'application ; par `DrizzleTripRepository.insert()` pour le test d'intégration ; par le `TripRepository` obtenu de l'application Nest (`app.get(TripRepository)`) pour le test e2e ; et dans la liste `trips` de `fixture.ts` pour la fausse API. Les trajets à venir sont, eux, publiés normalement.

| Scénario | Fichier de test                                     | Niveau      | Ce que le test vérifie                                                                                                          |
| -------- | --------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/trip.spec.ts`    | unitaire    | `Trip.create()` crée un trajet Pikine → Diamniadio, demain 8 h, 3 places, 1 000 F ; le site « Diamniadio » est lu `diamniadio`. |
| AS2      | `…/trips/application/trips.application.spec.ts`     | application | Avec un trajet passé placé dans le dépôt en mémoire, `ListUpcomingTrips` renvoie 8 h puis 10 h, sans Saly ni départ passé.      |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `POST /api/trips` répond 201 avec le trajet créé et un `managementCode` non vide.                                               |
| AS2      | `…/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | La requête ne garde que les trajets à venir du site demandé, triés par heure.                                                   |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `GET /api/trips?site=diamniadio` renvoie 8 h puis 10 h, sans Saly ni départ passé, sans `driverPhone` ni `managementCode`.      |
| AS3      | `apps/api/src/modules/trips/domain/trip.spec.ts`    | unitaire    | `Trip.create()` avec le site « Thiès » lève `SITE_UNKNOWN`.                                                                     |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `POST /api/trips` répond 400 `SITE_UNKNOWN`, et la liste reste vide.                                                            |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | Après le refus de « Thiès », le `TripRepository` obtenu par `app.get(TripRepository)` ne contient aucun trajet, sur aucun site. |
| AS4      | `apps/api/src/modules/trips/domain/trip.spec.ts`    | unitaire    | `Trip.create()` avec un départ hier à 8 h lève `DEPARTURE_IN_PAST`.                                                             |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                   | e2e         | `POST /api/trips` répond 400 `DEPARTURE_IN_PAST`, et la liste reste vide.                                                       |

## 6. Tâches

Cinq tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [001-AS1, AS3, AS4] Écrire d'abord `apps/api/src/modules/trips/domain/trip.spec.ts` (« 001-AS1: creates a trip… », « 001-AS3: rejects an unknown site », « 001-AS4: rejects a departure in the past ») et `packages/shared/src/trips.spec.ts`, puis `packages/shared/src/trips.ts`, `domain/trip.ts` et `domain/trips.errors.ts`
- [x] T02 [001-AS1, AS2] Écrire d'abord `apps/api/src/modules/trips/application/trips.application.spec.ts` (« 001-AS1: publishes a trip with a management code », « 001-AS2: lists upcoming trips to a site sorted by departure »), puis le port, le dépôt en mémoire, `PublishTrip` et `ListUpcomingTrips`
- [x] T03 [001-AS2] Écrire d'abord `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` (« 001-AS2: lists only upcoming trips to the site, sorted by departure »), puis `trips.schema.ts`, `trip.mapper.ts`, `drizzle-trip.repository.ts` et la migration générée
- [x] T04 [001-AS1, AS2, AS3, AS4] Écrire d'abord `apps/api/test/trips.e2e.spec.ts` (un test par scénario, « 001-AS1: … » à « 001-AS4: … »), puis `trips.controller.ts`, `trips.module.ts` et son ajout dans `app.module.ts`
- [x] T05 [001-AS1, AS2, AS3, AS4] Écrire d'abord les tests des deux routes dans `apps/web/src/mocks/handlers.test.ts` (« 001-AS1: … » à « 001-AS4: … »), puis les handlers dans `handlers.ts` et la liste `trips` dans `fixture.ts`
