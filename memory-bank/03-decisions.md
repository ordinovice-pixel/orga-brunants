# 03 — Registre des décisions

Mise à jour : 16/10/2026

Format : **DEC-xxx** · date · décision · source (qui a demandé ou validé). Une décision annulée n'est pas effacée : elle est barrée et renvoie vers celle qui la remplace.

## Organisation et périmètre

- **DEC-001** · 07/2026 · Le cahier des charges passe de 9 modules techniques (V1) à **7 chantiers métier** (V2) : Base adhérents, Budget & comptabilité, Fiche organisateur / Activités, Calendrier, Procédures, AG, Classement NAS. · Synthèse du président (22/07)
- **DEC-002** · 07/2026 · Jira retiré (outil interne du consultant). Sondages intégrés à l'AG, FAQ fusionnée avec Procédures, Emailing devient une fonction transverse. · CDC V2
- **DEC-003** · 08/2026 · Viser un **MVP (≈ 80 % du besoin)** puis des versions successives ; Jeff signale toute demande trop coûteuse (« on s'en passe »). · Réunion 11/08
- **DEC-004** · 08/2026 · Rubriques Procédures et AG = chantiers ultérieurs ; dans la version opérationnelle, AG est reprise du POC **sans fonctionnalité nouvelle**. · Réunion 11/08, prompt §5.7

## Vocabulaire

- **DEC-010** · 08/2026 · « Adhérents » = l'ensemble ; « **Titulaires** » et « **Sympathisants** » pour les deux types. · Réunion 11/08
- **DEC-011** · 08/2026 · « Économie » devient « **Participation Association** » (€ et %). · Réunion 11/08
- **DEC-012** · 10/2026 · « Solde annuel » devient « **Solde budget** » ; « Prix demandé par adhérent » devient « **Prix par personne** » ; « Montant total subventionné » (mobil-home) devient « **Montant total** ». · Prompt opérationnel

## Tableau de bord

- **DEC-020** · 08/2026 · Anniversaires supprimés. · Réunion 11/08
- **DEC-021** · 10/2026 · Retirés aussi : taux de recouvrement, cotisations impayées, « Équipement club (cumul) », comparaison 2026 vs 2025. · Prompt opérationnel
- **DEC-022** · 08/2026 · Répartition des dépenses sur l'année en cours seulement ; détail au **survol** (infobulle). · Réunion 11/08

## Méthode de développement

- **DEC-030** · 08/2026 · Chaque version est un **delta ciblé** sur la précédente, jamais une réécriture ; les éléments inchangés ne sont pas touchés. · Jeff
- **DEC-031** · 10/2026 · Développement **par lots** ; à chaque lot : tests automatiques chez Claude, ZIP + assistant de mise à jour + LISEZMOI avec tests manuels ; Jeff valide avant le lot suivant. · Prompt §8
- **DEC-032** · 10/2026 · Libellés Chart.js en **UTF-8 direct**, jamais d'entités HTML. · Leçon POC
- **DEC-033** · 16/10/2026 · Le projet est versionné dans le **dépôt GitHub privé** `ordinovice-pixel/orga-brunants` (https://github.com/ordinovice-pixel/orga-brunants), branche `main`. Claude commite à chaque étape (lot, correction, mise à jour de la memory bank). Le `.gitignore` exclut le confidentiel (mots de passe, clés, **données personnelles réelles**), le lourd (vidéos, archives) et l'inutile (journaux, temporaires). · Jeff

## Architecture

- **DEC-040** · 10/2026 · Hébergement : **application web Google Apps Script** liée à un **classeur Google Sheets unique** (`Brunants_Donnees`, un onglet par table), sur le compte Google des Brunants. Le NAS sert de copie de sauvegarde (export .xlsx). · Prompt §2
- **DEC-041** · 10/2026 · Accès : exécution « en tant que l'utilisateur qui accède » ; seul le bureau a le classeur en éditeur. · Prompt §2
- **DEC-042** · 10/2026 · Liens entre tables **toujours par ID** (ADH-0001, ACT-2026-001, REC-2026-0001…). L'année d'un ID est fixée à la création, même si la date est corrigée ensuite. · Prompt §2, lot 3
- **DEC-043** · 10/2026 · Sauvegarde mensuelle automatique (copie + .xlsx), 12 conservées, bouton « Sauvegarder maintenant ». · Prompt §6 bis
- **DEC-044** · 10/2026 · Mode entraînement : bandeau visible, **tous les e-mails redirigés** vers l'adresse de test. · Prompt §6

## Règles de gestion

- **DEC-050** · 08/2026 · Participation de l'association plafonnée à **600 € par personne** pour une semaine ou une escapade. · Réunion 11/08 (à écrire dans la fiche activité)
- **DEC-051** · 10/2026 · Mobil-home : aide de **60 € par semaine, 2 fois au plus par titulaire et par an**, sympathisants exclus ; **plafond imposé par l'outil**, suivi par titulaire et semaines vendues **par camping** et au total. · Jeff, lot 4
- **DEC-052** · 10/2026 · Une location de mobil-home crée automatiquement la **dépense** (camping) et la **recette** (part de l'adhérent). · Jeff, lot 4
- **DEC-053** · 10/2026 · **Budget consommé = dépenses « Budgété »**, sans déduire les recettes. · Jeff, lot 3
- **DEC-054** · 10/2026 · Cocher « Payé » sur une échéance crée **une** recette ; décocher la supprime après confirmation ; « Rembourser » crée la dépense. · Prompt §5.4
- **DEC-055** · 10/2026 · Champs **Mode de paiement, Justificatif, Commentaire** ajoutés aux recettes et dépenses (repris du POC). · Jeff, lot 4
- **DEC-056** · 10/2026 · Désinscrit ou Décès → l'adhérent passe aux **archives** (date et motif demandés) ; bouton « Réinscrire ». · Prompt §5.2
- **DEC-057** · 10/2026 · Région calculée par le code postal : Île-de-France = 75, 77, 78, 91, 92, 93, 94, 95 ; sinon Province. · Prompt §10
- **DEC-058** · 10/2026 · « Subvention » = toute participation de l'association > 0 € (activité ou mobil-home). · Prompt §10
- **DEC-059** · 10/2026 · Rattachement à une année : adhérent actif à un moment de l'année ; recette / dépense = date de paiement ; activité = date de début. · Prompt §3.2

## Données personnelles

- **DEC-060** · 08/2026 · Participation Association par adhérent : analyse **globale**, réservée au bureau ; exemple neutre en présentation. · Réunion 11/08
- **DEC-061** · 08/2026 · Pas de création de compte Facebook sans passer par Guy et le président. · Réunion 11/08
