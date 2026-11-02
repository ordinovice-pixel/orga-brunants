# Outil de gestion « Les Brunants » — Lot 3 : Budget & Compta et Prestataires

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

## Mise à jour (environ 10 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_Lot3.html`. Remplacer le contenu des **9 fichiers modifiés** : `Code.gs`, `Donnees.gs`, `DonneesFictives.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_Adherents.html`, `Js_Budget.html`, `Js_Prestataires.html`.
3. Cliquer sur 💾 **Enregistrer le projet**. Il ne doit plus rester aucun point orange.
4. Exécuter `setup` :
   - cliquer sur `Code.gs` ;
   - dans la liste à côté de « Débogage », choisir **setup**, et non `doGet` ;
   - cliquer sur **▷ Exécuter**.
5. Le journal doit afficher les lignes suivantes :
   - « Budgets : montants fictifs du lot 1 remplacés… » ;
   - « Prestataires : 12 ligne(s) » ;
   - « Recettes : 46 ligne(s) » ;
   - « Depenses : 109 ligne(s) ».
6. Publier la nouvelle version :
   - **Déployer → Gérer les déploiements** ;
   - sélectionner le déploiement actif, puis cliquer sur ✏️ ;
   - choisir **Nouvelle version**, puis **Déployer**.

   Ne pas utiliser « Nouveau déploiement ».
7. Recharger l'outil (`F5`). Le bas de la barre latérale doit afficher « Lot 3 — budget et prestataires ».

## Ce que fait le lot 3

### Budget & Compta

**Indicateurs (année choisie)**

- Recettes et dépenses de l'année, avec l'évolution par rapport à l'année précédente.
- **Solde budget** = budget prévisionnel total − budget consommé, en € et en % restant.
- Part des **dépenses hors budget**.
- Graphique **Recettes vs Dépenses** mois par mois, pour la seule année choisie.
- **Répartition des dépenses par catégorie**, avec le détail en infobulle.
- Tableau de suivi des **8 catégories** : budget, dépenses réalisées, reste, % consommé et barre de progression. La barre est verte sous 80 %, orange de 80 à 100 %, rouge au-delà.

**Saisie**

- Formulaires **Dépense** et **Recette** côte à côte, comme dans le POC.
- Les sous-catégories proposées dépendent de la catégorie et du sens (recette ou dépense).
- La dépense propose le prestataire (avec « Autre ») et l'activité liée. La recette propose l'activité liée et l'adhérent concerné, que l'on trouve en tapant son nom.
- Chaque formulaire a un choix **Budgété / Hors budget**.
- Formulaire **Budgets prévisionnels** de l'année choisie, avec le rappel du budget et des dépenses de l'année précédente, et un bouton « Reprendre les budgets N-1 ».

**Listes**

- Dépenses et recettes de l'année, avec des filtres par **catégorie, activité, origine (manuelle ou automatique), budgété / hors budget** et prestataire.
- Les dépenses liées aux activités y figurent et se filtrent par activité.
- L'encart **Cotisations supérieures à l'attendu** du POC est repris.

**Une seule saisie**

Une recette ou une dépense **automatique** (créée par un paiement ou un remboursement au lot 4) ne peut être ni modifiée ni supprimée ici. L'outil explique qu'elle se gère depuis la rubrique Activités.

### Prestataires

- **Indicateurs** :
  - nombre de prestataires ;
  - factures de l'année ;
  - prestataires sollicités ;
  - ancienneté moyenne de la relation ;
  - tableau **cumul des factures en € et % du total**, tous prestataires confondus ;
  - graphique des **10 principaux** prestataires.
- **Fiche prestataire** : tous les champs du §4. L'ancienneté est calculée en direct et le SIRET est contrôlé (14 chiffres). L'entrée **« Autre » (PRE-000) est permanente**.
- **Liste filtrable**. Un clic sur le nom d'un prestataire affiche **ses factures**, c'est-à-dire ses dépenses, pour l'année choisie ou pour toutes les années.

### Catégories (Administration)

- **Renommer une sous-catégorie reporte automatiquement le nouveau nom** sur les activités, recettes et dépenses qui l'utilisaient. Cela sera utile quand le bureau remplacera les sous-catégories provisoires.
- Supprimer une sous-catégorie encore utilisée est refusé, avec un message qui indique combien de lignes l'utilisent.

## Règles de calcul

| Indicateur | Règle |
|---|---|
| Année d'une recette ou d'une dépense | Année de sa date d'encaissement ou de paiement |
| Budget consommé | Somme des dépenses **« Budgété »** de l'année, par catégorie |
| Solde budget | Budget prévisionnel total − budget consommé |
| % consommé | Budget consommé ÷ budget prévisionnel |
| Part hors budget | Dépenses « Hors budget » ÷ total des dépenses de l'année |
| Facture d'un prestataire | Dépense liée à ce prestataire. Le % est calculé sur le total des factures de l'année, « Autre » compris. Le graphique des 10 principaux exclut « Autre » |

## Données d'entraînement ajoutées

- **12 prestataires fictifs**, aux noms inventés et aux e-mails sur les domaines réservés `example.*`.
- **109 dépenses** sur 2025 et 2026 :
  - prestations des activités (coût réel × nombre d'inscrits) ;
  - assurance, impression et envoi du Maillon, frais bancaires, fournitures, aides sociales ;
  - locations de mobil-home ;
  - 4 dépenses hors budget.
- **46 recettes** :
  - cotisations regroupées par mois ;
  - dons, dont un hors budget ;
  - subventions ;
  - part payée par les adhérents pour le mobil-home.
- **Budgets 2025 et 2026** calés sur ces dépenses. Les budgets fictifs du lot 1 ont été remplacés parce qu'ils n'avaient pas été modifiés. Un budget modifié à la main n'est jamais remplacé.
- **Les participations aux activités ne sont pas encore en recettes** : elles seront créées automatiquement au lot 4, quand on coche « Payé » sur une échéance. Jusque-là, les recettes paraissent faibles face aux dépenses, c'est normal.

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Budget & Compta, année 2026 | Recettes 10 720 €, dépenses 26 412 €, **solde budget 6 407 €** (consommé 25 993 € sur 32 400 €), hors budget 419 €. Villégiatures à 102 % (barre rouge) |
| 2 | Passer à 2025 | Recettes 9 340 €, dépenses 29 388 €, solde budget 642 €, hors budget 630 €. Les graphiques changent |
| 3 | Survoler le graphique de répartition | Infobulle « Villégiatures : 17 600 € · 67 % », avec des accents corrects |
| 4 | Saisir une dépense de 250 € en Formation / Numérique, prestataire Clic & Seniors, activité PSC1 | Message « Dépense DEP-2026-… créée ». Dépenses +250 €, solde −250 €, ligne Formation +250 €. La dépense apparaît avec le filtre « Activité » |
| 5 | Modifier cette dépense : 300 € et « Hors budget » | Hors budget +300 €. Le consommé de Formation revient à sa valeur initiale |
| 6 | Saisir une recette « Divers / Cotisations » avec un adhérent, puis la supprimer | La sous-catégorie « Frais bancaires » n'est pas proposée. Les recettes montent puis reviennent |
| 7 | Budgets prévisionnels : +500 € sur une catégorie, puis Enregistrer | Message « Budgets prévisionnels 2026 enregistrés ». Solde budget +500 €, ligne visible dans l'onglet `Budgets` |
| 8 | Dans l'onglet `Recettes` du classeur : mettre « Automatique » dans la colonne Origine d'une ligne, puis « Actualiser » | Badge « Automatique ». Modifier et Supprimer sont refusés avec une explication |
| 9 | Administration → Catégories : renommer « Location mobil-home » en « Mobil-home (camping) » | Message « Nouveau nom reporté sur 40 ligne(s) ». Les recettes et dépenses portent le nouveau nom |
| 10 | Prestataires, année 2026 | 12 prestataires, factures 26 313 € (42 factures), 8 sur 12 sollicités. Résidence Les Embruns en tête (35,1 %) |
| 11 | Créer « Taxis du Plateau » avec un SIRET « 123 », puis sans SIRET ; recréer « TAXIS du plateau » | SIRET refusé, puis création de PRE-013. Le doublon est refusé |
| 12 | Modifier « Autre » ; supprimer « Restaurant Le Relais Fleuri » ; cliquer sur un nom | Refus pour « Autre » et pour le prestataire qui a des factures. Le clic sur un nom affiche ses factures |

## Tests déjà passés ici

- **Serveur** :
  - 41 vérifications pour le lot 3, dont la mise à jour d'une installation du lot 2, la protection des lignes automatiques, les budgets en lot et le report d'un renommage ;
  - les tests des lots 1 et 2 repassent (64 et 35 vérifications).
- **Navigateur, avec Chart.js** :
  - 46 vérifications pour le lot 3 : tous les indicateurs, le tableau des 8 catégories et les **données des 3 graphiques** ont été **recalculés indépendamment** pour 2025 et 2026, avec un résultat identique ;
  - les tests des lots 1 et 2 repassent (50 et 49 vérifications).

## Choix faits, à valider

1. **Budget consommé = dépenses « Budgété »**, comme dans le POC (« 15 210 / 20 000 € »). Les recettes ne viennent pas en déduction. Si le bureau raisonne plutôt en **coût net** par catégorie (dépenses − recettes, par exemple pour les séjours payés par les participants), c'est un réglage simple à changer.
2. **Mobil-home**, dans les données fictives : l'association paie la location au camping (dépense) et l'adhérent rembourse sa part (recette saisie). Le coût net pour l'association correspond donc aux aides. Faut-il qu'au lot 4 l'enregistrement d'une location crée automatiquement ces deux lignes ?
3. Les champs du POC **« Mode de paiement », « Justificatif » et « Commentaire »** des formulaires recette et dépense ne figurent pas dans le modèle de données du prompt (§4). Je ne les ai donc pas ajoutés. Je peux les ajouter si le bureau les souhaite.
4. Le tableau du POC **« Coût par activité »** sera repris dans la rubrique Activités (lot 4).
5. **Identifiants** : l'année d'un identifiant (REC-2026-…) est fixée à la création. Si l'on corrige la date vers une autre année, l'identifiant garde son année d'origine, mais la ligne est bien comptée dans la nouvelle année.
