# 04 — Architecture technique

Mise à jour : 02/11/2026

## Vue d'ensemble

```
Navigateur (page unique à onglets, une rubrique par onglet)
   │  google.script.run
   ▼
Application web Apps Script (Code.gs, Donnees.gs, Automatisations.gs…)
   │  lecture à chaque chargement / écriture sous LockService
   ▼
Classeur Google Sheets « Brunants_Donnees » (12 onglets)
   ├─ Drive : Outil_Brunants/Sauvegardes/        (copies mensuelles + .xlsx)
   ├─ Drive : Outil_Brunants/Fiches_inscription/ (Google Docs + PDF)
   └─ MailApp (redirigé en mode entraînement)
```

## Stack

- Front : HTML / CSS / JavaScript « vanilla », Chart.js 4.4.1 et chartjs-plugin-datalabels 2.2.0, SheetJS 0.18.5 pour l'assistant d'import (tous depuis cdnjs).
- Serveur : Google Apps Script (V8, fuseau Europe/Paris), HtmlService, LockService, MailApp, DriveApp, DocumentApp (depuis le lot 4).
- Données : Google Sheets, en-têtes en français, première ligne figée, dates JJ/MM/AAAA, montants en nombres. **Aucune formule indispensable** : les calculs sont faits par l'application.

## Les 12 onglets du classeur

| Onglet | Contenu | Remarques |
|---|---|---|
| `Adherents` | Fiche complète (ID ADH-xxxx, type, adresse, région calculée, contacts, cotisation, Facebook, Maillon, conjoint, décès, désinscription…) | Clé commune à toutes les tables |
| `Activites` | ID ACT-AAAA-xxx, catégorie, dates, prix par personne, participation, nombre d'échéances (1 à 12), notification | |
| `Inscriptions` | Lien activité ↔ adhérent, statut, montant dû | |
| `Echeances` | Une ligne par échéance ; Payé, date, ID recette générée, remboursé, ID dépense générée | Dates prévues réparties jusqu'à la veille de l'activité |
| `Recettes` | ID REC-AAAA-xxxx ; budgété / hors budget ; origine (manuelle / automatique) ; mode de paiement, justificatif, commentaire | |
| `Depenses` | ID DEP-AAAA-xxxx ; prestataire ; activité liée ; origine (manuelle / automatique / remboursement) ; mode de paiement, justificatif, commentaire | |
| `Categories` | Catégorie, sous-catégorie, type, « Ce qu'elle recouvre » | Catégories du bureau (DEC-087). Renommer cascade dans les autres tables |
| `Budgets` | Année, catégorie, budget prévisionnel | |
| `Prestataires` | ID PRE-xxx, coordonnées, début de relation | Entrée « Autre » permanente |
| `MobilHome` | Adhérent, année, semaine, **camping**, coût, aide, part payée | Plafond 2 × 60 € par titulaire et par an |
| `Parametres` | Mode entraînement, e-mail de test, aide mobil-home, départements IDF, nombre de sauvegardes (24), adresse de liste de diffusion (facultative) | |
| `Journal` | Date, utilisateur, action, table, ID, résumé | Toutes les écritures et automatisations |

**Les catégories du bureau** (DEC-087) : 1. Séjours et villégiatures … 7. Fonctionnement association (dépenses et recettes liées), + 8. Subvention et Adhésions (recettes seulement : 8.1 Subvention, 8.2 Adhésion, 8.3 Dons).

## Automatisations en place

| Déclencheur | Effet |
|---|---|
| Inscription à une activité | Crée autant d'échéances que prévu |
| Échéance cochée « Payé » | Crée la recette (décocher la supprime) |
| « Rembourser » | Crée une **recette négative** (origine « Remboursement ») liée à l'échéance, sans dépense (DEC-077) |
| Enregistrement d'une location de mobil-home | Calcule l'aide (plafond), crée dépense + recette ; ajout ou suppression recalcule les aides |
| Création d'une activité avec notification | E-mail aux adhérents (quota ≈ 100/jour en compte gratuit ; liste de diffusion possible) |
| Bouton fiche d'inscription | Google Doc + PDF pré-remplis dans `Fiches_inscription/` |
| 1er du mois, la nuit | Sauvegarde complète + .xlsx, 24 conservées (DEC-088) |
| Assistant d'import (ajouter / remplacer) | Sauvegarde avant écriture ; « Remplacer » vide aussi les tables dépendantes ; import d'adhérents → outil marqué « adhérents réels » (DEC-084, 089) |
| Restauration | Sauvegarde de l'état actuel, puis recopie de toutes les tables (DEC-085) |
| Toute écriture | Ligne dans `Journal` |

## Déploiement

- Application web : « Exécuter en tant que l'utilisateur qui accède », « Toute personne disposant d'un compte Google » ; la sécurité vient du partage du classeur.
- **Mise à jour d'une version** : Déployer → Gérer les déploiements → ✏️ → Version : *Nouvelle version* → Déployer. L'URL ne change pas. Voir `08-lecons-et-procedures.md`.

## Chaîne de test côté Claude (dossier `outils/` du dépôt)

- `faux_gas.js` : simulateur Node.js des services Google (SpreadsheetApp, DriveApp, LockService, MailApp, DocumentApp…).
- `test_serveur_lotN.js` : exécute les vrais `.gs` contre le simulateur.
- `construire_apercu.py` → `Apercu_local_Brunants.html` : aperçu hors ligne qui fait tourner le vrai code.
- `test_interface_lotN.py` : tests Playwright de l'aperçu, avec recalcul indépendant des indicateurs. Chart.js est servi en local (le CDN ne répond pas dans l'environnement de Claude).
- `construire_assistant_mise_a_jour.py` : compare `apps_script/` avec `outils/reference_lotN/` et génère l'assistant (une carte par fichier modifié).
