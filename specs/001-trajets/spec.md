# 001 — Publier et lister les trajets

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR1

## Contexte

Pendant les JOJ, conducteurs et supporters se cherchent sur des groupes WhatsApp où les annonces se perdent. Cette tranche donne au conducteur un endroit où publier son trajet vers un site, et au supporter la liste des départs à venir vers ce site.

## User stories

- En tant que conducteur qui se rend sur un site, je veux publier mon trajet avec ses places et sa participation aux frais, afin que les supporters le trouvent sans que je relance mon annonce.
- En tant que supporter sans véhicule, je veux voir les départs à venir vers mon site, triés par heure, afin de choisir celui qui m'y amène à temps.

## Scénarios d'acceptation

### AS1 — Publier un trajet

- **Étant donné** un conducteur au départ de Pikine, vers Diamniadio, demain à 8 h, avec 3 places, une participation de 1 000 F par place et son téléphone
- **Quand** il publie son trajet
- **Alors** il reçoit le trajet créé (Pikine, Diamniadio, demain 8 h, 3 places, 1 000 F) et un code de gestion du trajet

### AS2 — Lister les départs à venir vers un site

- **Étant donné** deux trajets à venir vers Diamniadio, partant demain à 10 h puis demain à 8 h, un trajet à venir vers Saly et un trajet vers Diamniadio déjà parti
- **Quand** un supporter consulte les départs vers Diamniadio
- **Alors** il voit les deux trajets à venir vers Diamniadio, celui de 8 h avant celui de 10 h, sans le téléphone du conducteur ni le code de gestion

### AS3 — Refuser un site inconnu

- **Étant donné** un conducteur qui indique le site « Thiès »
- **Quand** il publie son trajet
- **Alors** la publication est refusée : 400 avec le code SITE_UNKNOWN, et aucun trajet n'est créé

### AS4 — Refuser un départ dans le passé

- **Étant donné** un conducteur dont l'heure de départ est hier à 8 h
- **Quand** il publie son trajet
- **Alors** la publication est refusée : 400 avec le code DEPARTURE_IN_PAST, et aucun trajet n'est créé

## Hors périmètre

- Réserver une place, annuler une réservation ou un trajet (TR2, TR3).
- Calculer les places restantes : la liste affiche le nombre de places publié.
- Écran : cette tranche ne livre que l'API.
- Publier depuis un message libre (TR4).

## Questions ouvertes

- Consulter la liste d'un site inconnu : hypothèse, refus 400 avec le code SITE_UNKNOWN, comme à la publication.
- Départ « à venir » : hypothèse, strictement après l'instant présent ; un départ égal ou antérieur à maintenant est dans le passé.
- Saisie incomplète ou incohérente (champ manquant, moins d'une place, participation négative) : hypothèse, refusée comme une saisie invalide, sans règle métier propre ni scénario.
- Heure de Dakar : hypothèse, heure de l'Afrique de l'Ouest (UTC+0), sans changement d'heure.
