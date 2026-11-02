# Outil de gestion « Les Brunants » — Lot 6b : les catégories du bureau

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 6b s'installe **par-dessus le lot 6**. Il remplace les catégories provisoires par celles de votre dossier budgétaire (V5).

## Mise à jour (environ 10 minutes)

1. Dans l'outil, cliquez sur **💾 Sauvegarder maintenant**.
2. Ouvrez `Assistant_mise_a_jour_Lot6b.html` et remplacez les **10 fichiers** qu'il indique, un par un.
3. 💾 **Enregistrez le projet**, puis exécutez **setup**. Le journal affiche deux choses, et c'est normal :
   - « colonne(s) ajoutée(s) : Ce qu'elle recouvre » ;
   - un avertissement sur les anciennes catégories.
4. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**.
5. Dans l'outil, appuyez sur `F5` : le bas de la barre latérale affiche « Lot 6b ».
6. **Indispensable** : **Administration → Réinitialiser les données d'entraînement**. Cela charge les catégories du bureau et reclasse toutes les activités, recettes, dépenses et budgets d'entraînement.

## Ce qui change

### Les 8 catégories et 26 sous-catégories

| Catégorie | Sous-catégories |
|---|---|
| 1. Séjours et villégiatures | 1.1 Séjours 7j. et + · 1.2 Villégiature en mobil-home · 1.3 Voyages d'études |
| 2. Sorties et spectacles | 2.1 Spectacles, cabaret, théâtre et concerts · 2.2 Visites et découvertes 1 journée · 2.3 Randonnées |
| 3. Convivialité et fêtes | 3.1 Repas à thème · 3.2 Journées printanières, barbecues · 3.3 Animations calendaires : galette, crêpes, Beaujolais |
| 4. Loisirs et animations | 4.1 Lotos · 4.2 Concours de boules, de pêche et autres · 4.3 Retransmissions sportives ou autres au club |
| 5. Culture, créativité et bien-être | 5.1 Ateliers créatifs, relaxation, chant · 5.2 Conférences |
| 6. Informatique et apprentissages | 6.1 Ateliers informatiques · 6.2 Prévention : gestes qui sauvent · 6.3 Autres... |
| 7. Fonctionnement association | 7.1 Gouvernance associative · 7.2 Gestion administrative et financière · 7.3 Communication et information · 7.4 Gestion des adhérents · 7.5 Local et logistique · 7.6 Administration courante (fonctionnement) · 7.7 Services et outils informatiques |
| 8. Subvention et Adhésions | 8.1 Subvention · 8.2 Adhésion |

- **Catégories 1 à 7** : elles servent aux dépenses **et** aux recettes qui y sont liées. Par exemple, ce que paient les adhérents pour un séjour va en 1.1, comme la dépense du séjour.
- **Catégorie 8** : recettes seulement. Elle n'apparaît ni dans le formulaire de dépense, ni dans la fiche activité, ni dans les budgets prévisionnels.
- Les **numéros** sont gardés : toutes les listes suivent l'ordre du document.
- « Randonnées » était numérotée **3.3** dans le document, sous la catégorie 2. Elle devient **2.3**.

### « Ce qu'elle recouvre » s'affiche pendant la saisie

- Dans les formulaires **dépense**, **recette** et **fiche activité**, un encadré bleu apparaît sous la sous-catégorie choisie. Il affiche le texte du document, par exemple pour 7.2 : « Frais bancaires (Crédit Mutuel), assurances (MAIF)… ».
- En passant la souris sur les choix de la liste, on voit aussi le descriptif de chacun.
- **Administration → Catégories** : la liste a une colonne « Ce qu'elle recouvre ». La fiche permet de **modifier ce texte** sans passer par moi.

### Données d'entraînement reclassées

Les montants ne changent pas, seul le classement change. Exemples :

| Avant | Maintenant |
|---|---|
| Galette des rois | 3.3 Animations calendaires |
| Repas de fin d'année | 3.1 Repas à thème |
| Assemblée générale | 7.1 Gouvernance associative |
| Séjours (Bretagne, Jura) | 1.1 Séjours 7j. et + |
| Mobil-home | 1.2 Villégiature en mobil-home |
| Visites (Fontainebleau, Seine, Thoiry) | 2.2 Visites et découvertes 1 journée |
| Atelier peinture, chorale | 5.1 Ateliers créatifs, relaxation, chant |
| Premiers secours | 6.2 Prévention : gestes qui sauvent |
| Maillon (impression, timbres) | 7.3 Communication et information |
| Assurance, frais bancaires | 7.2 Gestion administrative et financière |
| Fleurs, colis, cadeaux | 7.4 Gestion des adhérents |
| Vidéoprojecteur, sonorisation, imprimante | 7.5 Local et logistique |
| Cotisations | 8.2 Adhésion |
| Subventions et dons | 8.1 Subvention |

Il n'y a pas d'activité fictive de loto ou de concours : la catégorie 4 est vide (budget de 300 €).

## Tests à faire dans Google (après la réinitialisation)

| # | Ce que vous faites | Ce que vous devez voir |
|---|---|---|
| 1 | **Administration → Catégories** | 26 lignes, de 1.1 à 8.2, avec la colonne « Ce qu'elle recouvre » |
| 2 | **Budget & Compta**, formulaire de dépense, liste « Catégorie » | Les catégories 1 à 7, mais pas la 8 |
| 3 | Choisir **7. Fonctionnement association**, puis la sous-catégorie **7.4** | L'encadré bleu : « Ce qu'elle recouvre : Fleurs pour décès ou autres circonstances ; cadeaux divers… » |
| 4 | Formulaire de recette, liste « Catégorie » | Les 8 catégories. Avec la 8 : 8.1 Subvention et 8.2 Adhésion |
| 5 | Plus bas : **Budget prévisionnel par catégorie** (2026) | 7 lignes, une par catégorie 1 à 7. Solde budget 2026 : **6 497 €** |
| 6 | **Activités** → fiche activité, catégorie 3, sous-catégorie 3.2 | L'encadré bleu sous la sous-catégorie |
| 7 | **Tableau de bord** | Les nouveaux noms dans les graphiques. L'alerte « 1. Séjours et villégiatures — dépassement budgétaire de 1 % » |
| 8 | Administration → Catégories → ✏️ sur **2.3 Randonnées** → changer le texte « Ce qu'elle recouvre » → Enregistrer | Le nouveau texte apparaît dans la liste et sous la sous-catégorie dans les formulaires |

## Tests déjà passés ici

- **Serveur** :
  - **25 vérifications** pour le lot 6b :
    - les 8 catégories et 26 sous-catégories avec leur descriptif ;
    - aucune ligne d'entraînement orpheline ;
    - les paiements des adhérents dans la catégorie de l'activité ;
    - une dépense refusée en catégorie 8 ;
    - la mise à jour d'un classeur du lot 6, puis la réinitialisation.
  - Les tests des lots 1 à 6 repassent (64, 35, 41, 68, 18, 19 et 45 vérifications), adaptés aux nouvelles catégories.
- **Navigateur** :
  - **20 vérifications** pour le lot 6b : formulaires, survol, fiche activité, Administration, budgets, graphiques, calendrier, téléphone.
  - Les tests des lots 1 à 6 repassent (50, 49, 50, 83, 52 et 54 vérifications).

## Points à valider

1. **Dons** : ils n'ont pas de sous-catégorie dans le document. Je les ai mis en **8.1 Subvention**. Voulez-vous plutôt une sous-catégorie **8.3 Dons** ?
2. **Descriptifs 8.1 et 8.2** : je les ai écrits moi-même (« Subventions reçues (commune, département, autres organismes) » et « Cotisations annuelles des adhérents »). Vous pouvez les changer dans Administration.
3. **« Maintenance informatique »** figure à la fois en 7.2 et en 7.7. Je propose de la garder seulement en **7.7 Services et outils informatiques**, et de retirer ces mots du descriptif de 7.2. D'accord ?
