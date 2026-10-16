# Outil de gestion « Les Brunants »

Dépôt **privé** du projet de réorganisation de l'association Les Brunants : outil de gestion (application web Google Apps Script + Google Sheets), documentation et suivi du projet.

Chef de projet : Jeff Madeline (OrdiNovice) · Développement avec Claude.

## Par où commencer

1. Lire [`memory-bank/00-LISEZ-MOI.md`](memory-bank/00-LISEZ-MOI.md) : sommaire et règles de tenue.
2. Lire [`memory-bank/02-etat-avancement.md`](memory-bank/02-etat-avancement.md) : où on en est.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `memory-bank/` | Trace du projet : contexte, état, décisions, architecture, carte des fichiers, journal, questions ouvertes, procédures |
| `docs/` | Documents de référence : cahier des charges de la version opérationnelle, comptes rendus |
| `apps_script/` | Code de l'outil, à copier dans le projet Apps Script (à partir du lot 4) |
| `outils/` | Simulateur et tests de Claude, générateurs d'assistants (ne pas copier dans Apps Script) |
| `livrables/` | LISEZMOI et assistants de mise à jour de chaque lot |

## Ce qui n'est jamais dans ce dépôt

Voir `.gitignore` : mots de passe et clés, **données personnelles réelles** (fichiers d'adhérents, sauvegardes du classeur, fiches d'inscription remplies), vidéos et archives lourdes, journaux et fichiers temporaires. Les vraies données restent sur le Drive des Brunants.

## Règles de commit

- Un commit par étape cohérente (un lot, une correction, une mise à jour de la memory bank).
- Message en français, au présent : `Lot 5 : tableau de bord et calendrier`.
- Une version livrée au bureau reçoit une étiquette : `lot-4`, `lot-5`…
