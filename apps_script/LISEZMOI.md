# `apps_script/` — le code de l'outil (version lot 6c)

Ces 21 fichiers forment le projet Google Apps Script rattaché au classeur `Brunants_Donnees` (Extensions → Apps Script). Ils se copient avec `livrables/Assistant_installation.html` (installation complète) ou `livrables/Assistant_mise_a_jour_LotN.html` (mise à jour). Ne pas copier ce fichier `LISEZMOI.md`.

## Côté serveur (Apps Script, JavaScript V8)

| Fichier | Rôle |
|---|---|
| `appsscript.json` | Manifeste : V8, fuseau Europe/Paris, application web « exécutée en tant que l'utilisateur qui accède » |
| `Code.gs` | `doGet()` (affiche l'outil), `include()`, **`setup()`** (installation et mises à jour : onglets, colonnes, dossiers, déclencheur mensuel, migrations), menu « Brunants » du classeur |
| `Donnees.gs` | **Description des 12 onglets** (`SCHEMA` : colonnes, types, listes, obligatoires), catégories du bureau, lecture robuste par titre de colonne, contrôles, écriture sous verrou, journal, paramètres, chargement complet (`chargerTout`) |
| `DonneesFictives.gs` | Jeu d'entraînement déterministe (≈ 230 adhérents, 15 activités, inscriptions, échéances, recettes, dépenses, budgets, prestataires, mobil-home) et catégories du bureau |
| `Automatisations.gs` | Inscriptions et échéances, paiement → recette, remboursement → recette négative, mobil-home (aide plafonnée), fiche d'inscription Google Doc + PDF, e-mails (redirigés en mode entraînement), sauvegardes, restauration, réinitialisation |
| `Import.gs` | Assistant d'import : contrôle des lignes, test dans une copie, modes « ajouter » et « remplacer », protection des vrais adhérents |

## Côté navigateur (HTML, CSS, JavaScript sans framework)

| Fichier | Rôle |
|---|---|
| `Index.html` | Page unique : barre latérale, 10 rubriques, formulaires, et inclusion des fichiers ci-dessous |
| `Styles.html` | Charte graphique (Calibri, bleu #1A5276, ambre #F39C12), 3 zones colorées, affichage téléphone |
| `Logo.html` | Logo de l'association (base64) |
| `Js_Commun.html` | Socle : état `APP`, appels serveur, sélecteur d'année, calculs partagés (`CALC`, `ANNEE`), notifications, formulaires, **composant Liste** générique (recherche, filtres, tri, Modifier / Supprimer, export CSV), graphiques |
| `Js_TableauDeBord.html` | 1. Tableau de bord : indicateurs, 3 graphiques, alertes calculées, prochaines activités |
| `Js_Adherents.html` | 2. Adhérents : indicateurs, fiche, liste, filtre « À compléter », archives, historique |
| `Js_Budget.html` | 3. Budget & Compta : recettes, dépenses, budgets par catégorie, solde budget |
| `Js_Activites.html` | 4. Activités : fiche, inscriptions, paiements échelonnés, remboursements, mobil-home |
| `Js_Prestataires.html` | 5. Prestataires : fiches, factures, 10 principaux |
| `Js_Calendrier.html` | 6. Calendrier alimenté par les activités et les dates d'échéances |
| `Js_Procedures.html`, `Js_AG.html`, `Js_NAS.html` | Rubriques reprises du prototype, à titre d'information |
| `Js_Administration.html` | 9. Administration : paramètres, catégories, outils, lignes à corriger, journal |
| `Js_Import.html` | Assistant d'import (CSV / Excel lu dans le navigateur avec SheetJS) et panneau des sauvegardes |
