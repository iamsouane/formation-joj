# 005 — Accueil, chercher et réserver depuis son téléphone

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR5

## Contexte

Le supporter peut déjà trouver un départ et réserver, mais seulement en appelant l'API : il n'a aucun écran. Cette tranche lui donne, sur son téléphone et en français, un accueil aux couleurs des JOJ Dakar 2026 d'où il choisit son site, voit les départs à venir et réserve sa place. Aucune règle métier nouvelle : les refus sont ceux de TR1 et TR2, rendus compréhensibles.

## User stories

- En tant que supporter sans véhicule, je veux choisir mon site et voir d'un coup d'œil les départs à venir, afin de trouver vite une place à l'heure de mon épreuve.
- En tant que supporter, je veux réserver avec mon nom et mon téléphone puis voir mon code et le téléphone du conducteur, afin de convenir du rendez-vous.
- En tant que supporter, je veux comprendre en français pourquoi une réservation est refusée, afin de choisir un autre départ.

## Scénarios d'acceptation

### AS1 — Voir les départs à venir d'un site

- **Étant donné** deux trajets à venir vers Diamniadio, Pikine à 10 h et Rufisque à 8 h
- **Quand** le supporter choisit Diamniadio sur l'accueil
- **Alors** il voit Rufisque 8 h puis Pikine 10 h, chacun avec son lieu de départ, son heure, ses places restantes et sa participation

### AS2 — Aucun départ

- **Étant donné** aucun trajet à venir vers Saly
- **Quand** le supporter choisit Saly
- **Alors** un message lui indique qu'il n'y a aucun départ à venir vers Saly

### AS3 — Un trajet complet ne se réserve pas

- **Étant donné** un trajet à venir vers Diamniadio dont toutes les places sont réservées
- **Quand** le supporter consulte les départs vers Diamniadio
- **Alors** ce trajet est marqué « Complet » et ne propose pas de réserver

### AS4 — Réserver une place

- **Étant donné** un trajet à venir Pikine → Diamniadio avec des places restantes
- **Quand** Awa le choisit et réserve avec son nom et le téléphone 77 123 45 67
- **Alors** elle voit son code de réservation, présenté comme à conserver, le téléphone du conducteur, et la mascotte à la flamme qui saute de joie

### AS5 — Expliquer chaque refus en français

- **Étant donné** un trajet à venir que le supporter tente de réserver
- **Quand** la réservation est refusée
- **Alors** il lit, selon le code du refus : TRIP_FULL « Ce trajet est complet » ; PASSENGER_ALREADY_BOOKED « Vous avez déjà réservé ce trajet » ; TRIP_DEPARTED « Ce trajet est déjà parti » ; TRIP_CANCELLED « Ce trajet a été annulé » ; VALIDATION_FAILED « Vérifiez votre nom et votre téléphone »

### AS6 — Une mascotte vivante, ou immobile sur demande

- **Étant donné** l'accueil ouvert sur un téléphone ou un ordinateur
- **Quand** l'utilisateur déplace son doigt ou sa souris sur la mascotte
- **Alors** elle s'incline vers lui et son ombre et les plans du décor se décalent en profondeur ; si l'utilisateur a demandé moins d'animations, elle reste immobile, sans rebond ni respiration ni saut de joie

### AS7 — Les départs visibles sans défiler

- **Étant donné** un écran de téléphone de 360 × 640 et au moins un départ vers le site choisi
- **Quand** le supporter choisit ce site
- **Alors** le premier départ est entièrement visible sans faire défiler

## Hors périmètre

- Publier un trajet, consulter ou annuler une réservation ou un trajet (TR6).
- Toute nouvelle règle métier ou nouvelle demande au serveur : l'écran s'appuie sur TR1 et TR2.
- Retrouver son code plus tard sans l'avoir noté.

## Questions ouvertes

- Autre refus (trajet introuvable, serveur injoignable) : hypothèse, un message générique « Une erreur est survenue, réessayez ».
- Taille d'écran de référence : hypothèse, 360 × 640, le téléphone d'entrée de gamme courant au Sénégal.
