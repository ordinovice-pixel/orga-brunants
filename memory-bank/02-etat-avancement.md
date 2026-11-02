# 02 — État d'avancement

Mise à jour : 02/11/2026

## En une phrase

La version opérationnelle d'entraînement est construite **par lots**. Les lots 1 à 6c sont livrés et testés par Jeff ; ses 398 vrais adhérents sont dans l'outil (mode entraînement). La documentation (lot 7) et le guide d'utilisation illustré sont livrés. Le **dépôt GitHub contient maintenant tout l'outil** (02/11). Prochaine étape : la phase de test de l'outil par le bureau.

## Les lots de la version opérationnelle

| Lot | Contenu | État |
|---|---|---|
| 1 | Socle : `setup()`, 12 onglets, navigation, sélecteur d'année, 3 zones, listes génériques, journal, mode entraînement, sauvegardes, rubrique Administration | ✅ Validé |
| 2 | Adhérents : fiche, liste, archives, désinscription / réinscription, indicateurs, historique de participation | ✅ Validé |
| 3 | Budget & Compta (recettes, dépenses, budgets par catégorie, solde budget) et Prestataires | ✅ Validé |
| 4 | Activités : inscriptions, échéances, recettes automatiques, mobil-home (plafond 2 × 60 €), fiche d'inscription Doc/PDF, notification mail | ✅ Testé ; choix tranchés le 19/10 (DEC-077 à 082) |
| 4b / 4c | Retouches du 18-19/10, test d'import dans une copie, import robuste aux 0 perdus | ✅ Installés |
| 5 | Tableau de bord, Calendrier, Procédures / AG / NAS repris du POC ; remboursement en recette négative, dates d'échéances personnalisables | ✅ Validé (DEC-083) |
| 6 | Assistant d'import, modèle `Modele_import_adherents.xlsx`, sauvegardes (liste, vérification, restauration), liens « 📎 Ouvrir » vers les justificatifs | ✅ Testé par Jeff (22/10) |
| 6b | Catégories du bureau (dossier budgétaire V5), « Ce qu'elle recouvre » sous la sous-catégorie | ✅ Testé par Jeff (22/10) |
| 6c | Vrais adhérents protégés, filtre « À compléter », 8.3 Dons, 24 sauvegardes | ✅ Installé, 398 adhérents importés, vérifié par Jeff (22/10 : effectif 2026 = 241 = 233 actifs + 8 décédés en 2026) |
| 7 | **Documentation** : doc claude.ai « Documentation de l'outil Les Brunants » (https://claude.ai/artifact/6CYCsAjhF8jHaUGsqS4Z2R), 3 onglets (Installation et maintenance · Prise en main avec 10 exercices · Description des tables) ; **guide d'utilisation illustré** `livrables/guide/Guide_utilisation_Brunants.html` | ✅ Livré le 22/10 |
| Dépôt GitHub | Code lot 6c, simulateur et tests, versions de référence, livrables, README complet, présentation vitrine anonymisée, description des tables (DEC-090) | ✅ 02/11/2026 |
| Phase de test | Tests de l'outil par Jeff puis le bureau | ⏳ Prochaine étape |
| Passage complet au réel | Vider activités et comptes fictifs (bouton à fournir), saisir les vrais, couper le mode entraînement | ⏳ Après la phase de test |

## Prochaine action

1. **Jeff** : faire tester l'outil au bureau (guide + 10 exercices) ; continuer à compléter les fiches (filtre « À compléter »).
2. **Claude** : préparer la phase de test (plan de test pour le bureau), puis le bouton de passage au réel.
3. **Rappel automatique** chaque lundi matin de novembre à mars : demander à Jeff les adresses des listes de diffusion Gmail (tâche planifiée « Rappel Brunants : listes de diffusion Gmail »).

## À savoir

- **Le dépôt GitHub est la version de référence du code** (dossier `apps_script/`, version lot 6c). Le dernier ZIP livré (`Outil_Brunants_Lot6c.zip`) contient les mêmes fichiers.
- Accès multi-comptes : un navigateur connecté à plusieurs comptes Google ouvre l'outil avec le premier compte (« Désolé, impossible d'ouvrir le fichier ») → fenêtre privée ou profil Chrome dédié au compte lesbrunants@gmail.com (voir 08).
- Activités et comptes réels : pas encore disponibles. On garde les données fictives (DEC-082), reclassées dans les catégories du bureau ; elles restent pour l'entraînement à côté des vrais adhérents (DEC-089).
- Parmi les 233 adhérents actifs : 49 dates d'entrée provisoires (01/01/2000), 31 sans e-mail, 13 sans téléphone, 1 sans date de naissance (contrôle local du 22/10) ; Jeff les complète avec le filtre « À compléter ».

## Où vit l'outil

- Compte Google des Brunants (lesbrunants@gmail.com) → `Mon Drive / Nouvelle Organisation / Outil_Brunants/` ; copies de test dans `Outil_Brunants/Tests_import` ; sauvegardes dans `Outil_Brunants/Sauvegardes`.
- Le classeur `Brunants_Donnees` et ses sauvegardes contiennent les vrais adhérents (DEC-089). Fichier source, CSV d'import et rapport : sur le PC de Jeff, `Documents\Atelier brunants 2025 - 2026\Projet nouvelle Organisation\`. Rien de réel dans les ZIP ni dans le dépôt GitHub (DEC-062).
- Code, tests, livrables, guide : dépôt privé https://github.com/ordinovice-pixel/orga-brunants.
- Documentation : doc claude.ai privé (à partager depuis le menu Partager du doc).
