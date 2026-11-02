# Cas client — Un outil de gestion sur mesure pour une association, à 0 € par mois

*Présentation anonymisée, réutilisable telle quelle (site, plaquette, LinkedIn). Elle ne contient ni le nom de l'association, ni celui de ses membres, ni aucune donnée réelle.*

---

## Le client

Une association de loisirs d'environ **230 adhérents** en Île-de-France. Elle organise des sorties, des séjours, des repas, des ateliers et des locations de mobil-home subventionnées. Elle est gérée par un bureau de trois bénévoles.

## Le problème

- Un fichier Excel des adhérents tenu par une seule personne, avec des codes couleur que lui seul savait lire.
- Des tableaux comptables séparés : chaque paiement d'activité était saisi deux fois.
- Un calendrier tenu à la main, aucune vue d'ensemble pour le président.
- Le risque de tout perdre le jour où la personne qui « sait » s'en va.

## La solution

Une **application web sur mesure**, hébergée sur le compte Google gratuit de l'association :

- **10 rubriques** : tableau de bord, adhérents, budget et comptabilité, activités, prestataires, calendrier, administration…
- **Une seule saisie** : cocher « Payé » sur une échéance crée la recette en comptabilité ; une location de mobil-home crée la dépense et la recette, avec l'aide de l'association calculée et plafonnée.
- **Des paiements échelonnés** jusqu'à 12 fois, des remboursements, des fiches d'inscription générées en PDF, des notifications par e-mail.
- **Un tableau de bord** avec des graphiques chiffrés et des **alertes calculées** : paiements en retard, budgets dépassés, activités presque complètes, sauvegarde trop ancienne.
- **Un assistant d'import** : 398 fiches reprises de l'ancien fichier Excel, contrôlées ligne par ligne, testées dans une copie avant l'import réel. Résultat : 398 lignes valides sur 398.
- **Des sauvegardes automatiques** mensuelles, avec vérification et restauration en quelques clics.
- **Un mode entraînement** : tous les e-mails sont redirigés vers une adresse de test, pour apprendre sans risque.

## Les résultats

| | Avant | Après |
|---|---|---|
| Saisie d'un paiement | 2 fois (activité + comptabilité) | 1 fois |
| Coût du logiciel | — | **0 € par mois**, aucun serveur |
| Vue d'ensemble | Sur demande | Tableau de bord en temps réel |
| Dépendance à une personne | Totale | Guide illustré, documentation, données dans un tableur partagé |
| Sauvegardes | Aucune organisée | Mensuelles et automatiques, 24 conservées |

## La technique, en bref

- **Google Apps Script + Google Sheets** : pas d'hébergement, pas d'abonnement, des données lisibles et exportables en Excel.
- **HTML, CSS et JavaScript sans framework**, **Chart.js** pour les graphiques, **SheetJS** pour lire les fichiers Excel.
- **Plus de 700 tests automatiques** rejoués à chaque version, grâce à un simulateur des services Google et à des tests dans un vrai navigateur (Playwright).
- **Un guide d'utilisation illustré** de 16 tutos et 68 captures, en un seul fichier HTML qui fonctionne hors ligne et sur téléphone.

## La méthode : l'IA au service d'un projet associatif

Le projet a été mené par **OrdiNovice** avec un assistant IA (Claude, d'Anthropic) :

1. **Un prototype** revu avec le président, pour fixer l'interface et le vocabulaire de l'association.
2. **Un cahier des charges précis**, avec des critères d'acceptation.
3. **Des livraisons par lots**, chacune avec ses tests automatiques, un assistant de mise à jour en un clic par fichier et une liste de tests à faire sur le terrain.
4. **La validation humaine à chaque étape** : rien n'avance sans l'accord du chef de projet.
5. **Une mémoire du projet** (décisions numérotées, état d'avancement, procédures) qui rend l'outil transmissible.

**En deux semaines**, l'association est passée d'un fichier Excel à un outil complet, testé et documenté. L'IA a apporté la vitesse et la rigueur des tests ; le chef de projet, la connaissance du terrain et les arbitrages.

---

*OrdiNovice — accompagnement numérique et IA pour les associations et les petites entreprises · [iaplussimple.com](https://iaplussimple.com)*
