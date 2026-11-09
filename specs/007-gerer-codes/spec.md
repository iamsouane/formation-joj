# 007 — Gérer ses codes depuis son téléphone

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR7

## Contexte

Supporter et conducteur reçoivent déjà un code à conserver, mais ne peuvent s'en servir qu'en appelant l'API : aucun écran ne permet de retrouver une réservation, de l'annuler, ni d'annuler un trajet. Cette tranche leur donne ces écrans, sur leur téléphone et en français, et permet au supporter d'envoyer son billet sur WhatsApp pour ne pas perdre son code. Aucune règle métier nouvelle : les refus sont ceux de TR3, rendus compréhensibles.

## User stories

- En tant que supporter qui a réservé, je veux retrouver ma réservation avec mon code et l'annuler si j'ai un empêchement, afin de savoir si mon trajet tient toujours et de libérer ma place.
- En tant que supporter, je veux envoyer mon billet sur WhatsApp, afin de garder mon code et le téléphone du conducteur sous la main.
- En tant que conducteur, je veux ouvrir mon lien de gestion, y reconnaître mon trajet et l'annuler avec mon code, afin qu'on ne le réserve plus.

## Scénarios d'acceptation

### AS1 — Retrouver sa réservation avec son code

- **Étant donné** Awa a réservé une place sur le trajet à venir Pikine → Diamniadio, demain à 8 h, 1 000 F par place
- **Quand** elle choisit « Retrouver ma réservation », visible sur l'accueil, et saisit son code de réservation
- **Alors** elle voit son billet : Pikine → Diamniadio, demain à 8 h, 1 000 F par place, son code, le téléphone du conducteur, et la mention « Réservation active »

### AS2 — Voir une réservation annulée ou un trajet annulé

- **Étant donné** une réservation qu'Awa a annulée, ou dont le conducteur a annulé le trajet
- **Quand** elle la consulte avec son code
- **Alors** elle lit « Réservation annulée » dans le premier cas, « Trajet annulé par le conducteur » dans le second, et l'annulation ne lui est plus proposée

### AS3 — Annuler sa réservation

- **Étant donné** Awa consulte sa réservation active sur un trajet à venir vers Diamniadio, qui affiche 2 places restantes sur 3
- **Quand** elle choisit d'annuler sa réservation, puis confirme
- **Alors** son billet affiche « Réservation annulée », et le trajet affiche 3 places restantes dans les départs vers Diamniadio

### AS4 — Envoyer son billet sur WhatsApp

- **Étant donné** Awa regarde son billet, juste après avoir réservé ou en consultant sa réservation active
- **Quand** elle choisit de l'envoyer sur WhatsApp
- **Alors** WhatsApp s'ouvre avec un message prérempli contenant le trajet (Pikine vers Diamniadio, le jour et l'heure, la participation), son code de réservation et le téléphone du conducteur

### AS5 — Voir son trajet en ouvrant son lien de gestion

- **Étant donné** un conducteur qui a publié le trajet à venir Pikine → Diamniadio, demain à 8 h, 3 places dont une réservée, 1 000 F par place
- **Quand** il ouvre son lien de gestion
- **Alors** il voit Pikine → Diamniadio, demain à 8 h, 2 places restantes, 1 000 F par place, sans téléphone ni code de gestion, puis son code lui est demandé ; si ce trajet est annulé, il lit « Ce trajet est déjà annulé » et le code ne lui est pas demandé

### AS6 — Annuler son trajet avec son code de gestion

- **Étant donné** un conducteur sur la page de son lien de gestion, pour un trajet à venir vers Diamniadio
- **Quand** il saisit son code de gestion, choisit d'annuler son trajet, puis confirme
- **Alors** il lit « Votre trajet est annulé », et ce trajet n'apparaît plus dans les départs vers Diamniadio

### AS7 — Expliquer chaque refus en français

- **Étant donné** un supporter qui saisit son code de réservation, ou un conducteur qui ouvre son lien de gestion ou annule son trajet
- **Quand** la demande est refusée
- **Alors** il lit, selon le code : BOOKING_NOT_FOUND « Aucune réservation ne correspond à ce code. Vérifiez-le. » ; MANAGEMENT_CODE_INVALID « Ce code de gestion n'est pas le bon. » ; TRIP_NOT_FOUND (404, dès l'ouverture d'un lien qui ne désigne aucun trajet) « Ce trajet est introuvable. Vérifiez votre lien de gestion. » ; VALIDATION_FAILED « Saisissez votre code. » ; tout autre refus « Une erreur est survenue, réessayez » ; et rien n'est annulé

## Hors périmètre

- Retrouver un code perdu, par son téléphone ou autrement (risque assumé du PRD).
- Modifier une réservation ou un trajet, ou revenir sur une annulation.
- Prévenir les passagers d'un trajet annulé : ils le voient en consultant leur réservation (TR3).

## Questions ouvertes

- Trajet relu par son lien de gestion : tranché, on n'y lit que ce que la liste des départs montre déjà (lieu, site, heure, places restantes, participation) et s'il est annulé ; jamais le téléphone ni le code.
- Confirmation avant d'annuler : validé, une annulation est définitive, donc demandée en deux temps (choisir, puis confirmer), pour la réservation comme pour le trajet.
- Billet envoyé sur WhatsApp : validé, proposé sur le billet affiché après la réservation (TR5) et sur la réservation consultée tant qu'elle est active ; le message ne contient pas de lien.
