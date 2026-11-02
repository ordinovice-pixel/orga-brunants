# Outil de gestion « Les Brunants » — Lot 5 : Tableau de bord, Calendrier et rubriques du POC

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 5 s'installe **par-dessus le lot 4c**. Il contient aussi les **choix du lot 4 tranchés le 19/10**.

## Mise à jour (environ 15 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_Lot5.html` et remplacer les **13 fichiers modifiés** : `Donnees.gs`, `DonneesFictives.gs`, `Automatisations.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_TableauDeBord.html`, `Js_Budget.html`, `Js_Activites.html`, `Js_Calendrier.html`, `Js_Procedures.html`, `Js_AG.html`, `Js_NAS.html`.
3. 💾 **Enregistrer le projet**, puis exécuter **setup** (sur `Code.gs`, pas `doGet`). Le journal annonce deux colonnes ajoutées :
   - « Dates des échéances… » dans l'onglet `Activites` ;
   - « ID recette de remboursement » dans l'onglet `Echeances`.

   Aucune nouvelle autorisation n'est demandée.
4. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**. Ne pas utiliser « Nouveau déploiement ».
5. `F5` : le bas de la barre latérale affiche « Lot 5 ».
6. *Conseillé* : **Administration → Réinitialiser les données d'entraînement**. Le remboursement fictif devient une recette négative (nouvelle règle), et l'activité « Repas de fin d'année 2026 » reçoit des dates d'échéances personnalisées pour l'exemple. Sans réinitialisation, tout fonctionne : l'ancien remboursement reste une dépense.

## Ce que fait le lot 5

### Tableau de bord (année choisie)

- **Indicateurs** :
  - effectif total, dont les nouveaux arrivants de l'année ;
  - titulaires / sympathisants, en nombre et en % ;
  - **solde budget**, le même que dans Budget & Compta ;
  - activités réalisées / prévues, avec le nombre de restantes ;
  - **alertes actives**, dont les urgentes.
- **Graphiques**, chiffres et % écrits dessus, sans survol : Recettes vs Dépenses mois par mois, répartition des dépenses par catégorie, répartition des activités par catégorie.
- **Alertes calculées** à partir des données, au jour d'aujourd'hui. Chaque alerte a un bouton qui mène au bon endroit :
  - échéances de paiement en retard, avec le total et les activités concernées ; urgentes au-delà de 30 jours ;
  - activités à venir presque complètes (3 places ou moins) ;
  - catégories qui dépassent leur budget ;
  - cotisations supérieures à l'attendu, avec la liste ;
  - lignes du classeur à corriger ;
  - sauvegarde absente ou de plus de 40 jours.
- **Listes** :
  - **prochaines activités**, en chronologie ; un clic ouvre l'activité ;
  - **Participation Association cumulée par membre** : taper un nom donne le total de l'année et le détail.

Le taux de recouvrement, les cotisations impayées, l'équipement club et les anniversaires ne figurent plus, comme demandé.

### Calendrier

- Il est **alimenté automatiquement** par les activités de l'année choisie, sur toute leur durée.
- Une couleur par catégorie, avec une légende.
- Les **dates d'échéances fixées dans les fiches** apparaissent en gris ardoise, préfixées par « € ».
- Navigation ◀ ▶ dans l'année, et bouton « Aujourd'hui ».
- La liste des activités du mois figure sous le calendrier.
- Un clic sur un événement ouvre l'activité.
- **Saisie** : un événement est une activité. « + Nouvelle activité à cette date » ouvre la fiche activité à la date choisie.
- Les encarts du POC « Notifications automatiques (phase 2) » et « Droits sur le calendrier » sont repris à titre d'information.

### Procédures, Assemblée Générale, Classement NAS

Le contenu du POC est repris **tel quel**, rangé dans les 3 zones colorées. Les boutons sont visibles mais inactifs (« Prévu dans une version ultérieure »). Les chiffres sont ceux du POC et un bandeau le signale.

## Choix du lot 4 appliqués (vos réponses du 19/10)

| N° | Décision | Ce qui change |
|---|---|---|
| 1 | **Remboursement déduit des recettes** | « ↩ Rembourser » crée une **recette négative** (origine « Remboursement »), au lieu d'une dépense. La recette du paiement reste visible et le net des deux vaut 0. Le budget consommé n'est plus touché. L'encaissé de l'activité ne compte plus l'échéance remboursée |
| 3 | Date de saisie par défaut | Le formulaire mobil-home a un champ **« Date de paiement (dépense et recette) »**, prérempli avec le jour de la saisie et modifiable |
| 4 | **Échéances personnalisables**, y compris après l'activité | La fiche activité a **une case date par échéance**. Une case vide garde le calcul automatique. Les inscriptions suivantes prennent ces dates. En modification, la case **« Appliquer aussi ces dates aux échéances non payées des inscrits actuels »** recale les inscrits. Dans le suivi des paiements, un clic sur « prévue jj/mm ✎ » change la date d'**une** échéance |
| 2, 5, 7 | Confirmés | Aucun changement |
| 6 | Listes de diffusion Gmail | Un **rappel automatique** est programmé chaque lundi matin de novembre à mars. Il s'arrête quand vous le supprimez dans vos tâches planifiées |

## Tests à faire dans Google (après la réinitialisation conseillée)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Tableau de bord, 2026 | Effectif **224**, dont 13 nouveaux arrivants. **188 / 36** (84 % titulaires). Solde budget **6 397 €**, le même que dans Budget & Compta. Activités réalisées / prévues : **6 / 8** au 19/10 |
| 2 | Graphiques du tableau de bord | Chiffres et % écrits sur les trois graphiques. Activités : Grands Événements 3 (38 %), Sorties / Visites 2 (25 %)… |
| 3 | Alertes | Échéances en retard (avec total et activités), « Villégiatures — dépassement budgétaire de 1 % », 32 cotisations supérieures à l'attendu (470 €). « Afficher la liste » déplie le tableau. « Voir » sur les retards ouvre Activités filtré sur « en retard » |
| 4 | Participation par membre : taper un nom | Total de l'année et détail par activité ou location |
| 5 | Passer à 2025 | Effectif 217 (12 nouveaux), solde 604 €, 7 / 7 activités. La liste devient « Activités de 2025 » |
| 6 | Calendrier, 2026 | Il s'ouvre sur le mois en cours. En novembre : la visite du zoo le 7, et « € Échéance 2 — Repas… » le 15. Un clic ouvre l'activité |
| 7 | « + Nouvelle activité à cette date » avec le 19/12/2026 | La fiche activité s'ouvre avec la date de début au 19/12/2026 |
| 8 | Fiche activité en 3 échéances, dates 05/11/2026, 05/12/2026 et 05/02/2027 (après l'activité), puis inscrire un membre | 3 cases date. Les échéances du membre sont aux dates saisies |
| 9 | Suivi : cliquer sur « prévue 05/02 ✎ » et mettre 20/03/2027 | Message « Échéance 3 (…) : date prévue le 20/03/2027 ». Une échéance payée n'est pas modifiable |
| 10 | Modifier la fiche : 1re date au 10/11/2026, cocher « Appliquer… » | Le message indique combien d'échéances non payées ont été recalées. Les échéances déjà payées ne bougent pas. Une date changée à la main (test 9) revient à celle de la fiche |
| 11 | Payer une échéance puis ↩ Rembourser | Budget & Compta : une recette **négative** « Remboursement » ; aucune nouvelle dépense |
| 12 | Mobil-home : nouvelle location avec la date de paiement au 01/10/2026 | La dépense au camping et la recette « part adhérent » sont datées du 01/10/2026 |
| 13 | Procédures, AG, Classement NAS | Contenu du POC dans les 3 zones. Les boutons sont grisés |

## Tests déjà passés ici

- **Serveur** :
  - 18 vérifications pour le lot 5 : remboursement en recette négative, dates d'échéances (fiche, application aux inscrits, modification d'une échéance, date unique transformée par Sheets), date des lignes mobil-home, **mise à jour d'un classeur du lot 4c** ;
  - les tests des lots 1 à 4 et du test d'import repassent (64, 35, 41, 68 et 19 vérifications).
- **Navigateur, avec Chart.js** :
  - 52 vérifications pour le lot 5. Les indicateurs, les 3 graphiques, les alertes et la chronologie du tableau de bord ont été **recalculés indépendamment** pour 2026 et 2025. Les événements des **12 mois** du calendrier ont été recalculés, puis tous les parcours (navigation, dates d'échéances, mobil-home, rubriques du POC, téléphone) ont été déroulés ;
  - les tests des lots 1 à 4 repassent (50, 49, 46 et 83 vérifications).

## Points à valider

1. **Alertes** : les seuils sont « 3 places ou moins », « retard de plus de 30 jours = urgent » et « sauvegarde de plus de 40 jours ». Faut-il en changer ?
2. **Calendrier** : seules les dates d'échéances **saisies dans la fiche activité** y apparaissent. Les dates calculées automatiquement varient d'un inscrit à l'autre et encombreraient le calendrier.
3. **Participation par membre** sur le tableau de bord : elle est visible par tout utilisateur de l'outil, c'est-à-dire par le bureau seul tant que le partage n'est pas élargi.
