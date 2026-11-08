# PRD — Covoiturage JOJ

**Statut** : Validé

## Problème

Pendant les JOJ Dakar 2026, un supporter doit rejoindre un site (Dakar, Diamniadio, Saly) à une heure précise, alors que les navettes sont pleines et les taxis chers. Des conducteurs partent vers le même site avec des places vides. Ils se cherchent aujourd'hui sur des groupes WhatsApp où les annonces se perdent dans le flot des messages.

## Utilisateurs

- Supporter sans véhicule : trouver un départ vers son site, à l'heure de son épreuve, et y réserver une place.
- Conducteur qui se rend sur un site : proposer ses places vides sans devoir relancer son annonce dans plusieurs groupes.

## Proposition

Une application web mobile gratuite, ouverte par un lien partagé sur WhatsApp, sans installation : elle part de l'outil que conducteurs et supporters utilisent déjà. Le conducteur y publie son trajet, le supporter y trouve les départs à venir vers son site. Contrairement à un groupe de discussion, chaque trajet reste visible, classé par site et par heure, avec ses places restantes. Aucun paiement ne passe par l'application : le conducteur indique une participation aux frais par place, réglée à la descente en espèces ou par Wave, directement entre eux. Plus tard, le conducteur pourra coller son annonce telle qu'il l'écrit sur WhatsApp : Claude en extrait le trajet, pour ne pas lui imposer de formulaire.

## Mesure du succès

Pendant la démo : je publie un trajet Pikine → Diamniadio et il apparaît dans la liste des départs vers Diamniadio ; un trajet dont le départ est dans le passé est refusé.

## Tranches

### TR1 — Publier un trajet et lister les départs vers un site

Le conducteur publie un trajet : lieu de départ, site, heure de départ, nombre de places, participation aux frais par place (affichée telle quelle, sans règle propre) et son téléphone. La publication lui renvoie un code de gestion du trajet. Le supporter consulte les trajets à venir vers un site. Règles : un site qui n'est pas l'un des trois sites des JOJ est refusé ; un départ dans le passé est refusé.

### TR2 — Réserver une place

Le supporter réserve une place en donnant son nom et son téléphone. Il reçoit un code de réservation et voit le téléphone du conducteur pour fixer le point de rendez-vous. Règles : un trajet complet est refusé ; un même supporter ne réserve pas deux fois le même trajet ; un trajet déjà parti ne peut pas être réservé.

### TR3 — Annuler

Le supporter annule sa réservation avec son code, et la place redevient disponible. Le conducteur annule son trajet avec son code de gestion : il disparaît de la liste, et ses passagers voient « trajet annulé » en consultant leur réservation.

### TR4 — Publier un trajet depuis un message libre

Le conducteur colle un message libre (« je pars de Pikine pour Diamniadio demain 8h, 3 places ») ; Claude en extrait le trajet. L'application revalide les règles de TR1 avant de publier : ce que Claude propose n'est jamais publié sans contrôle.

## Hors périmètre

- Paiement dans l'application : la participation se règle directement entre conducteur et supporter.
- Notifications SMS ou push ; suivi en temps réel, notation des conducteurs, messagerie.

## Hypothèses et risques

- Hypothèse : les sites se limitent à Dakar, Diamniadio et Saly ; si d'autres lieux d'épreuve existent, la liste devra s'élargir.
- Hypothèse : le supporter est reconnu par son téléphone pour empêcher la double réservation.
- Risque : sans notification, un passager ne voit l'annulation de son trajet que s'il consulte sa réservation.
- Risque : si Claude interprète mal une heure (« demain », « 8h »), le trajet publié serait faux ; la revalidation de TR4 ne détecte qu'un départ passé ou un site inconnu.
