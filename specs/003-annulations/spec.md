# 003 — Annuler une réservation ou un trajet

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR3

## Contexte

Le supporter réserve désormais sa place, mais un empêchement le contraint à relancer le conducteur sur WhatsApp, et sa place reste bloquée. Le conducteur qui ne part plus n'a aucun moyen de prévenir ses passagers. Cette tranche permet à chacun d'annuler avec son code, et au passager de savoir où en est sa réservation.

## User stories

- En tant que supporter qui a réservé, je veux consulter ma réservation avec mon code, afin de savoir si mon trajet tient toujours.
- En tant que supporter qui a réservé, je veux annuler ma réservation avec mon code, afin de libérer ma place pour un autre supporter.
- En tant que conducteur, je veux annuler mon trajet avec mon code de gestion, afin qu'on ne le réserve plus et que mes passagers le sachent.

## Scénarios d'acceptation

### AS1 — Consulter sa réservation

- **Étant donné** Awa a réservé une place sur le trajet à venir Pikine → Diamniadio, demain à 8 h
- **Quand** elle consulte sa réservation avec son code de réservation
- **Alors** elle voit ce trajet (départ, site, heure, téléphone du conducteur) et le statut « actif »

### AS2 — Refuser un code de réservation inconnu

- **Étant donné** aucune réservation ne correspond au code donné
- **Quand** un supporter consulte ou annule une réservation avec ce code
- **Alors** la demande est refusée : 404 avec le code BOOKING_NOT_FOUND

### AS3 — Annuler sa réservation libère la place

- **Étant donné** un trajet à venir avec 3 places, dont une réservée par Awa
- **Quand** Awa annule sa réservation avec son code
- **Alors** le trajet affiche de nouveau 3 places restantes dans la liste des départs, et sa réservation consultée a le statut « annulé »

### AS4 — Le trajet annulé disparaît de la liste

- **Étant donné** un trajet à venir vers Diamniadio, publié avec son code de gestion
- **Quand** le conducteur annule ce trajet avec son code de gestion
- **Alors** ce trajet n'apparaît plus dans la liste des départs vers Diamniadio

### AS5 — Le passager voit « trajet annulé »

- **Étant donné** Awa a réservé une place sur un trajet que le conducteur a ensuite annulé
- **Quand** elle consulte sa réservation avec son code
- **Alors** elle voit le trajet avec le statut « trajet annulé »

### AS6 — Refuser un code de gestion qui ne correspond pas

- **Étant donné** un trajet à venir publié avec son code de gestion
- **Quand** quelqu'un annule ce trajet avec un autre code
- **Alors** l'annulation est refusée : 403 avec le code MANAGEMENT_CODE_INVALID, et le trajet reste dans la liste

### AS7 — Refuser une réservation sur un trajet annulé

- **Étant donné** un trajet à venir avec des places libres, annulé par son conducteur
- **Quand** un supporter réserve une place
- **Alors** la réservation est refusée : 409 avec le code TRIP_CANCELLED, et aucune réservation n'est créée

## Hors périmètre

- Notifications des passagers (SMS, push) : ils voient l'annulation en consultant leur réservation.
- Modifier un trajet ou une réservation.
- Écran : comme TR1 et TR2, cette tranche ne livre que l'API.

## Questions ouvertes

- Annuler deux fois la même réservation : hypothèse, la seconde annulation est sans effet et ne libère pas une seconde place.
- Annuler un trajet inconnu : hypothèse, refus 404 TRIP_NOT_FOUND, comme pour la réservation (TR2).
- Annuler une réservation ou un trajet déjà parti : hypothèse, accepté, sans règle propre dans cette tranche.
