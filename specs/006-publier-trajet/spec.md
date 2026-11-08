# 006 — Publier un trajet depuis son téléphone

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR6

## Contexte

Le conducteur peut déjà publier un trajet, depuis un formulaire (TR1) ou son annonce WhatsApp (TR4), mais seulement en appelant l'API : il n'a aucun écran. Cette tranche lui donne, sur son téléphone et en français, de quoi coller son annonce ou remplir un formulaire, puis garder son code et son lien de gestion. Aucune règle métier nouvelle : les refus sont ceux de TR1 et TR4, rendus compréhensibles.

## User stories

- En tant que conducteur qui se rend sur un site, je veux coller mon annonce WhatsApp telle quelle, ou remplir un formulaire si je préfère, afin de publier mon trajet en quelques secondes.
- En tant que conducteur, je veux voir le trajet tel qu'il a été compris, puis mon code et mon lien de gestion, afin de vérifier ma publication et de pouvoir l'annuler plus tard.
- En tant que conducteur, je veux comprendre en français pourquoi ma publication est refusée, afin de la corriger.

## Scénarios d'acceptation

### AS1 — Publier depuis son annonce

- **Étant donné** nous sommes le 8 novembre 2026 à 15 h, et un conducteur colle « je pars de Pikine pour Diamniadio demain 8h, 3 places, 1000 F » avec le téléphone 77 123 45 67
- **Quand** il publie son annonce
- **Alors** il voit le trajet tel qu'il a été compris (Pikine → Diamniadio, 9 novembre à 8 h, 3 places, 1 000 F par place), puis son code et son lien de gestion

### AS2 — Passer au formulaire à tout moment

- **Étant donné** un conducteur sur le champ de l'annonce, qui a commencé à saisir son téléphone
- **Quand** il choisit de remplir le formulaire, puis publie Pikine → Diamniadio, demain 8 h, 3 places, 1 000 F
- **Alors** son téléphone est conservé, et il voit le trajet publié, son code et son lien de gestion, comme en AS1

### AS3 — Une annonce incomplète mène au formulaire

- **Étant donné** un conducteur qui colle « je vais à Diamniadio, qui vient ? »
- **Quand** il publie son annonce
- **Alors** il arrive sur le formulaire, son annonce toujours affichée au-dessus pour qu'il la relise, et le lieu de départ, l'heure, les places et la participation y sont signalés comme manquants

### AS4 — Un assistant indisponible mène au formulaire

- **Étant donné** l'assistant qui lit les annonces est indisponible
- **Quand** le conducteur publie son annonce
- **Alors** il arrive sur le formulaire avec le message « L'assistant ne répond pas. Remplissez le formulaire, c'est rapide. », et rien n'est publié

### AS5 — Un code et un lien à conserver

- **Étant donné** un trajet que le conducteur vient de publier
- **Quand** il regarde la confirmation
- **Alors** son code et son lien de gestion sont présentés comme à conserver, le lien désigne ce trajet, et le code n'apparaît pas dans le lien

### AS6 — Envoyer son code et son lien sur WhatsApp

- **Étant donné** un trajet que le conducteur vient de publier
- **Quand** il choisit de l'envoyer sur WhatsApp
- **Alors** WhatsApp s'ouvre avec un message prérempli contenant le trajet, son code de gestion avec la mention « Code à garder pour vous, ne le partagez pas », et son lien de gestion

### AS7 — Expliquer chaque refus en français

- **Étant donné** un conducteur dont la publication, par l'annonce ou le formulaire, est refusée
- **Quand** il lit le refus
- **Alors** il lit, selon le code : SITE_UNKNOWN « Choisissez Dakar, Diamniadio ou Saly. » ; DEPARTURE_IN_PAST « Cette heure est déjà passée. Indiquez un départ à venir. » ; MESSAGE_EMPTY « Collez votre annonce avant de publier. » ; VALIDATION_FAILED « Vérifiez les champs signalés. »

## Hors périmètre

- Ouvrir le lien de gestion et annuler son trajet avec son code (TR7).
- Corriger le trajet compris avant sa publication : il est montré une fois publié, comme en TR4.
- Toute nouvelle règle métier ou nouvelle demande au serveur.

## Questions ouvertes

- Formulaire après une annonce incomplète : hypothèse, il n'est pas prérempli avec ce que l'assistant a compris (le refus ne le renvoie pas), seul le téléphone saisi est conservé.
- Autre refus (serveur injoignable) : hypothèse, « Une erreur est survenue, réessayez », comme en TR5.
