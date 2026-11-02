# 05 — Carte des fichiers

Mise à jour : 02/11/2026

But : savoir **quel fichier fait quoi** sans parcourir les dossiers. À compléter à chaque création de fichier.

## 0. Dépôt GitHub (référence de tout le projet)

Dépôt privé **https://github.com/ordinovice-pixel/orga-brunants** (compte personnel de Jeff), branche `main`. L'application GitHub « Claude » y est installée (accès limité à ce dépôt).

| Élément du dépôt | Contenu |
|---|---|
| `README.md` | Présentation complète : raison du projet, fonctionnalités, avantages, stack, guide HTML, données personnelles, méthode IA, historique, installation, organisation du dépôt |
| `.gitignore` | Exclusions : confidentiel, données personnelles réelles, fichiers lourds, journaux et temporaires |
| `memory-bank/` | Cette memory bank (copie identique aux documents du projet claude.ai) |
| `docs/` | Cahier des charges opérationnel, compte rendu du 11/08, `Description_des_tables.md` (générée depuis le schéma), `Presentation_vitrine.md` (cas client **anonymisé**, DEC-090) |
| `apps_script/` | **Code de l'outil, version lot 6c** (21 fichiers) + `LISEZMOI.md` (rôle de chaque fichier) |
| `outils/` | Simulateur, tests serveur et interface, générateurs, versions de référence `reference_lot3` … `reference_lot6b` + `LISEZMOI.md` |
| `livrables/` | LISEZMOI des lots 1 à 6c, assistant d'installation, assistant de mise à jour du lot 6c, aperçu local, modèle d'import, `guide/` (guide illustré) |

Depuis le 02/11/2026, **le dépôt est la version de référence du code** (même contenu que `Outil_Brunants_Lot6c.zip`). Pour reprendre le développement : cloner le dépôt.

## 1. Code Apps Script (21 fichiers, dossier `apps_script/` du dépôt)

> **Version de référence : dossier `apps_script/` du dépôt GitHub** (lot 6c, `VERSION_OUTIL` « Lot 6c — adhérents réels, dons et sauvegardes (octobre 2026) »). Copie identique : `Outil_Brunants_Lot6c.zip`.

| Fichier | Rôle | Si on cherche… |
|---|---|---|
| `appsscript.json` | Manifeste : V8, fuseau Europe/Paris, mode d'exécution de l'application web, autorisations | une autorisation Google, le fuseau |
| `Code.gs` | `doGet()` (affiche l'outil), `include()`, **`setup()`** (installation, onglets, dossiers, déclencheur), menu « Brunants » du classeur | l'installation, la création des dossiers |
| `Donnees.gs` | **Description des 12 onglets** (colonnes, validations), lecture robuste, écriture sous verrou, journal, paramètres | une colonne, une liste déroulante, une ligne ignorée |
| `DonneesFictives.gs` | Jeu d'entraînement : catégories du bureau, budgets, adhérents fictifs, activités, inscriptions, mobil-home ; réinitialisation (n'écrase pas les adhérents réels, DEC-089) | les données de test |
| `Automatisations.gs` | Paiement → recette, remboursement → dépense, échéances, mobil-home, fiche d'inscription, e-mails, sauvegardes | une automatisation |
| `Import.gs` | Assistant d'import côté serveur : contrôle, test dans une copie, ajouter / remplacer, marque ADHERENTS_REELS ; sauvegardes (liste, vérification, restauration) | l'import, la restauration |
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
| `Js_Administration.html` | Paramètres, mode entraînement, sauvegardes et restauration, catégories et descriptifs, réinitialisation, avertissements de lecture | l'administration |
| `Js_Import.html` | Assistant d'import côté navigateur : lecture CSV / Excel (SheetJS), correspondance des colonnes, rapport | l'import |

## 2. Outils de Claude (dossier `outils/` du ZIP, **ne pas copier dans Apps Script**)

| Fichier | Rôle |
|---|---|
| `faux_gas.js` | Simulateur des services Google pour tester hors ligne |
| `test_serveur.js`, `test_serveur_lot2.js` … `_lot6c.js`, `test_serveur_import.js` | Tests automatiques du serveur, lot par lot (≈ 340 vérifications, tous rejoués à chaque lot) |
| `test_interface_lot*.py` | Tests Playwright de l'interface sur l'aperçu (≈ 370 vérifications) |
| `construire_apercu.py` | Fabrique `Apercu_local_Brunants.html` |
| `construire_assistant_mise_a_jour.py` | Fabrique `Assistant_mise_a_jour_LotN.html` (fichiers modifiés seulement) |
| `construire_assistant_installation.py` | Fabrique `Assistant_installation.html` (les 21 fichiers, nouvelle installation) |
| `construire_modele_import.py` | Fabrique `Modele_import_adherents.xlsx` |
| `reference_lotN/` | Copie des fichiers du lot précédent, sert à détecter ce qui a changé |

## 3. Livrables à la racine de chaque ZIP

| Fichier | Rôle | Pour qui |
|---|---|---|
| `Assistant_mise_a_jour_LotN.html` | Une carte par fichier modifié, bouton « Copier le contenu » | Jeff, pour mettre à jour Google |
| `Assistant_installation.html` | Installation complète sur un nouveau projet | Nouvelle installation |
| `LISEZMOI_LotN.md` | Étapes de mise à jour, contenu du lot, **tests manuels avec valeurs attendues**, choix à valider | Jeff |
| `Apercu_local_Brunants.html` | Aperçu hors ligne (rien n'est enregistré) | Démonstration sans Google |

Historique des ZIP : `Outil_Brunants_Lot1.zip` → `…Lot2.zip` (6 fichiers modifiés) → `…Lot3.zip` (9) → `…Lot4.zip` (11) → `…Lot4b/4c` → `…Lot5` → `…Lot6` → `…Lot6b` → `…Lot6c.zip`. Le dépôt GitHub garde tout ; garder aussi le dernier ZIP sur le poste de Jeff et sur le NAS.

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

## 7. Guide d'utilisation pour le bureau (22/10/2026)

| Fichier | Rôle |
|---|---|
| `livrables/guide/Guide_utilisation_Brunants.html` | **Le guide** : fichier autonome (~3 Mo, images intégrées), hors ligne, téléphone, impression. Ancres stables (`#adh-liste`, `#act-suivi`, `#tuto-rembourser`…) et `window.GuideBrunants.aller(id)` pour un futur bouton « ? » ; à ouvrir à terme depuis la rubrique 6. Procédures |
| `guide/source/guide_source.html` | Squelette : styles, volet vert, accueil (« Je veux… », index), Les bases |
| `guide/source/rub_1_tdb.html` … `rub_5_fin.html` | Une rubrique par fichier (Prestataires, Calendrier, À venir, Administration et Glossaire dans `rub_5_fin`) |
| `guide/source/guide.js` | Navigation, index automatique, recherche libre (accents ignorés, synonymes dans `SYN`) |
| `guide/outils/captures_guide.py` | Les 68 captures, prises dans `Apercu_local_Brunants.html` (données fictives) en rejouant les 10 exercices |
| `guide/outils/construire_guide.py` | Assemble le fichier unique, contrôle ancres et liens |
| `guide/outils/verifier_guide.py` | Erreurs JS, 18 recherches types, ancres, affichage téléphone |
| `guide/LISEZMOI_Guide.md` | Contenu et commandes de régénération après un nouveau lot |
