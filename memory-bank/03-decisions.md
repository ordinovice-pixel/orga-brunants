# 03 — Registre des décisions

Mise à jour : 02/11/2026

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
- **DEC-013** · 18/10/2026 · « Souhaite recevoir le Maillon » devient « **Souhaite recevoir le Maillon papier** » ; ajout de « **Recevoir toutes les communications par mail** » (entre Facebook et Maillon papier) ; ajout de « **Année entrée JMB** » et « **Date sortie JMB** ». · Jeff, lot 4b

## Tableau de bord et graphiques

- **DEC-020** · 08/2026 · Anniversaires supprimés. · Réunion 11/08
- **DEC-021** · 10/2026 · Retirés aussi : taux de recouvrement, cotisations impayées, « Équipement club (cumul) », comparaison 2026 vs 2025. · Prompt opérationnel
- ~~**DEC-022** · 08/2026 · Répartition des dépenses sur l'année en cours seulement ; détail au survol (infobulle).~~ → remplacée par DEC-023 pour l'affichage
- **DEC-023** · 18/10/2026 · Graphiques en secteurs (répartition des dépenses, répartition des activités) : **montants et % écrits sur le graphique** et dans la légende, sans survol. Listes et formulaires de Budget & Compta : en-têtes **vert clair pour les recettes**, **rouge clair pour les dépenses** ; graphique Recettes vs Dépenses avec les montants sur les barres (19/10). · Jeff, lots 4b et 4c
- **DEC-024** · 19/10/2026 · Tableau de bord (lot 5) : chiffres sur les graphiques comme dans Budget & Compta, au lieu du survol du cahier des charges. « Alertes en cours » **calculées** par l'outil : retards de paiement, activités presque complètes, dépassements de budget, cotisations supérieures, lignes à corriger, sauvegarde ancienne. Procédures, AG et NAS repris du POC tels quels, boutons inactifs. · Jeff (« ok pour tes 2 choix »)
- **DEC-083** · 19/10/2026 · Points du lot 5 validés : seuils des alertes (3 places ou moins = presque complète ; retard urgent au-delà de 30 jours ; sauvegarde signalée au-delà de 40 jours) ; calendrier limité aux dates d'échéances saisies dans la fiche activité ; participation par membre visible sur le tableau de bord par les utilisateurs de l'outil (le bureau) ; camembert des activités mesuré par défaut en nombre d'inscrits. · Jeff (« ok pour tout », ex-Q-60 à Q-63)

## Méthode de développement

- **DEC-030** · 08/2026 · Chaque version est un **delta ciblé** sur la précédente, jamais une réécriture ; les éléments inchangés ne sont pas touchés. · Jeff
- **DEC-031** · 10/2026 · Développement **par lots** ; à chaque lot : tests automatiques chez Claude, ZIP + assistant de mise à jour + LISEZMOI avec tests manuels ; Jeff valide avant le lot suivant. · Prompt §8
- **DEC-032** · 10/2026 · Libellés Chart.js en **UTF-8 direct**, jamais d'entités HTML. · Leçon POC
- **DEC-033** · 16/10/2026 · Le projet est versionné dans le **dépôt GitHub privé** `ordinovice-pixel/orga-brunants` (https://github.com/ordinovice-pixel/orga-brunants), branche `main`. Claude commite à chaque étape (lot, correction, mise à jour de la memory bank). Le `.gitignore` exclut le confidentiel (mots de passe, clés, **données personnelles réelles**), le lourd (vidéos, archives) et l'inutile (journaux, temporaires). · Jeff
- **DEC-090** · 02/11/2026 · Le dépôt contient **tout l'outil** (code lot 6c, simulateur et tests, versions de référence, livrables, guide) et une présentation complète (README) ; une **version vitrine anonymisée** est dans `docs/Presentation_vitrine.md`, réutilisable comme cas client OrdiNovice. Le développement assisté par l'IA est présenté dans une section dédiée. Les données de test inspirées du vrai fichier ont été rendues fictives avant le dépôt. · Jeff

## Architecture

- **DEC-040** · 10/2026 · Hébergement : **application web Google Apps Script** liée à un **classeur Google Sheets unique** (`Brunants_Donnees`, un onglet par table), sur le compte Google des Brunants. Le NAS sert de copie de sauvegarde (export .xlsx). · Prompt §2
- **DEC-041** · 10/2026 · Accès : exécution « en tant que l'utilisateur qui accède » ; seul le bureau a le classeur en éditeur. · Prompt §2
- **DEC-042** · 10/2026 · Liens entre tables **toujours par ID** (ADH-0001, ACT-2026-001, REC-2026-0001…). L'année d'un ID est fixée à la création, même si la date est corrigée ensuite. · Prompt §2, lot 3
- ~~**DEC-043** · 10/2026 · Sauvegarde mensuelle automatique (copie + .xlsx), 12 conservées, bouton « Sauvegarder maintenant ». · Prompt §6 bis~~ → remplacée par DEC-088 pour le nombre conservé
- **DEC-088** · 22/10/2026 · Sauvegarde mensuelle automatique (copie + .xlsx) et bouton « Sauvegarder maintenant » ; **24 sauvegardes conservées** (toutes origines : mensuelles, manuelles, avant import / réinitialisation / restauration). Un classeur resté à 12 passe à 24 au `setup` ; une autre valeur choisie à la main est conservée. · Jeff (ex-Q-64), lot 6c
- **DEC-044** · 10/2026 · Mode entraînement : bandeau visible, **tous les e-mails redirigés** vers l'adresse de test. · Prompt §6
- **DEC-045** · 18/10/2026 · Avant tout import réel : **test d'import dans une copie** de Brunants_Donnees (dossier `Outil_Brunants/Tests_import`), lancé depuis Administration ; le classeur de l'outil n'est jamais modifié par le test ; l'outil refuse de travailler dans une copie de test. Les 0 initiaux perdus (codes postaux, téléphones) sont complétés à l'import (lot 4c). Depuis le lot 6, le test se fait avec l'**assistant d'import** (mode « Tester dans une copie ») : le fichier est choisi sur le PC, plus besoin de le déposer sur le Drive. · Jeff, lots 4b, 4c et 6
- **DEC-084** · 19/10/2026 · **Assistant d'import** (lot 6) : tables Adhérents, Activités, Prestataires, Catégories ; fichier CSV ou Excel lu dans le navigateur (SheetJS depuis cdnjs) ; correspondance des colonnes proposée d'après leur nom ; contrôle sans écriture (Valide / À corriger / Rejetée, rapport CSV) ; doublons dans le fichier : seule la 2de occurrence est rejetée ; trois modes : **tester dans une copie**, **ajouter**, **remplacer** (vide aussi les tables dépendantes pour ne laisser aucun lien cassé ; « Autre » des prestataires protégé) ; sauvegarde complète avant ajouter / remplacer ; ID du fichier gardé s'il est au bon format et libre. · Prompt §6 / §7, Claude ; tests réussis par Jeff (22/10)
- **DEC-085** · 19/10/2026 · **Restauration** depuis Administration : une sauvegarde du dossier `Sauvegardes` (et seulement de ce dossier) est recopiée dans le classeur de l'outil, **toutes les tables de données à la fois**, colonnes reprises par leur titre ; paramètres et journal conservés ; sauvegarde de l'état actuel juste avant ; sauvegarde incomplète refusée. Pour une petite erreur (une fiche effacée), on recopie la ligne depuis la sauvegarde ouverte dans Google Sheets au lieu de restaurer. Procédure de secours (outil inaccessible) : Corbeille Drive, sinon copie de la dernière sauvegarde + `setup` + nouveau déploiement. · Prompt §6 bis, Claude ; validé par Jeff le 22/10 (choix 1, ex-Q-65)

## Règles de gestion

- **DEC-050** · 08/2026 · Participation de l'association plafonnée à **600 € par personne** pour une semaine ou une escapade. · Réunion 11/08 (à écrire dans la fiche activité)
- **DEC-051** · 10/2026 · Mobil-home : aide de **60 € par semaine, 2 fois au plus par titulaire et par an**, sympathisants exclus ; **plafond imposé par l'outil**, suivi par titulaire et semaines vendues **par camping** et au total. · Jeff, lot 4
- **DEC-052** · 10/2026 · Une location de mobil-home crée automatiquement la **dépense** (camping) et la **recette** (part de l'adhérent), en **1.2 Villégiature en mobil-home** depuis le lot 6b. · Jeff, lot 4
- **DEC-053** · 10/2026 · **Budget consommé = dépenses « Budgété »**, sans déduire les recettes. · Jeff, lot 3
- ~~**DEC-054** · 10/2026 · Cocher « Payé » sur une échéance crée **une** recette ; décocher la supprime après confirmation ; « Rembourser » crée la dépense.~~ → remplacée par DEC-077 pour le remboursement
- **DEC-055** · 10/2026 · Champs **Mode de paiement, Justificatif, Commentaire** ajoutés aux recettes et dépenses (repris du POC). · Jeff, lot 4
- **DEC-056** · 10/2026 · Désinscrit ou Décès → l'adhérent passe aux **archives** (date et motif demandés) ; bouton « Réinscrire ». · Prompt §5.2
- **DEC-057** · 10/2026 · Région calculée par le code postal : Île-de-France = 75, 77, 78, 91, 92, 93, 94, 95 ; sinon Province. · Prompt §10
- **DEC-058** · 10/2026 · « Subvention » = toute participation de l'association > 0 € (activité ou mobil-home). · Prompt §10
- **DEC-059** · 10/2026 · Rattachement à une année : adhérent actif à un moment de l'année ; recette / dépense = date de paiement ; activité = date de début. · Prompt §3.2
- **DEC-077** · 19/10/2026 · « Rembourser » une échéance **déduit le remboursement des recettes** : recette négative, origine « Remboursement », liée à l'échéance ; aucune dépense. Cocher « Payé » crée toujours **une** recette ; décocher la supprime après confirmation. · Jeff (Q-01), lot 5
- **DEC-078** · 19/10/2026 · Les 2 aides mobil-home vont aux **2 premières semaines du calendrier** de l'année, pas aux 2 premières saisies. · Jeff (Q-02)
- **DEC-079** · 19/10/2026 · Dépense et recette d'une location de mobil-home datées du **jour de la saisie par défaut**, date modifiable dans le formulaire. · Jeff (Q-03), lot 5
- **DEC-080** · 19/10/2026 · **Dates d'échéances personnalisables** dans la fiche activité (une case par échéance ; une date peut être après l'activité) ; option pour les appliquer aux échéances non payées des inscrits ; modification d'une échéance depuis le suivi. · Jeff (Q-04), lot 5
- **DEC-081** · 19/10/2026 · Prix modifié après des inscriptions : échéances existantes inchangées (Q-05) ; fiche d'inscription pré-remplie avec les inscrits du moment (Q-07). · Jeff
- **DEC-082** · 19/10/2026 · Activités et comptes réels : **pas encore**. On garde les activités et les comptes fictifs. · Jeff
- **DEC-086** · 19/10/2026 · Justificatif d'une recette ou d'une dépense : si le champ contient un lien (Drive…), les listes Dépenses et Recettes (et les factures de la fiche prestataire) affichent **« 📎 Ouvrir »**, qui ouvre le fichier dans un nouvel onglet ; un lien sans « https:// » est complété ; un simple n° de facture reste en texte. · Jeff, lot 6
- **DEC-087** · 22/10/2026 · **Catégories du bureau** (dossier budgétaire V5) : 7 catégories du document (1. Séjours et villégiatures … 7. Fonctionnement association) + **8. Subvention et Adhésions** (8.1 Subvention, 8.2 Adhésion, **8.3 Dons**). Les recettes liées à une activité, un séjour, une fête, un atelier… vont dans **les mêmes catégories et sous-catégories** que les dépenses (types « Les deux ») ; la catégorie 8 est « recettes seulement » (pas de budget de dépenses, absente des formulaires de dépense et de la fiche activité). **Numéros gardés** dans les noms (ordre des listes). « Randonnées » (notée 3.3 sous la catégorie 2) renumérotée **2.3**. Champ **« Ce qu'elle recouvre »** (descriptif du document) affiché sous la sous-catégorie dans les formulaires dépense / recette / activité, modifiable dans Administration ; descriptifs 8.1 à 8.3 rédigés par Claude (validés) ; « maintenance informatique » seulement en **7.7** (retirée du descriptif de 7.2). Lot 6b testé par Jeff le 22/10. Ancienne Q-10 close. · Jeff, lots 6b et 6c

## Import des vraies données (fichier « base de données Brunants MAJ 2025-06-16-copie », onglet « Base de données »)

- **DEC-070** · 18/10/2026 · Une **lettre** dans « Adhérent » (R, R1, V, D, E, E1, S, C — **V compris**) → Type **Titulaire** + libellé de la lettre en commentaire ; « Sympa. » rempli → **Sympathisant**. · Jeff
- **DEC-071** · 18/10/2026 · Date d'entrée Brunants absente → **date du conjoint**, sinon **01/01/2000 provisoire** (mention en commentaire, à compléter). · Jeff
- **DEC-072** · 18/10/2026 · **Anciens adhérents** (NonAdhérent / NonSympa.) importés **en archives avec toutes leurs coordonnées** (Désinscrit, date de fin 31/12/2024 provisoire, motif « Autre ») pour pouvoir les réinscrire. · Jeff (date provisoire : choix de Claude)
- **DEC-073** · 18/10/2026 · **Décédés** importés en archives (Décès + date) ; décédés « X » = Titulaires. · Jeff
- **DEC-074** · 18/10/2026 · Noms composés (« NOM1/NOM2 ») **gardés tels quels** ; couleurs de ligne ignorées. · Jeff
- **DEC-075** · 18/10/2026 · Couples : même nom et même adresse, ou nom du conjoint écrit dans le nom ; **reliés même si l'adresse diffère**. · Jeff
- **DEC-076** · 18/10/2026 · « Nbre Colis Brunant », rupture conventionnelle, admission exceptionnelle, n° de l'ancien fichier → **commentaire** ; lettre **S → cotisation 0 €** ; e-mails : virgule → point ; textes des colonnes téléphone → commentaire. · Jeff
- **DEC-089** · 22/10/2026 · **Vrais adhérents importés dès maintenant** (avant la phase de test), en restant en **mode entraînement**, pour vérifier l'import et compléter les fiches. Import par l'assistant, mode « Remplacer », après installation du lot 6c. Protection : outil marqué « adhérents réels » (propriété ADHERENTS_REELS + présence d'e-mails réels) ; la **réinitialisation et `setup` ne touchent plus aux adhérents** et ne rechargent ni inscriptions, ni échéances, ni locations, ni lignes liées à un adhérent ; alerte si « Remplacer » est relancé sur les adhérents ; filtre **« À compléter »** dans la liste des adhérents. Activités et comptes restent fictifs jusqu'au passage complet au réel (après la phase de test). · Jeff (choix 2, ex-Q-66)

## Données personnelles

- **DEC-060** · 08/2026 · Participation Association par adhérent : analyse **globale**, réservée au bureau ; exemple neutre en présentation. · Réunion 11/08
- **DEC-061** · 08/2026 · Pas de création de compte Facebook sans passer par Guy et le président. · Réunion 11/08
- **DEC-062** · 18/10/2026 · Les fichiers contenant de vraies données (fichier source, CSV d'import, rapport HTML) restent sur le PC de Jeff et le Drive des Brunants : jamais publiés, jamais dans le ZIP ni dans le dépôt GitHub. Depuis DEC-089, le classeur de l'outil et ses sauvegardes contiennent aussi de vraies données : partage limité au bureau. · Claude, conforme à DEC-033
