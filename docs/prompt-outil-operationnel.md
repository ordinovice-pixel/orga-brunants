# Prompt — Outil de gestion « Les Brunants » : passage du POC à la version opérationnelle d'entraînement

> **Pièce à joindre à ce prompt :** le fichier HTML du POC (dernière version). Toutes les modifications à apporter sont décrites ci-dessous ; aucun autre document n'est nécessaire.

---

## 1. Ton rôle et le contexte

Tu es développeur full-stack Google Workspace (Apps Script, HTML/CSS/JavaScript, Google Sheets). Tu travailles avec Jeff (OrdiNovice), chef de projet de l'outil de gestion de l'association **Les Brunants** (environ 230 adhérents : titulaires et sympathisants).

Le POC joint a été validé par le bureau (président, trésorière, coordinateur). Il est fait de pages statiques avec des données fictives écrites en dur dans le code. Il faut maintenant le transformer en **outil réellement utilisable**.

**Objectif de cette version : l'entraînement.** Les membres du bureau doivent pouvoir saisir, modifier et supprimer des informations pour apprendre à se servir de l'outil. Ils doivent aussi pouvoir vérifier que chaque indicateur, graphique, liste et automatisation fonctionne et se met à jour **en temps réel**.

**Principes non négociables :**

1. **Simplicité.** L'outil doit être simple à utiliser et facile à comprendre, pour qu'un opérateur puisse être remplacé rapidement par un autre. Pas d'« usine à gaz ».
2. **Une seule saisie.** Une information est saisie une seule fois. Les automatisations la répercutent partout ailleurs (paiement → recette, remboursement → dépense, etc.).
3. **Tables accessibles à la main.** Toutes les données sont stockées dans Google Sheets, sur le Drive des Brunants. Elles restent lisibles, complétables et modifiables directement dans les feuilles. L'outil doit continuer à fonctionner après une modification manuelle.
4. **Fidélité au POC.** Garde la structure, les rubriques, le logo, la charte graphique et les contours des encarts, graphiques et tableaux tels qu'ils sont dans le POC. Applique uniquement les changements décrits ici.

---

## 2. Architecture technique imposée

| Élément | Choix |
|---|---|
| Hébergement | Compte Google dédié des Brunants (Drive), dans un dossier `Outil_Brunants/` |
| Données | **Un seul classeur Google Sheets** `Brunants_Donnees`, avec **un onglet par table** (voir §4) |
| Application | **Application web Google Apps Script** (HtmlService), rattachée au classeur |
| Front | HTML / CSS / JavaScript « vanilla » + Chart.js (CDN cdnjs), sur une seule page à onglets (une rubrique par onglet) |
| Échanges | `google.script.run` pour lire et écrire. `LockService` pour toute écriture, afin d'éviter les conflits entre deux utilisateurs simultanés |
| Accès | Déploiement « Exécuter en tant que : **l'utilisateur qui accède** » et « Accès : **toute personne disposant d'un compte Google** ». Le classeur est partagé en **éditeur** avec les seuls membres du bureau. Une personne sans accès au classeur ne peut donc rien voir |
| E-mails | `MailApp`, en respectant le quota d'envoi du compte (environ 100 destinataires par jour pour un compte gratuit). Affiche un message clair si le quota est atteint |

**Exigences techniques :**

- **Fonction `setup()`.** Elle crée en une fois le classeur, tous les onglets, les en-têtes, les validations de données (listes déroulantes), les formats (dates, euros) et la feuille `Parametres`. Elle charge ensuite le jeu de données fictives. Elle doit pouvoir être relancée sans dupliquer les données.
- **Identifiants uniques et lisibles :** `ADH-0001`, `ACT-2026-001`, `INS-…`, `ECH-…`, `REC-2026-0001`, `DEP-2026-0001`, `PRE-001`.
  - L'**ID adhérent** est la clé commune à toutes les tables.
  - Les liens entre tables se font **toujours par ID**, jamais par nom.
- **Feuilles lisibles à la main :**
  - En-têtes en français, en clair, avec la première ligne figée.
  - Dates au format JJ/MM/AAAA et montants en nombres (format €).
  - Pas de formules indispensables dans les feuilles : les calculs sont faits par l'application.
- **Robustesse aux modifications manuelles :**
  - L'application relit les feuilles à chaque chargement et propose un bouton **« Actualiser »**.
  - Une ligne incomplète ou mal saisie à la main ne doit pas faire planter l'outil. Elle est ignorée, et un avertissement est affiché.
- **Code découpé** en fichiers clairs (`Code.gs`, `Donnees.gs`, `Automatisations.gs`, `Import.gs`, `Index.html`, `Styles.html`, un fichier `Js_<rubrique>.html` par rubrique) et commenté en français.

---

## 3. Ergonomie et charte graphique

### 3.1 Charte (inchangée par rapport au POC)

- Fond clair uniquement.
- Bleu principal `#1A5276`, bleu secondaire `#2E86C1`, accent ambre `#F39C12`.
- Police Calibri, 14 px minimum.
- Logo (pommier, soleil et bandeau jaune « Les Brunants ») en en-tête, repris du POC.
- Affichage responsive.

### 3.2 Sélecteur d'année global

- **Tout en haut de l'outil**, visible sur toutes les rubriques.
- Il filtre toutes les rubriques, tous les indicateurs, graphiques et listes sur l'année choisie : 2026 n'affiche que les données de 2026, 2027 que celles de 2027.
- Les années proposées sont déduites des données, plus l'année en cours. L'année en cours est sélectionnée par défaut.
- **Règles d'appartenance à une année :**
  - **Adhérent :** compté dans l'année N s'il était actif à un moment de N, c'est-à-dire inscrit au plus tard le 31/12/N, et sans date de fin ou avec une date de fin au plus tôt le 01/01/N.
  - **Recette ou dépense :** rattachée à l'année de sa **date de paiement ou d'encaissement** (année civile).
  - **Activité :** rattachée à l'année de sa date de début.
- Les titres d'indicateurs portent l'année sélectionnée, par exemple « Effectif total 2026 » ou « Âge moyen 2026 ».

### 3.3 Trois zones par rubrique, toujours dans le même ordre et avec le même code couleur

| Ordre | Zone | Fond pastel | Contenu |
|---|---|---|---|
| 1 | **Indicateurs** | Bleu ciel `#E3F2FD` | Cartes KPI et graphiques |
| 2 | **Saisie** | Vert clair `#E8F5E9` | Formulaires d'ajout et de modification |
| 3 | **Listes et tableaux** | Jaune clair `#FFF8E1` | Tables de consultation |

- Chaque zone porte un petit titre (« Indicateurs », « Saisie », « Listes »).
- Les contours des encarts, graphiques et tableaux restent **tels qu'ils sont dans le POC**.

### 3.4 Listes : recherche, tri et filtres partout

Chaque liste ou tableau doit avoir :

- une **recherche** plein texte (nom, prénom, libellé…) ;
- des **filtres** pertinents pour la rubrique (statut, type, catégorie, activité, payé ou non, budgété ou hors budget…) ;
- un **tri en cliquant sur l'en-tête** de colonne (croissant ou décroissant) et un **filtre en tête de colonne** ;
- sur chaque ligne, des boutons **Modifier** (ouvre la fiche dans la zone Saisie) et **Supprimer** (avec confirmation).

### 3.5 Retours utilisateur

- Après chaque enregistrement, un message de confirmation clair, par exemple « Recette REC-2026-0042 créée automatiquement ».
- Des contrôles de saisie avec des messages en français : champs obligatoires, format e-mail, code postal, montants positifs.

---

## 4. Modèle de données (onglets du classeur)

| Onglet | Contenu principal |
|---|---|
| `Adherents` | ID, civilité, sexe (H/F), nom, prénom, date de naissance, type (Titulaire/Sympathisant), adresse, **complément d'adresse**, code postal, ville, région (calculée : Île-de-France / Province), mobile, téléphone fixe, **e-mail principal**, **e-mail secondaire**, date d'inscription, cotisation (montant, 15 € par défaut, modifiable pour un don supérieur), abonné Facebook (oui/non), **souhaite recevoir le Maillon (oui/non)**, rattaché à (ID conjoint, facultatif), ne plus rien envoyer (oui/non), **décès (oui/non) + date**, désinscrit (oui/non), date de fin, motif de fin, **commentaire** |
| `Activites` | ID, nom, catégorie, sous-catégorie, organisateur, dates de début et de fin, lieu, descriptif, nombre maximum de participants, budget prévu, **prix par personne**, coût réel par personne, participation de l'association par personne (€ et %), **nombre d'échéances (1 à 12)**, notification par mail (oui par défaut), statut |
| `Inscriptions` | ID, ID activité, ID adhérent, date d'inscription, statut (Inscrit/Désinscrit), montant dû |
| `Echeances` | ID, ID inscription, numéro d'échéance, montant, date prévue, **payé (oui/non)**, date de paiement, ID de la recette générée, remboursé (oui/non), ID de la dépense générée |
| `Recettes` | ID, date d'encaissement, libellé, montant, catégorie, sous-catégorie, ID activité (facultatif), ID adhérent (facultatif), **budgété / hors budget**, origine (Saisie manuelle / Automatique), ID de l'échéance source |
| `Depenses` | ID, date de paiement, libellé, montant, catégorie, sous-catégorie, **ID prestataire** (liste + « Autre »), ID activité (facultatif), **budgété / hors budget**, origine (Saisie manuelle / Automatique / Remboursement), ID source |
| `Categories` | Catégorie, sous-catégorie, type (Recette/Dépense/Les deux) |
| `Budgets` | Année, catégorie, budget prévisionnel (€), modifiable |
| `Prestataires` | ID, raison sociale, activité, adresse complète, contact, téléphone, e-mail, site web, date de début de la relation (sert à calculer l'ancienneté), commentaire. Une entrée **« Autre »** existe en permanence |
| `MobilHome` | ID, ID adhérent, année, semaine (date de début), coût de la location, aide de l'association (2 × 60 € maximum par titulaire et par an), montant payé par l'adhérent |
| `Parametres` | Mode entraînement (oui/non), e-mail de test, montant de l'aide mobil-home (60 €), nombre d'aides par an (2), départements d'Île-de-France (75, 77, 78, 91, 92, 93, 94, 95), nombre de sauvegardes mensuelles conservées (12) |
| `Journal` | Date et heure, utilisateur, action (création, modification, suppression, automatisation), table, ID, résumé |

**Les 8 catégories budgétaires** sont : Villégiatures · Grands Événements · Sorties / Visites · Activités / Animations · Gestion / Communication · Formation / Numérique · Social · **Divers**. Les sous-catégories sont fictives pour l'instant ; les vraies seront fournies plus tard.

**Champs supprimés par rapport au POC :** Mobile 2, « Souhaite s'inscrire à l'AG », NAS.

---

## 5. Spécifications par rubrique

L'ordre des rubriques est celui du POC, avec **Prestataires** insérée entre Activités et Calendrier.

### 5.1 Tableau de bord

**Indicateurs :**

- **Effectif total {année}** : il inclut les nouveaux arrivants de l'année. Il est détaillé en titulaires et sympathisants (nombre et %).
- **Solde budget** (remplace « Solde annuel ») : budget prévisionnel total moins budget consommé, en € et en %. Il est calculé sur les paiements et encaissements de l'année civile sélectionnée.
- Nombre d'activités réalisées et restantes dans l'année, avec la chronologie des prochaines activités.
- **Encart « Recettes vs Dépenses »** : évolution mensuelle de l'année sélectionnée, **sans** la comparaison « 2026 vs 2025 ».
- **Répartition des dépenses par catégorie** : le détail s'affiche au survol (infobulle).

**À retirer :** taux de recouvrement, encart des cotisations impayées, « Équipement club (cumul) », « Anniversaire ce mois ».

### 5.2 Adhérents

**Indicateurs :**

- Effectif total {année} (nouveaux arrivants inclus), titulaires et sympathisants (nombre et %).
- Ratio hommes / femmes (nombre et %).
- Ratio Île-de-France / province (nombre et %).
- Âge moyen {année} et ancienneté moyenne dans l'association (en années).
- Répartition par âge, avec les tranches **80–85 ans** et **plus de 85 ans**.
- Nouveaux arrivants de l'année.
- **Décès de l'année**.
- Participants et non-participants aux activités, avec la répartition géographique (Île-de-France / province) des non-participants.

**Saisie :**

- Fiche complète selon le §4 : complément d'adresse, e-mail principal et secondaire, commentaire, case « Décès » avec sa date.
- La région est calculée automatiquement à partir du code postal.
- Cases à cocher « Abonné à Facebook » et « Souhaite recevoir le Maillon », comme dans le POC.

**Listes :**

- **Liste des adhérents.** Colonnes : nom, prénom, type, **adresse postale complète**, **âge**, téléphone, e-mail, cotisation, Participation Association (€), **désinscrit**.
  - L'ancienneté est retirée de cette liste.
  - La liste a le tri et les filtres en tête de colonne.
- **Désinscription.** Cocher « Désinscrit » ou « Décès » fait passer le membre dans **« Anciens adhérents (archives) »**. La date et le motif de fin sont demandés à ce moment-là.
- **Archives.** Un bouton **« Réinscrire »** permet de remettre un ancien adhérent dans la liste active.
- **Historique d'un adhérent.** Activités suivies, avec pour chacune la **Participation Association en € et en %**.
  - Exemple : activité à 100 €, l'adhérent paye 30 € → 70 € et 70 %.
  - Un cumul est affiché.

### 5.3 Budget & Compta

**Indicateurs :**

- Solde budget (identique au Tableau de bord).
- Pour **chacune des 8 catégories** : budget prévisionnel, dépenses réalisées en € et en % du budget.
- Part des dépenses « hors budget ».

**Saisie :**

- Formulaires Recette et Dépense côte à côte, comme dans le POC.
- Chaque formulaire a un champ **« Budgété / Hors budget »**.
- La dépense propose la **liste des prestataires** (avec « Autre ») et un champ facultatif « Activité liée ».
- Un formulaire **« Budgets prévisionnels »** permet de saisir et modifier le budget de chaque catégorie pour l'année sélectionnée.

**Listes :**

- Recettes et dépenses, avec des filtres par catégorie, activité, origine (manuelle ou automatique) et budgété / hors budget.
- **Les dépenses liées aux activités apparaissent dans la liste des dépenses** et peuvent être filtrées par activité.

### 5.4 Activités

**À retirer :** taux d'inscription moyen, champ « Récurrence ».
**À renommer :** « Prix demandé par adhérent » devient **« Prix par personne »**.

**Fiche activité :**

- **Nombre d'échéances libre** : de 1 à 12.
- **Notification par mail** cochée par défaut.

**Inscriptions et paiements, dans la fiche activité :**

1. **Inscrire ou désinscrire un membre.** Une liste déroulante avec recherche permet de choisir parmi les adhérents actifs. Le nombre maximum de participants est contrôlé.
2. **Créer les cases de paiement.** À l'inscription, l'outil crée automatiquement **autant de cases de paiement que d'échéances**, avec le montant de chacune.
   - Exemple : un paiement en 3 fois crée 3 cases de paiement.
3. **Valider un paiement.** Quand on coche **« Payé »** et qu'on saisit la date, l'outil **crée automatiquement la recette** dans Budget & Compta, avec le nom du membre, le montant de l'échéance, la date de paiement, l'activité et la catégorie.
   - **Aucune double saisie** n'est possible.
   - Décocher « Payé » supprime la recette générée, après confirmation.
4. **Rembourser.** Le bouton **« Rembourser »**, sur une échéance payée, **crée automatiquement la dépense** correspondante dans Budget & Compta.
5. **Vue de suivi par participant.** Pour chaque participant : payé ou non, combien, quand, et ce qui reste dû.

**Mobil-home :**

- Seuls les **titulaires** peuvent bénéficier des aides, dans la limite de **2 aides de 60 € par an**.
- Indicateurs en temps réel :
  - nombre total de semaines vendues ;
  - **« Montant total »** (renommé depuis « Montant total subventionné ») : coût global de l'activité ;
  - montant total payé par l'association.

**Subventions :** indicateur du pourcentage d'adhérents ayant bénéficié d'une participation de l'association, détaillé en Île-de-France / province.

**Notification par mail :** à la création d'une activité, si la case est cochée, l'outil envoie un mail aux adhérents concernés.

### 5.5 Génération de la fiche d'inscription (rubrique Activités)

Un bouton **« Générer la fiche d'inscription »** produit, pour l'activité sélectionnée, un document imprimable à remettre à l'organisateur. Il est généré en Google Doc dans `Outil_Brunants/Fiches_inscription/`, avec un export PDF.

**En-tête :**

- logo et **nom de l'activité** en titre ;
- descriptif, date(s), lieu, organisateur ;
- nombre maximum de participants ;
- budget prévu ;
- participation demandée par personne (€) ;
- somme subventionnée par l'association par personne (€).

**Tableau à remplir :** une ligne par participant (autant de lignes que le maximum de participants), avec les colonnes N°, Nom, Prénom, E-mail, Téléphone, **Payé (case à cocher)**, **Date de paiement**. Si l'activité a plusieurs échéances, une colonne Payé et une colonne Date pour chaque échéance.

### 5.6 Prestataires (nouvelle rubrique, entre Activités et Calendrier)

- **Indicateurs :**
  - nombre de prestataires ;
  - tableau de suivi par prestataire : **cumul des factures en €** et **pourcentage du total des factures**, tous prestataires confondus, pour l'année sélectionnée ;
  - graphique des 10 principaux prestataires.
- **Saisie :** fiche prestataire selon le §4.
- **Listes :**
  - liste filtrable des prestataires ;
  - un clic sur un prestataire affiche ses factures, c'est-à-dire les dépenses qui lui sont liées.

### 5.7 Calendrier, Procédures, AG, Classement NAS

> **AG :** la rubrique n'est pas encore définie par le bureau. Reprends-la telle qu'elle est dans le POC, sans aucune fonctionnalité nouvelle.

- Conserver le contenu du POC et appliquer le **découpage en 3 zones et le code couleur**.
- Le Calendrier affiche automatiquement les activités de la table `Activites` pour l'année sélectionnée.
- Aucune autre évolution dans cette version.

---

## 6. Données d'entraînement et réinitialisation

- **Jeu fictif réaliste**, cohérent sur 2025 et 2026 :
  - environ 230 adhérents, avec un mélange de titulaires et de sympathisants, d'hommes et de femmes, d'Île-de-France et de province, de tous âges, dont quelques plus de 80 ans, quelques décès et quelques désinscrits ;
  - environ 15 activités, dont certaines avec plusieurs échéances, certaines payées partiellement et un remboursement ;
  - des recettes et dépenses dans les 8 catégories, dont certaines hors budget ;
  - environ 12 prestataires ;
  - environ 20 locations de mobil-home ;
  - des budgets prévisionnels par catégorie.
- **Bandeau visible « MODE ENTRAÎNEMENT »** quand le paramètre est activé.
- En mode entraînement, **tous les e-mails sont redirigés** vers l'adresse de test définie dans `Parametres`, jamais vers les vrais adhérents.
- **Bouton « Réinitialiser les données d'entraînement »**, avec une double confirmation. Il vide les tables et recharge le jeu fictif. Il est désactivé quand le mode entraînement est désactivé.

---

## 6 bis. Sauvegarde automatique mensuelle

- Un **déclencheur Apps Script mensuel** (le 1er de chaque mois, la nuit) est créé par `setup()`.
- À chaque déclenchement, l'outil :
  - fait une **copie complète du classeur** `Brunants_Donnees`, nommée `Sauvegarde_Brunants_AAAA-MM-JJ`, dans le dossier `Outil_Brunants/Sauvegardes/` ;
  - y ajoute un **export .xlsx** du même classeur, pour pouvoir le recopier sur le NAS ou une clé USB ;
  - conserve les **12 dernières sauvegardes** et supprime automatiquement les plus anciennes ;
  - inscrit l'opération dans le `Journal`.
- Un bouton **« Sauvegarder maintenant »** permet de lancer une sauvegarde à la demande, par exemple avant un import.
- Le guide d'installation explique comment **restaurer** une sauvegarde.

---

## 7. Import des vraies données

Les vraies données (adhérents, activités, prestataires, catégories et sous-catégories) seront fournies plus tard. La base adhérents compte plus de 230 lignes et une vingtaine de colonnes, qui ne sont pas toutes utiles.

**Assistant d'import dans l'outil**, pour les tables Adherents, Activites, Prestataires et Categories :

1. **Chargement** d'un fichier CSV ou XLSX (lecture dans le navigateur avec SheetJS, CDN cdnjs).
2. **Correspondance des colonnes.** Pour chaque champ de l'outil, une liste déroulante propose les colonnes du fichier, avec une suggestion automatique par similarité de nom. Les colonnes non utilisées sont ignorées.
3. **Aperçu et contrôle** avant écriture :
   - formats de date, codes postaux et e-mails ;
   - champs obligatoires manquants ;
   - **doublons** (même nom, même prénom et même date de naissance) ;
   - valeurs hors liste (type, cases oui/non…).

   Le résultat affiche les lignes valides, les lignes à corriger et les lignes rejetées.
4. **Import.** Les ID manquants sont générés, l'import est journalisé et un rapport est téléchargeable (CSV des lignes rejetées avec le motif).
5. **Options :** « Remplacer les données fictives » ou « Ajouter aux données existantes ».

**Fourni avec l'outil :**

- un **modèle d'import** (`Modele_import_adherents.xlsx`) ;
- un bouton **« Exporter en CSV »** sur chaque liste.

---

## 8. Livrables et méthode de travail

**Travaille par lots.** À la fin de chaque lot, donne la liste des tests à faire, puis attends ma validation avant de passer au lot suivant.

| Lot | Contenu |
|---|---|
| 1 | Socle : `setup()`, classeur et onglets, navigation, sélecteur d'année, mise en page 3 zones, recherche/tri/filtres génériques, journal, mode entraînement, sauvegarde automatique mensuelle |
| 2 | Adhérents (fiche, liste, archives, désinscription/réinscription, indicateurs) |
| 3 | Budget & Compta (recettes, dépenses, budgets par catégorie, solde budget) et Prestataires |
| 4 | Activités : inscriptions, échéances, recettes et remboursements automatiques, mobil-home, subventions, fiche d'inscription, notification mail |
| 5 | Tableau de bord, Calendrier, rubriques reprises du POC |
| 6 | Données fictives, réinitialisation, assistant d'import, exports CSV, test de la sauvegarde et procédure de restauration |
| 7 | Documentation |

**Documentation à livrer :**

- **Guide d'installation pas à pas pour un non-développeur** : création du classeur, copier-coller des fichiers dans l'éditeur Apps Script, exécution de `setup()`, autorisations, déploiement, partage avec le bureau, mise à jour d'une nouvelle version.
- **Guide de prise en main** d'une page par rubrique, avec **10 exercices d'entraînement**. Exemples : inscrire un adhérent, l'inscrire à une sortie payée en 3 fois, valider 2 échéances, rembourser la 3e, vérifier la recette et la dépense générées, retrouver l'effet sur les indicateurs.
- **Description des tables** : chaque onglet, chaque colonne, les valeurs autorisées, et ce qu'on peut ou ne doit pas modifier à la main.

**Règles de développement :**

- Garde le code du POC chaque fois que c'est possible : mise en page, styles, graphiques.
- Utilise des caractères UTF-8 directs (é, è, à…) dans les libellés Chart.js, **jamais d'entités HTML**, qui cassent l'affichage des infobulles.
- Si une demande est techniquement trop coûteuse ou risquée, dis-le et propose une alternative simple plutôt que de la contourner en silence.

---

## 9. Critères d'acceptation (à vérifier avant de livrer chaque lot)

- [ ] Changer l'année en haut met à jour **toutes** les rubriques.
- [ ] Ajouter, modifier ou supprimer un adhérent met à jour instantanément les indicateurs et les listes concernés.
- [ ] Une modification faite directement dans la feuille Google Sheets apparaît après « Actualiser », sans erreur.
- [ ] Inscrire un membre à une activité en 3 échéances crée 3 cases de paiement.
- [ ] Cocher « Payé » crée **une seule** recette, et la décocher la supprime.
- [ ] « Rembourser » crée la dépense correspondante. Le solde budget et les indicateurs se mettent à jour.
- [ ] Désinscrire un membre ou cocher « Décès » le fait passer dans les archives. « Réinscrire » le fait revenir.
- [ ] Les indicateurs Participation Association (€ et %), mobil-home, subventions et prestataires sont justes sur un cas calculé à la main.
- [ ] La fiche d'inscription générée contient toutes les informations demandées.
- [ ] En mode entraînement, aucun e-mail n'est envoyé ailleurs qu'à l'adresse de test.
- [ ] La réinitialisation remet l'outil dans son état initial.
- [ ] Le lancement manuel de la sauvegarde crée bien une copie datée et un export .xlsx dans `Outil_Brunants/Sauvegardes/`.
- [ ] L'import d'un fichier test de 230 lignes, contenant des colonnes inutiles et 5 erreurs volontaires, produit un rapport juste.
- [ ] Chaque liste a la recherche, le tri, les filtres en tête de colonne et les boutons Modifier et Supprimer.

---

## 10. Hypothèses retenues (à confirmer, ne bloquent pas le développement)

1. **Région :** déduite du département du code postal (Île-de-France = 75, 77, 78, 91, 92, 93, 94, 95).
2. **Ancienneté d'un prestataire :** durée depuis le début de la relation avec l'association.
3. **« Subvention » :** toute participation de l'association supérieure à 0 € à une activité ou à un mobil-home.
4. **Sous-catégories, prestataires réels, suivi « intendance », droits d'accès du CA :** en attente des informations du bureau. Prévois la structure sans les inventer en dur.
