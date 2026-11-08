# 002 — Réserver une place

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR2

## Contexte

Le supporter trouve désormais les départs vers son site, mais doit encore relancer le conducteur sur WhatsApp pour obtenir une place. Cette tranche lui permet de réserver une place sur un trajet à venir et de joindre le conducteur pour fixer le point de rendez-vous.

## User stories

- En tant que supporter sans véhicule, je veux réserver une place sur un trajet à venir avec mon nom et mon téléphone, afin d'être sûr d'avoir ma place sans négocier dans un groupe.
- En tant que supporter qui a réservé, je veux voir le téléphone du conducteur, afin de convenir avec lui du point de rendez-vous.
- En tant que supporter qui cherche un départ, je veux voir les places restantes de chaque trajet, afin de ne pas viser un trajet complet.

## Scénarios d'acceptation

### AS1 — Réserver une place

- **Étant donné** un trajet à venir Pikine → Diamniadio, demain à 8 h, avec 3 places et aucune réservation
- **Quand** Awa, téléphone 77 123 45 67, réserve une place
- **Alors** elle reçoit un code de réservation et le téléphone du conducteur

### AS2 — Voir les places restantes dans la liste

- **Étant donné** un trajet à venir vers Diamniadio avec 3 places et une réservation
- **Quand** un supporter consulte les départs vers Diamniadio
- **Alors** il voit ce trajet avec 2 places restantes, toujours sans le téléphone du conducteur

### AS3 — Refuser un trajet complet

- **Étant donné** un trajet à venir avec 1 place, déjà réservée
- **Quand** un autre supporter réserve une place
- **Alors** la réservation est refusée : 409 avec le code TRIP_FULL, et aucune réservation n'est créée

### AS4 — Refuser une double réservation du même supporter

- **Étant donné** un trajet à venir avec 3 places, sur lequel le téléphone 77 123 45 67 a déjà réservé
- **Quand** un supporter réserve à nouveau avec le téléphone 77 123 45 67
- **Alors** la réservation est refusée : 409 avec le code PASSENGER_ALREADY_BOOKED, et les places restantes ne changent pas

### AS5 — Refuser un trajet déjà parti

- **Étant donné** un trajet vers Diamniadio parti hier à 8 h
- **Quand** un supporter réserve une place
- **Alors** la réservation est refusée : 409 avec le code TRIP_DEPARTED, et aucune réservation n'est créée

### AS6 — Refuser un trajet inconnu

- **Étant donné** aucun trajet ne correspond au trajet demandé
- **Quand** un supporter réserve une place
- **Alors** la réservation est refusée : 404 avec le code TRIP_NOT_FOUND

## Hors périmètre

- Réserver plusieurs places en une fois : une réservation = une place.
- Consulter ou annuler sa réservation avec son code (TR3).
- Écran : comme TR1, cette tranche ne livre que l'API.

## Questions ouvertes

- Même supporter : tranché, reconnu par son téléphone seul (PRD), quel que soit le nom saisi.
- Saisie invalide (nom vide, téléphone mal formé) : tranché, refusée comme saisie invalide, sans scénario.
