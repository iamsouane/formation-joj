---
name: prd
description: Met en forme la vision produit complète de l'utilisateur dans un PRD d'une page (problème, utilisateurs, proposition, mesure du succès, tranches) dans specs/prd-nom.md, en la challengeant sans la remplacer, puis s'arrête pour validation humaine. Si le PRD existe déjà, l'amende au lieu d'en créer un second. À lancer par l'utilisateur avec /prd <son idée>, avant /spec, ou /prd <la modification> pour amender.
argument-hint: <le problème et la solution que tu imagines, ou la modification du PRD>
---

# /prd : écrire et challenger la vision produit

Demande : $ARGUMENTS

Ton rôle : un product manager exigeant. La vision est celle de l'utilisateur ; tu la mets en forme et tu la challenges. Tu n'inventes ni le problème, ni les utilisateurs, ni la solution.

## 1. Lire les règles

Lis `specs/constitution.md`, et le `CLAUDE.md` du dépôt s'il existe. Applique-les sans les recopier.

Si la demande est vide, demande à l'utilisateur, en une phrase, quel problème il veut résoudre et pour qui. N'écris rien d'autre.

**Le PRD de ce produit existe déjà** (`specs/prd-*.md`) : la demande l'amende. N'en crée pas un second, passe directement à la section 6. Un PRD d'un autre produit n'est pas concerné : écris le nouveau. Si tu ne sais pas lequel la demande vise, demande-le, en une question.

## 2. Challenger avant d'écrire

Confronte la demande aux sept sections du PRD (`.claude/skills/prd/prd-template.md`). Repère les points les plus faibles, par exemple :

- l'utilisateur est vague (« le public », « les gens ») ;
- le problème n'est pas dit, seulement la solution ;
- rien ne dit pourquoi cette solution plutôt qu'une autre, ou pourquoi de l'IA si elle en utilise ;
- la première tranche ne tient pas dans le temps disponible : plus de deux règles métier, ou plus d'une action principale ;
- le succès ne se constate pas (« les utilisateurs sont satisfaits »).

Pose **au plus 3 questions**, en une seule fois, sur les points qui changent le PRD. Une question peut proposer une alternative (« et si on commençait par… ? »), mais c'est l'utilisateur qui choisit. Attends ses réponses.

Si la demande couvre déjà chaque section, ne pose pas de question : écris, et garde tes objections pour l'étape 5.

## 3. Rédiger

- Nom court en kebab-case, sans accent : `covoiturage`, `guide-dakar`. Copie le modèle dans `specs/prd-nom.md`.
- **Aucune technique** : ni route, ni table, ni code HTTP, ni nom de bibliothèque. On écrit pour un utilisateur, pas pour un développeur.
- **Les tranches** couvrent toute la vision : `### TR1 — titre`, `### TR2 — …`. Elles seront réalisées une à une, une spec par tranche, dans l'ordre. La première est la plus petite qui ait de la valeur seule, et tient dans le temps de l'atelier (2 heures de code à l'atelier C) ; les suivantes disent où va le produit.
- Ce que l'utilisateur n'a pas dit et que tu as dû supposer va dans « Hypothèses et risques », marqué comme tel.
- 56 lignes au plus : une page.

## 4. Vérifier

`pnpm spec:check specs/prd-nom.md`. Corrige jusqu'à ce qu'il soit vert.

## 5. S'arrêter

Montre à l'utilisateur :

- les tranches (identifiant et titre) ;
- **tes objections** : les 2 ou 3 faiblesses qui restent, chacune en une phrase, avec la question qu'un coach poserait. Ne les adoucis pas ; s'il n'y en a pas, dis-le.

Puis demande-lui de relire `specs/prd-nom.md` avec la [grille de relecture](../../../task/GRILLE-RELECTURE.md), et de le faire challenger par quelqu'un d'autre (un voisin, son coach).

**Ne passe pas à la suite.** Le statut reste `Brouillon` tant que l'utilisateur n'a pas dit explicitement qu'il valide (« je valide », « ok pour le PRD »). Une remarque n'est pas une validation : corrige le PRD et redemande.

Sur accord explicite seulement : remplace `**Statut** : Brouillon` par `**Statut** : Validé`, relance `pnpm spec:check specs/prd-nom.md`, puis `git add specs/prd-nom.md && git commit -m "docs(prd): add validated prd <nom>"`, et termine par :

> PRD validé. Prochaine étape : `/spec TR1`

## 6. Amender un PRD existant

Le PRD évolue au fil des tranches : une tranche réduite au point coach, une idée arrivée en cours de route. On le modifie ; on n'en écrit pas un autre.

1. Lis le PRD, et les specs qui le citent (ligne `**PRD** : specs/prd-nom.md, TRn`).
2. Applique la modification demandée, et seulement elle. Challenge-la comme à la section 2 si elle touche le problème, les utilisateurs ou la tranche 1 : au plus 3 questions.
3. **Ne renumérote ni ne supprime une tranche citée par une spec.** Une nouvelle tranche prend le numéro suivant. Si la modification change une tranche qui a déjà une spec, dis-le : cette spec devra être revue avant d'être réalisée.
4. Repasse le statut à `**Statut** : Brouillon`, puis vérifie comme à la section 4.
5. Montre à l'utilisateur ce qui a changé (tranches ajoutées, réduites ou modifiées) et les specs concernées, puis arrête-toi comme à la section 5 : le PRD amendé se relit et se valide à nouveau.

Sur accord explicite seulement : `**Statut** : Validé`, `pnpm spec:check specs/prd-nom.md`, puis `git add specs/prd-nom.md && git commit -m "docs(prd): amend prd <nom>"`, et termine par la prochaine étape : `/spec TRn` pour la tranche suivante à réaliser.
