# Covoiturage des JOJ Dakar 2026

**Le problème et pour qui** : pendant les JOJ, un supporter sans véhicule doit rejoindre un site (Dakar, Diamniadio, Saly) à l'heure de son épreuve, pendant que des conducteurs s'y rendent avec des places vides ; ils se cherchent sur des groupes WhatsApp où les annonces se perdent.

**L'application en ligne** : https://covoiturage-joj.onrender.com (hébergement gratuit : après 15 minutes sans visite, la première page met environ une minute à revenir).

**Ce qui manque** : aucune notification (un passager ne voit l'annulation de son trajet qu'en consultant sa réservation), aucun moyen de retrouver un code perdu, et sur iPhone l'envoi WhatsApp du billet du conducteur ne garde parfois que le lien de gestion.

## La solution

Une application web mobile gratuite, ouverte par un lien partagé sur WhatsApp, sans installation et sans compte.

- **Le conducteur** colle son annonce telle qu'il l'écrit sur WhatsApp (« je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F »), ou remplit un formulaire. Il reçoit un code et un lien de gestion, à garder, qui lui permettent d'annuler son trajet.
- **Le supporter** choisit son site, voit les départs à venir classés par heure avec leurs places restantes et leur participation aux frais, et réserve avec son nom et son téléphone. Il reçoit un code de réservation et le téléphone du conducteur, pour fixer le point de rendez-vous.
- **Chacun gère avec son code** : le supporter retrouve son billet, voit s'il est actif ou annulé, l'annule et l'envoie sur WhatsApp ; le conducteur ouvre son lien de gestion et annule son trajet.

Aucun paiement ne passe par l'application : la participation se règle à la descente, en espèces ou par Wave. Les écrans sont en français et portent l'identité des JOJ Dakar 2026.

## Les 7 tranches livrées

Le produit est décrit dans [`specs/prd-covoiturage.md`](specs/prd-covoiturage.md) et découpé en sept tranches, chacune avec sa spec, son plan et ses tests.

| Tranche | Ce qu'elle apporte                                                                                  | Spec                            |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| TR1     | Publier un trajet et lister les départs à venir vers un site ; site inconnu et départ passé refusés | `specs/001-trajets`             |
| TR2     | Réserver une place ; trajet complet, double réservation et trajet déjà parti refusés                | `specs/002-reservations`        |
| TR3     | Annuler sa réservation (la place se libère) ou son trajet (il quitte la liste) avec son code        | `specs/003-annulations`         |
| TR4     | Publier un trajet depuis un message libre, lu par Claude puis recontrôlé par l'application          | `specs/004-publication-message` |
| TR5     | L'accueil sur téléphone : choisir un site, voir les départs, réserver, avec la mascotte             | `specs/005-accueil-reserver`    |
| TR6     | L'écran du conducteur : coller son annonce ou remplir le formulaire, garder son code et son lien    | `specs/006-publier-trajet`      |
| TR7     | Les écrans des codes : retrouver et annuler sa réservation, gérer son trajet, envoyer son billet    | `specs/007-gerer-codes`         |

## Le rôle de l'IA

**Dans le produit**, Claude (`claude-opus-5-5`) fait une seule chose : lire l'annonce du conducteur et en tirer un brouillon de trajet (lieu de départ, site, heure, places, participation). Une information absente de l'annonce reste vide, elle n'est jamais devinée.

**L'application revalide toujours** : le brouillon passe par les mêmes contrôles qu'un trajet saisi au formulaire (site des JOJ, départ à venir, places, téléphone). Ce que Claude propose n'est jamais publié sans contrôle. Si l'annonce est incomplète, le conducteur arrive sur le formulaire avec les champs manquants signalés ; si l'assistant ne répond pas (ou si aucune clé n'est configurée), il y arrive aussi, et rien n'est publié. Aucun test n'appelle le vrai assistant : il y est remplacé par un faux.

**Dans la fabrication**, l'application a été écrite avec Claude Code, en suivant la méthode ci-dessous : l'humain décide du produit et valide chaque étape, l'IA rédige, code et se fait relire.

## La méthode

Un développement guidé par la spec, en cinq commandes Claude Code et trois validations humaines (règles dans [`specs/constitution.md`](specs/constitution.md)) :

```
/prd <idée>     → specs/prd-nom.md : la vision, en tranches TR1, TR2…      ── l'humain valide
/spec TRn       → specs/NNN-nom/spec.md : le quoi, en scénarios AS1, AS2…  ── l'humain valide
/spec-plan      → plan.md : fichiers, erreurs, un test par scénario, tâches ── l'humain valide
/tdd-task       → pour chaque tâche : test rouge → code → vert → un commit
/converge       → traçabilité + pnpm check + relecteur indépendant → « Converged »
```

- **PRD** : pour qui, quel problème, quelle solution, et le découpage en tranches. La vision est celle de l'humain ; l'IA la challenge, elle ne l'invente pas.
- **Specs** : ce que l'utilisateur voit et ce que le système refuse, sans technique.
- **Plans** : le comment, couche par couche, avec un test prévu pour chaque scénario.
- **TDD** : aucun code sans un test vu en échec pour la bonne raison (`pnpm tdd:red`) ; le titre de chaque test commence par son scénario (`007-AS3: …`), et `pnpm spec:check --trace` vérifie que chaque scénario a son test.
- **Relecteur indépendant** : celui qui produit ne valide pas. Un sous-agent relit chaque fonctionnalité dans un contexte vierge (la base git et la spec, rien d'autre) et rend un verdict, preuves à l'appui.

## Lancer en local

Prérequis : **Node 24** (`nvm use`), **pnpm** par corepack (`corepack enable`) et Git. Docker est facultatif.

```bash
pnpm install
pnpm dev
```

- le front : http://localhost:5173
- l'API : http://localhost:3000/api (santé : `/api/health`, doc Swagger : `/api/docs`)

Par défaut, la base est **PGlite**, un PostgreSQL embarqué dans le process de l'API, dans `apps/api/.data/` : rien à installer. Pour un vrai PostgreSQL, `docker compose up -d` puis `DATABASE_URL=postgres://joj:joj@localhost:5432/joj` dans `apps/api/.env`. Pour que Claude lise les annonces, `ANTHROPIC_API_KEY` dans ce même fichier (ignoré par git) ; sans clé, la publication passe par le formulaire.

| Commande           | Effet                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`         | API (port 3000) et front (port 5173) en parallèle                               |
| `pnpm check`       | tout le dépôt : format, lint, types, tous les tests, build                      |
| `pnpm test`        | tous les tests (Vitest), sans Docker ni réseau                                  |
| `pnpm build`       | build du front (Vite, `apps/web/dist`) puis de l'API (SWC, `apps/api/dist`)     |
| `pnpm start`       | production : applique les migrations, puis lance l'API, qui sert aussi le front |
| `pnpm db:generate` | génère une migration après un changement de schéma Drizzle                      |
| `pnpm db:reset`    | vide la base locale et réapplique les migrations (arrêter `pnpm dev` avant)     |

Pour essayer le build de production sur sa machine, sur une base jetable et un seul port :

```bash
pnpm build
NODE_ENV=production PGLITE_DATA_DIR=/tmp/joj-demo SEED_DEMO_DATA=true pnpm start
# puis http://localhost:3000 : le front et l'API (/api) sur le même port
```

Le dépôt est un monorepo pnpm : `apps/api` (NestJS, Drizzle, un module `trips` découpé en `domain/`, `application/`, `infra/`, `http/`), `apps/web` (React, Vite, TanStack Router et Query) et `packages/shared` (schémas Zod communs à l'API et au front). Les conventions sont dans [`CLAUDE.md`](CLAUDE.md).

## Déployer sur Render

Le fichier [`render.yaml`](render.yaml) décrit tout le déploiement, gratuit : une base Postgres et **un seul service web**. L'API sert aussi le front construit, sur la même origine : les pages du front (`/`, `/publier`, `/reservation`, `/trajets/:id/gestion`) reçoivent `index.html`, tout le reste est sous `/api`, et il n'y a pas de CORS à régler.

1. Sur [dashboard.render.com](https://dashboard.render.com) : **New** > **Blueprint**, puis choisir ce dépôt et la branche à déployer.
2. Render lit `render.yaml` et demande la valeur de `ANTHROPIC_API_KEY` : la saisir (elle n'est jamais dans le dépôt). Sans elle, l'application marche, mais l'annonce collée mène au formulaire.
3. **Deploy Blueprint**. Render crée la base `covoiturage-joj-db` et le service `covoiturage-joj`, puis lance le build et le démarrage.
4. Reporter l'adresse du service (`https://….onrender.com`) en tête de ce README.

Ce que fait Render à chaque déploiement :

- **Build** : `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build`. Node 24 est lu dans `.nvmrc` ; pnpm est à la version du champ `packageManager` de `package.json`.
- **Démarrage** : les migrations sont appliquées, puis l'API écoute sur le port donné par Render (`PORT`). La santé est surveillée sur `/api/health`.
- **Données de démo** : avec `SEED_DEMO_DATA=true`, huit trajets vers les trois sites (Pikine, Guédiawaye, Rufisque, Keur Massar, Thiès, Mbour…), de demain à dans trois jours, sont chargés au démarrage, seulement si la base ne contient aucun trajet. Une base déjà utilisée n'est jamais touchée.

## Limites

- **Logo et mascotte** : l'identité officielle des JOJ Dakar 2026 est utilisée avec l'accord des formateurs, pour ce projet de bootcamp seulement. Une diffusion publique demanderait l'accord du comité d'organisation.
- **Heures interprétées** : si Claude comprend mal « demain » ou « 8h », le trajet publié est faux. Le contrôle ne détecte qu'un départ passé ou un site inconnu ; le conducteur voit le trajet tel qu'il a été compris et peut l'annuler.
- **Hébergement gratuit** : le service s'endort après 15 minutes sans visite, et la première page met alors environ une minute à revenir. La base Postgres gratuite expire 30 jours après sa création, et les trajets de démo, datés par rapport au jour du premier démarrage, sont passés au bout de trois jours.
- **Pas de notification** : sans SMS ni push, un passager n'apprend l'annulation de son trajet qu'en consultant sa réservation.
- **Codes perdus** : un code de réservation ou de gestion qui n'a pas été noté ni envoyé sur WhatsApp ne se retrouve pas.
- **WhatsApp sur iPhone** : le billet du conducteur, qui contient le lien de gestion, n'envoie parfois que ce lien ; celui du supporter, sans lien, envoie tout le texte. La cause n'est pas encore identifiée.

Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic.
