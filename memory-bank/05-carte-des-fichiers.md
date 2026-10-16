# 05 — Carte des fichiers

Mise à jour : 16/10/2026

But : savoir **quel fichier fait quoi** sans parcourir les dossiers. À compléter à chaque création de fichier.

## 0. Dépôt GitHub (référence de tout le projet)

Dépôt privé dans l'espace GitHub `orga-brunants` (nom exact du dépôt à confirmer, voir Q-26).

| Élément du dépôt | Contenu |
|---|---|
| `README.md` | Présentation, organisation du dépôt, règles de commit |
| `.gitignore` | Exclusions : confidentiel, données personnelles réelles, fichiers lourds, journaux et temporaires |
| `memory-bank/` | Cette memory bank (copie identique aux documents du projet claude.ai) |
| `docs/` | Cahier des charges opérationnel, compte rendu du 11/08 |
| `apps_script/` | Code de l'outil (à remplir depuis le ZIP du lot 4) |
| `outils/` | Simulateur et tests de Claude |
| `livrables/` | LISEZMOI et assistants de mise à jour de chaque lot |

Une fois le dépôt rempli, **c'est lui la version de référence du code**, plus le dernier ZIP.

## 1. Code Apps Script (20 fichiers, dossier `apps_script/` du dernier ZIP)

> **Version de référence : `Outil_Brunants_Lot4.zip`** (12/10/2026). C'est ce ZIP qu'il faut joindre pour reprendre le développement.

| Fichier | Rôle | Si on cherche… |
|---|---|---|
| `appsscript.json` | Manifeste : V8, fuseau Europe/Paris, mode d'exécution de l'application web, autorisations | une autorisation Google, le fuseau |
| `Code.gs` | `doGet()` (affiche l'outil), `include()`, **`setup()`** (installation, onglets, dossiers, déclencheur), menu « Brunants » du classeur | l'installation, la création des dossiers |
| `Donnees.gs` | **Description des 12 onglets** (colonnes, validations), lecture robuste, écriture sous verrou, journal, paramètres | une colonne, une liste déroulante, une ligne ignorée |
| `DonneesFictives.gs` | Jeu d'entraînement : catégories, budgets, 232 adhérents, activités, inscriptions, mobil-home ; réinitialisation | les données de test |
| `Automatisations.gs` | Paiement → recette, remboursement → dépense, échéances, mobil-home, fiche d'inscription, e-mails, sauvegardes | une automatisation |
| `Import.gs` | Réservé à l'assistant d'import (lot 6) | l'import des vraies données |
| `Index.html` | Squelette de la page unique et inclusion de tous les fichiers ci-dessous | l'ordre des rubriques |
| `Styles.html` | Charte graphique du POC, 3 zones colorées | une couleur, une mise en forme |
| `Logo.html` | Logo en base64 | le logo |
| `Js_Commun.html` | Socle de l'interface : état `APP`, appels serveur, **sélecteur d'année**, navigation, notifications, formulaires, **composant Liste** (recherche, filtres, tri, Modifier / Supprimer, export CSV) | un comportement commun à toutes les listes |
| `Js_TableauDeBord.html` | Rubrique Tableau de bord | lot 5 |
| `Js_Adherents.html` | Rubrique Adhérents : indicateurs, fiche, liste, archives, historique | lot 2 |
| `Js_Budget.html` | Rubrique Budget & Compta | lot 3 |
| `Js_Activites.html` | Rubrique Activités : fiche, inscriptions, échéances, mobil-home, subventions, coût par activité | lot 4 |
| `Js_Prestataires.html` | Rubrique Prestataires | lot 3 |
| `Js_Calendrier.html` | Rubrique Calendrier | lot 5 |
| `Js_Procedures.html`, `Js_AG.html`, `Js_NAS.html` | Rubriques reprises du POC | lot 5 |
| `Js_Administration.html` | Paramètres, mode entraînement, sauvegarde, réinitialisation, avertissements de lecture | l'administration |

## 2. Outils de Claude (dossier `outils/` du ZIP, **ne pas copier dans Apps Script**)

| Fichier | Rôle |
|---|---|
| `faux_gas.js` | Simulateur des services Google pour tester hors ligne |
| `test_serveur.js`, `test_serveur_lot2.js` … `_lot4.js` | Tests automatiques du serveur, lot par lot (tous rejoués à chaque lot) |
| `test_interface_lot*.py` | Tests Playwright de l'interface sur l'aperçu |
| `construire_apercu.py` | Fabrique `Apercu_local_Brunants.html` |
| `construire_assistant_mise_a_jour.py` | Fabrique `Assistant_mise_a_jour_LotN.html` (fichiers modifiés seulement) |
| `construire_assistant_installation.py` | Fabrique `Assistant_installation.html` (les 20 fichiers, nouvelle installation) |
| `reference_lotN/` | Copie des fichiers du lot précédent, sert à détecter ce qui a changé |

## 3. Livrables à la racine de chaque ZIP

| Fichier | Rôle | Pour qui |
|---|---|---|
| `Assistant_mise_a_jour_LotN.html` | Une carte par fichier modifié, bouton « Copier le contenu » | Jeff, pour mettre à jour Google |
| `Assistant_installation.html` | Installation complète sur un nouveau projet | Nouvelle installation |
| `LISEZMOI_LotN.md` | Étapes de mise à jour, contenu du lot, **tests manuels avec valeurs attendues**, choix à valider | Jeff |
| `Apercu_local_Brunants.html` | Aperçu hors ligne (rien n'est enregistré) | Démonstration sans Google |

Historique des ZIP : `Outil_Brunants_Lot1.zip` → `…Lot2.zip` (6 fichiers modifiés) → `…Lot3.zip` (9) → `…Lot4.zip` (11). Garder au moins le dernier ZIP, sur le poste de Jeff et sur le NAS.

## 4. Sur le Drive des Brunants

`Mon Drive / Nouvelle Organisation / Outil_Brunants/`

| Élément | Rôle |
|---|---|
| `Brunants_Donnees` | **Le classeur de données** (12 onglets) ; le projet Apps Script lui est rattaché (Extensions → Apps Script) |
| `Sauvegardes/` | `Sauvegarde_Brunants_AAAA-MM-JJ` + export .xlsx |
| `Fiches_inscription/` | Fiches d'inscription générées (Doc + PDF) |

## 5. Documents du projet claude.ai

| Fichier | Rôle |
|---|---|
| `claude/compte-rendu-2026-08-11-reunion-prototype.md` | Compte rendu de la réunion de présentation du prototype au président |
| `claude/prompt-outil-operationnel.md` | **Cahier des charges de la version opérationnelle** (§1 à §10) : référence de tous les lots |
| `memory-bank/*.md` | Cette memory bank |

## 6. Documents antérieurs (chez Jeff)

| Fichier | Rôle |
|---|---|
| POC HTML V4 puis V5 / pass 6 (fichier unique ~150 Ko) | Prototype validé : référence visuelle de l'interface |
| CDC V1 (9 modules) et V2 (7 chantiers), comparatif V1/V2, liste d'arbitrages | Cahier des charges initial |
| `Pilotage_Brunants_2026.xlsx` | Classeur de pilotage (6 onglets, ~50 formules) |
| 12 modèles de mails YAMM | Adhésion / activités / vie associative |
| Présentations PowerPoint (CDC 17 diapos, synthèse 11 diapos, prototype 7 diapos du 07/10) | Supports de présentation |
| Mode d'emploi du POC (Word, 12 pages) | Guide rubrique par rubrique du prototype |
