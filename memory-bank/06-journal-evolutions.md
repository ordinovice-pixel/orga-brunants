# 06 — Journal des évolutions

Mise à jour : 02/11/2026

Une ligne par étape, la plus récente en haut. Le détail des décisions est dans `03-decisions.md`.

| Date | Version / étape | Ce qui a changé | Décisions |
|---|---|---|---|
| 02/11/2026 | **Transcription sur GitHub** | Le dépôt reçoit tout l'outil : code lot 6c (21 fichiers), simulateur, tests et versions de référence, livrables, guide ; README complet (raison du projet, fonctionnalités, avantages, stack, guide HTML, méthode IA) ; `docs/Presentation_vitrine.md` anonymisée ; `docs/Description_des_tables.md`. Données de test rendues fictives avant le dépôt | DEC-090 |
| 22/10/2026 | **Lot 7 — Documentation** | Doc claude.ai « Documentation de l'outil Les Brunants » (installation et maintenance, prise en main avec 10 exercices, description des tables) ; dépannage multi-comptes Google ajouté | — |
| 22/10/2026 | **Guide d'utilisation (bureau)** | `livrables/guide/Guide_utilisation_Brunants.html` : fichier HTML autonome (~3 Mo), volet vert foncé, zones bleu / vert / jaune de l'outil, une partie par rubrique (Indicateurs, Saisie, Listes, Tutos), 16 tutos dont les 10 exercices de la Prise en main, glossaire, index et « Je veux… », recherche libre. 68 captures prises dans l'aperçu local avec les données fictives. Sources et scripts de régénération dans `guide/` | DEC-062 |
| 22/10/2026 | **Lot 6c — Adhérents réels** | Protection des vrais adhérents (réinitialisation et `setup` ne les touchent plus), filtre « À compléter », 8.3 Dons, 24 sauvegardes ; 398 adhérents importés par Jeff, vérifiés | DEC-087, 088, 089 |
| 22/10/2026 | **Lot 6b — Catégories du bureau** | Catégories du dossier budgétaire V5 + 8. Subvention et Adhésions, champ « Ce qu'elle recouvre », données fictives reclassées | DEC-087 |
| 19-22/10/2026 | **Lot 6 — Import et sauvegardes** | Assistant d'import (CSV / Excel, 3 modes), modèle d'import, liste / vérification / restauration des sauvegardes, liens « 📎 Ouvrir » | DEC-084, 085, 086 |
| 19/10/2026 | **Lot 5 — Tableau de bord** | Tableau de bord avec alertes calculées, calendrier, Procédures / AG / NAS repris du POC, remboursement en recette négative, dates d'échéances personnalisables | DEC-077 à 083 |
| 18-19/10/2026 | **Lots 4b / 4c** | Retouches (libellés, graphiques chiffrés, couleurs recettes / dépenses), test d'import dans une copie, import robuste aux 0 perdus | DEC-013, 023, 045, 070 à 076 |
| 16/10/2026 | Dépôt GitHub | Premier commit envoyé sur `ordinovice-pixel/orga-brunants` (README, `.gitignore`, memory bank, docs) | DEC-033 |
| 16/10/2026 | Memory bank | Création de la memory bank (9 fichiers) | — |
| 12/10/2026 | **Lot 4 — Activités** | Inscriptions et échéances, recettes / dépenses automatiques, remboursement, mobil-home avec campings et plafond 2 × 60 €, mode de paiement / justificatif / commentaire, fiche d'inscription Doc + PDF, notification mail, coût par activité, réinitialisation. 11 fichiers modifiés ; nouvelle autorisation Google (Docs) | DEC-051, 052, 054, 055 |
| 10-12/10/2026 | **Lot 3 — Budget & Prestataires** | Budget prévu / réalisé par catégorie, solde budget, graphiques, factures par prestataire, renommage de catégories en cascade. 9 fichiers modifiés | DEC-053 |
| 10/2026 | **Lot 2 — Adhérents** | Indicateurs démographiques, fiche complète, liste de l'année, archives, désinscription / réinscription, historique de Participation Association. 6 fichiers modifiés | DEC-056, 057 |
| 10/2026 | **Lot 1 — Socle** | 12 onglets, `setup()`, sélecteur d'année, listes génériques, journal, mode entraînement, sauvegardes, Administration. Installé sur le compte des Brunants (dossier « Nouvelle Organisation ») | DEC-040 à 044 |
| 09/10/2026 | Prompt opérationnel | Cahier des charges de la version opérationnelle d'entraînement | DEC-012, 021, 040 à 044 |
| 07/10/2026 | Présentation au bureau | Prototype présenté ; échéance du MVP fixée au 31/12/2026 | — |
| 26/09/2026 | POC V5 et pass 6 | ~20 correctifs (renommages, démographie, mobil-home, prestataires, catégories budgétaires, budget prévisionnel, fonds pastel des zones) | DEC-010, 011 |
| 11/08/2026 | Réunion prototype | Revue du POC V4 avec le président | DEC-003, 004, 010, 011, 020, 022, 050, 060 |
| 08/2026 | POC V1 → V4 | Prototype HTML autonome, 8 rubriques, données fictives | DEC-030, 032 |
| 22/07/2026 | Synthèse du président | Passage au CDC V2 (7 chantiers métier) | DEC-001, 002 |
