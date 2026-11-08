# 004 — Publier un trajet depuis un message libre : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module `trips` une seconde façon de publier un trajet : le conducteur envoie son annonce WhatsApp telle quelle avec son téléphone, Claude en extrait un brouillon de trajet, et l'application passe ce brouillon par exactement les mêmes contrôles que la publication de TR1 avant de l'enregistrer. À la fin, un conducteur publie par l'API un trajet depuis un message et reçoit le trajet compris avec son code de gestion. Un message vide est refusé sans appeler Claude, un message où manquent des informations est refusé avec la liste des champs manquants, et une panne de Claude est refusée en 503 sans rien publier. L'appel à Claude est derrière un port de l'application, remplacé par un faux dans tous les tests. Le travail tient en cinq tâches, dans l'ordre des couches : socle des erreurs, schémas partagés et domaine ; cas d'usage ; adaptateur Claude ; route HTTP ; fausse API du front. Il n'y a ni écran, ni aperçu ou correction du trajet compris, ni nouvelle table.

Les mots de la spec et leur nom dans le code :

| Dans la spec               | Dans le code              | Ce que c'est                                                                                                       |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| message (annonce WhatsApp) | `message`                 | Le texte libre collé par le conducteur, envoyé avec son téléphone `driverPhone`.                                   |
| assistant IA               | `TripMessageReader`       | Le port de l'application qui transforme un message en brouillon de trajet.                                         |
| l'assistant réel           | `ClaudeTripMessageReader` | L'implémentation du port, dans `infra/`, qui appelle Claude avec le SDK `@anthropic-ai/sdk`.                       |
| faux assistant             | `FakeTripMessageReader`   | L'implémentation des tests : elle renvoie le brouillon qu'on lui a donné, ou tombe en panne, et compte ses appels. |
| ce que l'assistant extrait | `TripDraft`               | Le brouillon : lieu de départ, site, heure de départ, places, participation, chacun pouvant être absent (`null`).  |
| champs manquants           | `missingFields`           | La liste des champs du brouillon restés absents, renvoyée dans `details` du refus `MESSAGE_UNREADABLE`.            |
| publier depuis un message  | `PublishTripFromMessage`  | Le cas d'usage qui vérifie le message, appelle l'assistant, complète le brouillon puis appelle `PublishTrip`.      |
| assistant indisponible     | `ASSISTANT_UNAVAILABLE`   | Le refus 503 quand Claude ne répond pas ou que sa réponse est inexploitable.                                       |
| heure de Dakar             | UTC+00:00                 | Dakar est à UTC+0 toute l'année, sans heure d'été : « 9 novembre 8 h » à Dakar est `2026-11-09T08:00:00.000Z`.     |

## 2. Fichiers par couche

On ne crée pas de nouveau module : la publication depuis un message est ajoutée au module `trips` (`apps/api/src/modules/trips/`), qui porte déjà la publication de TR1. Les fichiers suivent l'organisation déjà en place dans ce module.

- **core** :
  - `apps/api/src/core/errors/app-error.ts` : le type `ErrorKind` reçoit la catégorie `UNAVAILABLE`, pour un service extérieur dont l'application dépend et qui ne répond pas.
  - `apps/api/src/core/errors/problem-details.filter.ts` : `STATUS_BY_KIND` associe `UNAVAILABLE` au statut 503. Comme ce statut est supérieur ou égal à 500, le filtre journalise déjà l'erreur ; il garde le code `ASSISTANT_UNAVAILABLE` et son message, puisque ce n'est pas une erreur inattendue. `problem-details.filter.spec.ts` reçoit le test de cette correspondance.
  - `apps/api/src/core/errors/invalid-input.error.ts` définit `InvalidInputError`, une `AppError` de code `VALIDATION_FAILED` et de catégorie `VALIDATION`, construite à partir d'une `ZodError` dont elle reprend les problèmes dans `details`. Elle sert à refuser, avec le même code qu'en TR1, un brouillon dont une valeur est invalide (moins d'une place, lieu de départ trop long).
  - `apps/api/src/core/config/app-config.ts` : le schéma de l'environnement reçoit `ANTHROPIC_API_KEY`, chaîne non vide et facultative. `apps/api/.env.example` reçoit la ligne `ANTHROPIC_API_KEY=` ; la vraie clé ne va que dans `apps/api/.env`.
- **shared** : `packages/shared/src/trips.ts` reçoit :
  - `TRIP_MESSAGE_MAX_LENGTH` (1 000 caractères) et `publishTripFromMessageSchema` (`message`, chaîne de 1 000 caractères au plus, qui peut être vide ; `driverPhone`, le même schéma de téléphone qu'en TR1), le corps de la nouvelle route. Le message vide passe la validation Zod pour que le domaine le refuse avec `MESSAGE_EMPTY` plutôt qu'avec `VALIDATION_FAILED`.
  - `tripDraftSchema` (`departurePlace`, `site`, `departureAt` au format `AAAA-MM-JJTHH:mm` à l'heure de Dakar, `seats`, `pricePerSeat`, chacun nullable) et le type `TripDraft`. Ce schéma décrit à la fois la réponse demandée à Claude et le brouillon que la fausse API du front sait renvoyer.
  - `TRIP_DRAFT_FIELDS`, la liste des cinq champs du brouillon, dans l'ordre où ils sont rapportés dans `missingFields`.
  - `packages/shared/src/trips.spec.ts` teste ces schémas.
- **domain** :
  - `domain/trip-draft.ts` exporte `readableMessage(message)`, qui lève `MESSAGE_EMPTY` pour un message vide ou fait seulement d'espaces et renvoie le message coupé aux deux bouts, et `completeTripDraft(draft)`, qui lève `MESSAGE_UNREADABLE` avec `details.missingFields` si un champ est absent, et sinon renvoie le trajet avec son heure de départ convertie de l'heure de Dakar en instant (`Date`). Une participation « gratuite » est un `0` extrait par l'assistant, pas un champ absent ; rien n'est complété par défaut.
  - `domain/trips.errors.ts` ajoute les codes `MESSAGE_EMPTY` (VALIDATION), `MESSAGE_UNREADABLE` (BUSINESS_RULE) et `ASSISTANT_UNAVAILABLE` (UNAVAILABLE).
  - `domain/trip-draft.spec.ts` contient les tests unitaires.
- **application** :
  - `application/trip-message.reader.ts` est le port `TripMessageReader`, une classe abstraite avec `read(message, now): Promise<TripDraft>`. `now` sert à l'assistant pour comprendre « demain » ; une implémentation qui ne peut pas répondre lève `ASSISTANT_UNAVAILABLE`.
  - `application/use-cases/publish-trip-from-message.ts` est le cas d'usage `PublishTripFromMessage`. Dans l'ordre : `readableMessage()` (l'assistant n'est pas appelé pour un message vide), `reader.read()`, `completeTripDraft()`, validation du trajet complété avec `publishTripSchema` (échec : `InvalidInputError`), puis `PublishTrip.execute()`, qui applique les règles de TR1 (`SITE_UNKNOWN`, `DEPARTURE_IN_PAST`) et enregistre le trajet.
  - `application/testing/fake-trip-message-reader.ts` est le faux assistant : il renvoie le brouillon qu'on lui donne avec `willRead(draft)`, lève `ASSISTANT_UNAVAILABLE` après `willFail()`, et expose `calls`, le nombre de fois où il a été appelé.
  - `application/trips.application.spec.ts` reçoit les tests du cas d'usage, avec le dépôt en mémoire et le faux assistant.
- **infra** :
  - `infra/claude-trip-message-reader.ts` est `ClaudeTripMessageReader`, l'implémentation du port avec `@anthropic-ai/sdk` (dépendance ajoutée à `apps/api/package.json`). Il appelle `client.messages.parse()` avec le modèle `claude-opus-5-5`, `output_config.format` construit par `zodOutputFormat(tripDraftSchema)`, un effort `low`, `max_tokens` à 1 024, un délai de 20 secondes et une seule nouvelle tentative. Il n'active pas de repli vers un autre modèle : un refus de Claude donne simplement `ASSISTANT_UNAVAILABLE`. Chaque option utilisée (`messages.parse`, `output_config.effort`, `zodOutputFormat` et son import `@anthropic-ai/sdk/helpers/zod`, `timeout`, `maxRetries`, `fetch`, `stop_reason`, `parsed_output`) est vérifiée dans les types de la version installée du SDK ; une option absente est remplacée par son équivalent documenté pour cette version, et le remplacement est noté dans le commit. Le prompt système, en français, donne la date et l'heure actuelles à Dakar, la liste des sites `TRIP_SITES`, et demande de laisser à `null` toute information absente du message, sans rien deviner. La clé vient de `AppConfig` (`ANTHROPIC_API_KEY`). Lèvent `ASSISTANT_UNAVAILABLE` : une clé absente, une erreur du SDK (réseau, délai, statut HTTP), un `stop_reason` `refusal` ou `max_tokens`, et un `parsed_output` vide.
  - `infra/claude-trip-message-reader.spec.ts` le teste sans appeler Claude : le client du SDK reçoit une fonction `fetch` de test, qui enregistre la requête et renvoie une réponse préparée.
- **http** : `http/trips.controller.ts` reçoit une route :
  - `POST /api/trips/from-message` publie un trajet à partir du corps `publishTripFromMessageSchema` et renvoie `201` avec le trajet publié au format `publishedTripSchema`, le même qu'en TR1 : le trajet public et son `managementCode`, sans le téléphone.
- **module** : `trips.module.ts` relie le port `TripMessageReader` à `ClaudeTripMessageReader` et déclare `PublishTripFromMessage`. `apps/api/test/create-test-app.ts` remplace `TripMessageReader` par `FakeTripMessageReader`, pour qu'aucun test e2e n'appelle Claude ; le test le récupère avec `app.get(TripMessageReader)` pour lui dicter sa réponse. `apps/api/test/trips.e2e.spec.ts` reçoit les tests de la route.
- **web** : aucun écran, l'écran est hors périmètre. La fausse API reçoit la route, comme le demande la règle du dépôt :
  - `apps/web/src/mocks/control.ts` reçoit `setTripDraft(draft)`, le brouillon que le faux assistant de la fausse API renverra (par défaut, tous les champs à `null`), et `failAssistant()`, qui le fait tomber en panne jusqu'au `reset()`.
  - `apps/web/src/mocks/handlers.ts` reçoit le handler `POST */api/trips/from-message`, qui applique les mêmes refus que l'API dans le même ordre, et les titres des statuts 422 et 503.
  - `apps/web/src/mocks/handlers.test.ts` reçoit ses tests.

## 3. Données

On n'ajoute ni table ni colonne : un trajet publié depuis un message est un trajet comme les autres, enregistré dans la table `trips` par `PublishTrip`. Le message lui-même n'est pas conservé. Aucune migration.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier `TripError`, avec le code et le statut imposés par la spec. Les refus de TR1 sont repris tels quels, puisque le trajet passe par `PublishTrip`.

| Code AppError           | Catégorie     | HTTP | Quand                                                                                                                                               | Scénario |
| ----------------------- | ------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `SITE_UNKNOWN`          | VALIDATION    | 400  | Déjà créé en TR1 ; le site extrait n'est ni `dakar`, ni `diamniadio`, ni `saly`.                                                                    | AS2      |
| `DEPARTURE_IN_PAST`     | VALIDATION    | 400  | Déjà créé en TR1 ; l'heure de départ extraite est égale ou antérieure à l'instant présent.                                                          | AS3      |
| `MESSAGE_EMPTY`         | VALIDATION    | 400  | Le message est vide ou ne contient que des espaces ; l'assistant n'est pas appelé.                                                                  | AS4      |
| `MESSAGE_UNREADABLE`    | BUSINESS_RULE | 422  | Un ou plusieurs champs du brouillon sont absents ; `details.missingFields` les liste.                                                               | AS5      |
| `ASSISTANT_UNAVAILABLE` | UNAVAILABLE   | 503  | Claude ne répond pas, décline, ou renvoie une réponse inexploitable ; rien n'est publié.                                                            | aucun    |
| `VALIDATION_FAILED`     | VALIDATION    | 400  | Le corps est invalide (téléphone, message trop long), ou le brouillon complet a moins d'une place, une participation négative ou un lieu trop long. | aucun    |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit, puis par le test e2e qui vérifie la réponse observée par l'appelant. Comme les tests n'appellent jamais Claude, ce que « l'assistant extrait » dans un scénario est le brouillon donné au faux assistant. Le test du cas d'usage fixe l'horloge au 8 novembre 2026 à 15 h, heure de Dakar (`vi.setSystemTime`), comme le scénario AS1 ; le test e2e, qui ne fixe pas l'horloge, construit un départ « demain à 8 h » relatif au jour où il tourne.

| Scénario | Fichier de test                                        | Niveau      | Ce que le test vérifie                                                                                                                                |
| -------- | ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/trip-draft.spec.ts` | unitaire    | `completeTripDraft()` lit `2026-11-09T08:00` à l'heure de Dakar comme `2026-11-09T08:00:00.000Z`, et garde Pikine, `diamniadio`, 3 places et 1 000 F. |
| AS1      | `…/trips/application/trips.application.spec.ts`        | application | Au 8 novembre 2026 à 15 h, `PublishTripFromMessage` publie le trajet du 9 novembre à 8 h avec un code de gestion, et `ListUpcomingTrips` le renvoie.  |
| AS1      | `…/trips/infra/claude-trip-message-reader.spec.ts`     | unitaire    | La requête envoyée à Claude contient le message et l'heure de Dakar, et la réponse préparée devient le `TripDraft` attendu.                           |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                      | e2e         | `POST /api/trips/from-message` répond 201 avec le trajet compris et un `managementCode`, et `GET /api/trips?site=diamniadio` le contient.             |
| AS2      | `…/trips/application/trips.application.spec.ts`        | application | Un brouillon dont le site est « Thiès » lève `SITE_UNKNOWN`, et le dépôt en mémoire reste vide.                                                       |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                      | e2e         | La route répond 400 `SITE_UNKNOWN`, et aucun trajet n'est enregistré.                                                                                 |
| AS3      | `…/trips/application/trips.application.spec.ts`        | application | Un brouillon parti hier à 8 h lève `DEPARTURE_IN_PAST`, et le dépôt en mémoire reste vide.                                                            |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                      | e2e         | La route répond 400 `DEPARTURE_IN_PAST`, et aucun trajet n'est enregistré.                                                                            |
| AS4      | `apps/api/src/modules/trips/domain/trip-draft.spec.ts` | unitaire    | `readableMessage()` lève `MESSAGE_EMPTY` pour `""` et pour `"   "`.                                                                                   |
| AS4      | `…/trips/application/trips.application.spec.ts`        | application | Avec un message fait d'espaces, `PublishTripFromMessage` lève `MESSAGE_EMPTY`, le faux assistant a `calls` à 0, et le dépôt reste vide.               |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                      | e2e         | La route répond 400 `MESSAGE_EMPTY`, le faux assistant n'a pas été appelé, et aucun trajet n'est enregistré.                                          |
| AS5      | `apps/api/src/modules/trips/domain/trip-draft.spec.ts` | unitaire    | Un brouillon qui n'a que le site lève `MESSAGE_UNREADABLE` avec `missingFields` égal à `departurePlace`, `departureAt`, `seats`, `pricePerSeat`.      |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                      | e2e         | La route répond 422 `MESSAGE_UNREADABLE` avec ces quatre champs dans `details.missingFields`, et aucun trajet n'est enregistré.                       |

Les comportements sans scénario ont aussi leurs tests, sans identifiant dans le titre : le statut 503 de la catégorie `UNAVAILABLE` (`problem-details.filter.spec.ts`), les cas d'`ASSISTANT_UNAVAILABLE` de l'adaptateur (`claude-trip-message-reader.spec.ts`), la réponse 503 de la route quand le faux assistant est en panne, et le refus `VALIDATION_FAILED` d'un brouillon à 0 place (`trips.e2e.spec.ts`). La fausse API reprend AS1 à AS5 et la panne de l'assistant dans `apps/web/src/mocks/handlers.test.ts`, avec les mêmes statuts et codes.

## 6. Tâches

Cinq tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [004-AS1, AS4, AS5] Écrire d'abord les tests de `domain/trip-draft.spec.ts` (« 004-AS1: reads the departure in Dakar time », « 004-AS4: rejects an empty message », « 004-AS5: lists the missing fields »), de `packages/shared/src/trips.spec.ts` et de `problem-details.filter.spec.ts` (« maps an UNAVAILABLE error to 503 »), puis la catégorie `UNAVAILABLE`, `InvalidInputError`, les schémas de `packages/shared/src/trips.ts`, `domain/trip-draft.ts` et les trois codes de `trips.errors.ts`
- [x] T02 [004-AS1, AS2, AS3, AS4] Écrire d'abord les tests de `application/trips.application.spec.ts` (« 004-AS1: publishes a trip from a message », « 004-AS2: rejects an unknown site », « 004-AS3: rejects a departure in the past », « 004-AS4: does not call the assistant for an empty message »), puis le port `TripMessageReader`, `FakeTripMessageReader` et `PublishTripFromMessage`
- [x] T03 [004-AS1] Écrire d'abord `infra/claude-trip-message-reader.spec.ts` (« 004-AS1: sends the message with the Dakar time and reads the draft », puis les cas de panne), puis la dépendance `@anthropic-ai/sdk`, la vérification de chaque option utilisée dans les types du SDK installé (équivalent documenté sinon), `ANTHROPIC_API_KEY` dans `app-config.ts` et `.env.example`, et `ClaudeTripMessageReader`
- [x] T04 [004-AS1, AS2, AS3, AS4, AS5] Écrire d'abord les tests de `apps/api/test/trips.e2e.spec.ts` (un par scénario, « 004-AS1: … » à « 004-AS5: … », plus la panne de l'assistant), puis la route dans `trips.controller.ts`, les déclarations de `trips.module.ts` et le remplacement de l'assistant dans `create-test-app.ts`
- [x] T05 [004-AS1, AS2, AS3, AS4, AS5] Écrire d'abord les tests de `apps/web/src/mocks/handlers.test.ts` (« 004-AS1: … » à « 004-AS5: … », plus la panne de l'assistant), puis `setTripDraft()` et `failAssistant()` dans `control.ts`, et le handler et les titres 422 et 503 dans `handlers.ts`

## 7. Corrections

### Passage 1

- [x] T06 [004-AS1] Écrire d'abord, dans `packages/shared/src/trips.spec.ts`, le test « 004-AS1: rejects a departure that is not a real date (2026-11-09T25:00, 2026-13-45T08:00, 2026-02-30T08:00) », dans `infra/claude-trip-message-reader.spec.ts` le cas « is unavailable on an impossible departure date », et dans `apps/web/src/mocks/handlers.test.ts` le test « answers 503 ASSISTANT_UNAVAILABLE for an impossible departure date », puis faire vérifier par `tripDraftSchema` que `departureAt` est une date et une heure qui existent (relecture du jour, du mois et de l'heure), et faire valider le brouillon du faux assistant par ce schéma dans `handlers.ts`. Dans la même tâche, aligner les deux formes de `VALIDATION_FAILED` : écrire d'abord, dans `problem-details.filter.spec.ts`, « maps an InvalidInputError to 400 VALIDATION_FAILED with the invalid fields in errors », et dans `trips.e2e.spec.ts` et `handlers.test.ts` la vérification de `errors` (premier niveau, chemin `seats`) pour un brouillon à 0 place, puis faire porter les erreurs par `InvalidInputError` et les placer dans `errors` dans `toProblem`, comme pour un corps invalide, et utiliser `validationFailed()` dans le handler de la fausse API. Preuve (relecteur) : `packages/shared/src/trips.ts` (`DAKAR_LOCAL_DATE_TIME`) laisse passer `2026-11-09T25:00`, que `completeTripDraft` transforme en date invalide ; `departureAt.toISOString()` dans `publish-trip-from-message.ts` lève alors une `RangeError`, qui donne 500 au lieu de 503 `ASSISTANT_UNAVAILABLE`, pendant que la fausse API répond 400 ; et `2026-02-30T08:00` est publié au 2 mars sans refus.
