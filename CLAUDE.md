# CLAUDE.md

Application des JOJ Dakar 2026 : une API NestJS (`apps/api`), un front React (`apps/web`) et des schémas partagés (`packages/shared`), dans un monorepo pnpm. Commandes et structure détaillée : `README.md`.

## Module de référence

Cette branche ne contient aucun module métier. Le module de référence est sur la branche `main`, en lecture seule : on s'en inspire, on ne le copie pas dans le projet.

- Lister ses fichiers : `git ls-tree -r --name-only main -- apps/api/src/modules apps/api/test packages/shared/src apps/web/src/features apps/web/src/mocks`.
- Lire un fichier : `git show main:<chemin>`.
- Dès que le projet a son premier module, c'est lui qui sert de modèle aux suivants.

## Méthodologie

- Toute fonctionnalité suit le cycle `/prd` → `/spec` → `/spec-plan` → `/tdd-task` → `/converge` (voir `specs/constitution.md`).
- Un test d'abord, vu en échec avec `pnpm tdd:red <fichier>`, puis le code minimal ; `pnpm verify` avant chaque commit.
- Une tâche = un commit Conventional Commits qui cite la tâche et son scénario.
- Rien n'est fini tant que `pnpm check` n'est pas vert.

## Architecture

- Un module par domaine dans `apps/api/src/modules/<domaine>/`, découpé en `domain/`, `application/`, `infra/`, `http/`, plus `<domaine>.module.ts` ajouté aux `imports` de `src/app.module.ts`.
- `domain/` est en TypeScript pur : il n'importe ni NestJS ni Drizzle (le lint le vérifie).
- `application/` dépend d'un port (classe abstraite `<entité>.repository.ts`), jamais de Drizzle ; l'implémentation est dans `infra/`.
- Le socle commun est dans `apps/api/src/core/` (configuration, base, erreurs, santé) : on l'utilise, on ne le duplique pas.
- Les schémas d'entrée et de sortie sont dans `packages/shared/src/<domaine>.ts`, exportés par `index.ts`, et servent à l'API comme au front.
- Le front range une fonctionnalité dans `apps/web/src/features/<domaine>/` (`api/` puis `components/`), et ses pages dans `apps/web/src/routes/`.
- Pour tout écran ou composant du front React, utiliser les skills frontend-design et design-motion-principles.

## Concepts appréciés

- Typage strict : pas de `any`, pas de `as` pour faire taire le compilateur.
- Une classe par cas d'usage, avec une seule méthode publique `execute()`.
- Les entités se créent par `create()`, qui applique les règles, et se relisent depuis la base par `restore()`.
- Des controllers fins : valider, appeler un cas d'usage, sérialiser. Aucune règle métier dans `http/`.
- Des fonctions courtes, et des noms qui disent le métier.

## Bonnes pratiques

- Toute erreur métier est une sous-classe d'`AppError` avec un code stable et une catégorie (VALIDATION, NOT_FOUND, CONFLICT, BUSINESS_RULE) ; seul `ProblemDetailsFilter` la transforme en réponse HTTP. Jamais de `HttpException`.
- Une entrée est validée par un schéma Zod de `packages/shared` (DTO `createZodDto`), jamais à la main dans le controller.
- Aucun secret dans le code : les valeurs sensibles viennent de `apps/api/.env`.
- Tests unitaires du domaine, tests des cas d'usage avec le repository en mémoire (`application/testing/`), tests d'intégration Drizzle et e2e de l'API sur PGlite en mémoire (`apps/api/test/`).
- Côté front, toute route de l'API a son pendant dans la fausse API `apps/web/src/mocks/` (mêmes schémas, mêmes codes d'erreur), avec son test.
- Une migration se génère (`pnpm db:generate --name=<sujet>`), elle ne s'écrit jamais à la main.

## Nommage

- Fichiers en kebab-case : `create-booking.ts`, `drizzle-booking.repository.ts`, `bookings.controller.ts`.
- Classes en PascalCase ; un cas d'usage est un verbe suivi de l'entité : `CreateBooking`.
- Codes d'erreur en majuscules, préfixés par l'entité : `BOOKING_NOT_FOUND`, `TRIP_FULL`.
- Tests : `*.spec.ts` (unitaire), `*.int.spec.ts` (intégration), `*.e2e.spec.ts`, `*.test.tsx` (front). Titres en anglais, préfixés par le scénario : `it('001-AS2: rejects a full trip')`.
- Commits : `feat(bookings): T03 refuse a full trip (001-AS2)`.
