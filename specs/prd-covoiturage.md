# PRD — Covoiturage JOJ

**Statut** : Validé

## Problème

Pendant les JOJ Dakar 2026, un supporter doit rejoindre un site (Dakar, Diamniadio, Saly) à une heure précise, alors que les navettes sont pleines et les taxis chers. Des conducteurs partent vers le même site avec des places vides. Ils se cherchent aujourd'hui sur des groupes WhatsApp où les annonces se perdent dans le flot des messages.

## Utilisateurs

- Supporter sans véhicule : trouver un départ vers son site, à l'heure de son épreuve, et y réserver une place.
- Conducteur qui se rend sur un site : proposer ses places vides sans devoir relancer son annonce dans plusieurs groupes.

## Proposition

Une application web mobile gratuite, ouverte par un lien partagé sur WhatsApp, sans installation : elle part de l'outil que conducteurs et supporters utilisent déjà. Le conducteur y publie son trajet, le supporter y trouve les départs à venir vers son site. Contrairement à un groupe de discussion, chaque trajet reste visible, classé par site et par heure, avec ses places restantes. Aucun paiement ne passe par l'application : le conducteur indique une participation aux frais par place, réglée à la descente en espèces ou par Wave, directement entre eux. Le conducteur peut aussi coller son annonce telle qu'il l'écrit sur WhatsApp : Claude en extrait le trajet, pour ne pas lui imposer de formulaire. Les écrans parlent français et portent l'identité officielle des JOJ Dakar 2026 (logo, mascotte, couleurs orange, jaune, vert, rouge, noir et blanc), utilisée avec l'accord des formateurs du bootcamp ; une mention en pied de page rappelle « Projet réalisé dans le cadre du bootcamp MTN × Artefact × Anthropic ».

## Mesure du succès

Pendant la démo : je publie un trajet Pikine → Diamniadio et il apparaît dans la liste des départs vers Diamniadio ; un trajet dont le départ est dans le passé est refusé. Sur un téléphone, depuis l'accueil, un supporter réserve une place sur ce trajet et voit la mascotte à la flamme sauter de joie avec son code de réservation.

## Tranches

### TR1 — Publier un trajet et lister les départs vers un site

Le conducteur publie un trajet : lieu de départ, site, heure de départ, nombre de places, participation aux frais par place (affichée telle quelle, sans règle propre) et son téléphone. La publication lui renvoie un code de gestion du trajet. Le supporter consulte les trajets à venir vers un site. Règles : un site qui n'est pas l'un des trois sites des JOJ est refusé ; un départ dans le passé est refusé.

### TR2 — Réserver une place

Le supporter réserve une place en donnant son nom et son téléphone. Il reçoit un code de réservation et voit le téléphone du conducteur pour fixer le point de rendez-vous. Règles : un trajet complet est refusé ; un même supporter ne réserve pas deux fois le même trajet ; un trajet déjà parti ne peut pas être réservé.

### TR3 — Annuler

Le supporter annule sa réservation avec son code, et la place redevient disponible. Le conducteur annule son trajet avec son code de gestion : il disparaît de la liste, et ses passagers voient « trajet annulé » en consultant leur réservation.

### TR4 — Publier un trajet depuis un message libre

Le conducteur colle un message libre (« je pars de Pikine pour Diamniadio demain 8h, 3 places ») ; Claude en extrait le trajet. L'application revalide les règles de TR1 avant de publier : ce que Claude propose n'est jamais publié sans contrôle.

### TR5 — Accueil, chercher et réserver depuis son téléphone

Un accueil qui donne envie : la mascotte prend du relief, s'incline sous le doigt ou la souris, son ombre et les plans du décor bougent en profondeur, elle respire et arrive avec un rebond ; les départs du site choisi sont visibles sans faire défiler sur un écran de téléphone, et l'animation s'arrête si l'utilisateur a demandé moins d'animations ; si le temps manque, le relief de la mascotte passe après le parcours chercher puis réserver. Depuis l'accueil, le supporter choisit un site, voit les départs à venir avec leurs places restantes et leur participation, réserve avec son nom et son téléphone, puis voit son code de réservation et le téléphone du conducteur ; la mascotte à la flamme apparaît alors avec un saut de joie. Chaque refus (trajet complet, déjà réservé, déjà parti…) s'affiche en français compréhensible. Aucune nouvelle règle métier : les écrans s'appuient sur TR1 et TR2.

### TR6 — Publier un trajet et gérer ses codes depuis son téléphone

Le conducteur colle son annonce WhatsApp dans un champ dédié (TR4), ou passe à tout moment à un formulaire classique ; l'application l'y amène aussi d'elle-même si l'annonce est incomplète (les informations manquantes sont signalées) ou si l'assistant est indisponible. Il voit le trajet tel qu'il a été compris, puis son code de gestion, présenté comme à conserver. Avec leurs codes, le supporter consulte ou annule sa réservation et le conducteur annule son trajet (TR3). Chaque refus (code inconnu, déjà annulé…) s'affiche en français compréhensible. Aucune nouvelle règle métier.

## Hors périmètre

- Paiement dans l'application (la participation se règle directement entre conducteur et supporter), notifications SMS ou push, suivi en temps réel, notation des conducteurs, messagerie.

## Hypothèses et risques

- Hypothèses : les sites se limitent à Dakar, Diamniadio et Saly (sinon la liste devra s'élargir) ; le supporter est reconnu par son téléphone pour empêcher la double réservation ; l'accord des formateurs couvre l'usage du logo et de la mascotte pour ce projet de bootcamp seulement, une diffusion publique demanderait l'accord du comité d'organisation.
- Risque : sans notification, un passager ne voit l'annulation de son trajet que s'il consulte sa réservation.
- Risque : si Claude interprète mal une heure (« demain », « 8h »), le trajet publié serait faux ; la revalidation de TR4 ne détecte qu'un départ passé ou un site inconnu.
