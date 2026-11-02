# Outil de gestion « Les Brunants » — Lot 1 : le socle

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `Assistant_installation.html` | Page d'aide à l'étape 4 : un bouton « Copier » par fichier |
| `apps_script/` | Les 20 fichiers à copier dans le projet Apps Script |
| `Apercu_local_Brunants.html` | Aperçu hors ligne : le vrai code tourne dans le navigateur avec un simulateur (rien n'est enregistré) |
| `outils/` | Simulateur Apps Script, tests automatiques et construction de l'aperçu (ne pas copier dans Apps Script) |

### Fichiers Apps Script

| Fichier | Contenu |
|---|---|
| `appsscript.json` | Manifeste : fuseau Europe/Paris, V8, application web « utilisateur qui accède » |
| `Code.gs` | `doGet()`, `include()`, `setup()`, menu « Brunants » dans le classeur |
| `Donnees.gs` | Description des 12 onglets, lecture robuste, écriture sous verrou, journal, paramètres |
| `DonneesFictives.gs` | Données de départ : 42 catégories / sous-catégories, budgets 2025-2026 |
| `Automatisations.gs` | Sauvegarde mensuelle et manuelle, e-mails (redirection en mode entraînement, quota) |
| `Import.gs` | Réservé à l'assistant d'import (lot 6) |
| `Index.html`, `Styles.html`, `Logo.html` | Page unique à onglets, charte du POC, logo |
| `Js_Commun.html` | Socle de l'interface : année, navigation, listes génériques, contrôles de saisie |
| `Js_<rubrique>.html` (10 fichiers) | Une rubrique par fichier (Administration complète, les autres prêtes pour les lots suivants) |

## Installation pour tester (≈ 20 minutes)

Tout se fait **connecté au compte Google des Brunants**.

1. **Créer le classeur** : dans le dossier de votre choix du Drive des Brunants, Nouveau → Google Sheets → classeur vierge (le nom importe peu, `setup()` le renomme). `setup()` crée `Outil_Brunants` **dans ce même dossier** et y range le classeur ; le journal d'exécution affiche l'emplacement exact.
2. **Ouvrir l'éditeur** : dans le classeur, *Extensions → Apps Script*. Nommer le projet « Outil Brunants ».
3. **Afficher le manifeste** : ⚙ *Paramètres du projet* → cocher « Afficher le fichier manifeste "appsscript.json" dans l'éditeur ».
4. **Copier les fichiers** : ouvrir `Assistant_installation.html` (double-clic) à côté de l'onglet Apps Script et suivre ses 20 cartes, une par fichier.
   - **Une carte = un fichier séparé** dans Apps Script, avec exactement le nom indiqué (majuscules comprises, sans extension : `Donnees` devient `Donnees.gs`, `Index` devient `Index.html`).
   - Pour chaque fichier, bouton **📋 Copier le contenu** dans l'assistant, puis dans Apps Script : cliquer dans le fichier, `Ctrl`+`A`, `Ctrl`+`V`.
   - `appsscript.json` et `Code.gs` existent déjà : on **remplace** tout leur contenu.
   - Les autres se créent avec **+** à côté de « Fichiers » → *Script* (4 fichiers) ou *HTML* (14 fichiers).
   - Ne jamais coller la *liste des noms* dans un fichier : seulement le contenu copié.
   - À la fin, 💾 *Enregistrer le projet* : plus aucun point orange à côté des noms. La liste doit compter exactement 20 fichiers.
   - Sans l'assistant : ouvrir chaque fichier du dossier `apps_script` avec le Bloc-notes, puis `Ctrl`+`A`, `Ctrl`+`C`, et coller dans le fichier du même nom.
5. **Installer** : choisir la fonction `setup` dans la liste en haut, puis ▶ *Exécuter*.
   - Google demande une autorisation : *Examiner les autorisations* → choisir le compte → *Paramètres avancés* → *Accéder à Outil Brunants (non sécurisé)* → *Autoriser*. Ce message est normal pour un outil interne non publié.
   - Le journal d'exécution doit afficher « Installation terminée » et la liste des opérations.
6. **Déployer** : *Déployer → Nouveau déploiement* → type *Application Web* :
   - Exécuter en tant que : **L'utilisateur qui accède à l'application Web**
   - Qui a accès : **Tout utilisateur disposant d'un compte Google**
   - Copier l'**URL de l'application Web** (elle se termine par `/exec`).
7. **Partager** le **dossier** `Outil_Brunants` (pas seulement le classeur) avec les membres du bureau, en **Éditeur**. Le partage du dossier est nécessaire pour que chacun puisse lancer « Sauvegarder maintenant ».
8. **Mettre à jour plus tard** (lots suivants) : recopier les fichiers modifiés, puis *Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer*. L'URL ne change pas.

> `setup()` peut être relancé à tout moment (aussi depuis le menu **Brunants** du classeur) : il recrée ce qui manque et ne duplique jamais de données.

## Ce que fait le lot 1

- **Classeur** `Brunants_Donnees` rangé dans `Outil_Brunants/` (créé à côté du classeur d'origine), avec `Sauvegardes/` et `Fiches_inscription/`. Le dossier peut ensuite être déplacé librement dans le Drive : l'outil le retrouve par son identifiant, pas par son chemin.
- **12 onglets** dans l'ordre du prompt, en-têtes en français figés et protégés (avertissement avant modification), dates `JJ/MM/AAAA`, montants en €, listes déroulantes, codes postaux et téléphones au format texte (le 0 initial n'est jamais perdu).
- **Lecture par titre de colonne** : on peut déplacer une colonne à la main sans rien casser ; une colonne supprimée ou renommée est signalée et recréée par `setup()`.
- **Lignes saisies à la main** : relues à chaque ouverture et sur « Actualiser ».
  - *Ignorée* : ID manquant ou en double, ou champ indispensable illisible (nom, date d'inscription, date et montant d'une recette…).
  - *À vérifier* : autre anomalie (e-mail mal formé, date de naissance impossible…) ; la ligne reste utilisée.
  - Les deux apparaissent dans un bandeau et dans *Administration → Lignes à corriger*.
- **Écritures** sous verrou (`LockService`), identifiants lisibles générés automatiquement, contrôles en français côté écran **et** côté serveur, chaque opération inscrite au **Journal**.
- **Sélecteur d'année** en haut, années déduites des données + année en cours, règles de rattachement du prompt (§3.2), titres « … 2026 ».
- **3 zones colorées** dans chaque rubrique (Indicateurs bleu, Saisie vert, Listes jaune), contours du POC conservés.
- **Listes génériques** : recherche (sans tenir compte des accents), filtres, tri en cliquant l'en-tête, filtre en tête de colonne, Modifier / Supprimer avec confirmation, **Exporter en CSV** (dès maintenant, prévu au lot 6).
- **Mode entraînement** : bandeau, un seul e-mail envoyé à l'adresse de test listant les destinataires prévus ; contrôle du quota d'envoi.
- **Sauvegarde** : déclencheur le 1er de chaque mois vers 2 h + bouton « Sauvegarder maintenant » → copie complète + export `.xlsx`, 12 dernières conservées, opération journalisée.
- **Rubrique 9. Administration** : paramètres, catégories (pour tester la saisie générique), outils, lignes à corriger, journal.

## Tests à faire (dans Google, après l'installation)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir l'URL de l'application | Bandeau orange « MODE ENTRAÎNEMENT », année 2026 sélectionnée, 10 rubriques dans le menu |
| 2 | Ouvrir l'URL avec un compte Google **sans accès** au dossier | Message « Accès refusé… » et rien d'autre |
| 3 | Cliquer chaque rubrique | Titre mis à jour, 3 zones bleu / vert / jaune |
| 4 | Administration → changer l'année en 2025 | Titres « … 2025 », Budgets : 8 dans l'année, journal 2025 vide |
| 5 | Créer une catégorie, la modifier, la supprimer | Messages « Catégorie CAT-043 créée / modifiée / supprimée », liste et journal à jour aussitôt, lignes visibles dans l'onglet Categories |
| 6 | Créer deux fois la même catégorie / sous-catégorie | Refus « Cet enregistrement existe déjà » |
| 7 | Dans le classeur, onglet Categories : ajouter une ligne complète avec un nouvel ID (CAT-900), et une ligne sans ID ; puis « Actualiser » | CAT-900 apparaît ; bandeau « 1 ligne ignorée » ; détail dans *Lignes à corriger* |
| 8 | Dans le classeur : échanger deux colonnes de l'onglet Categories ; « Actualiser » | Aucune erreur, données correctes ; une nouvelle saisie s'écrit dans les bonnes colonnes |
| 9 | Recherche « musee », filtre Type, filtre en tête de colonne, tri, « Effacer les filtres » | Les lignes se filtrent et se trient ; le compteur suit |
| 10 | Exporter en CSV (liste des catégories) | Fichier `categories_2026_….csv` téléchargé, lisible dans Excel / LibreOffice |
| 11 | Sauvegarder maintenant | `Sauvegarde_Brunants_AAAA-MM-JJ` + `.xlsx` dans `Outil_Brunants/Sauvegardes`, KPI « Dernière sauvegarde » et journal à jour |
| 12 | Envoyer un e-mail de test | Un seul message reçu sur l'e-mail de test, sujet `[ENTRAÎNEMENT]`, avec la liste des 3 adresses fictives |
| 13 | Paramètres : e-mail de test invalide ; puis décocher « Mode entraînement » | Refus en français ; confirmation « Passer en mode réel ? » |
| 14 | Éditeur Apps Script → *Déclencheurs* (icône réveil) | Un déclencheur `sauvegardeMensuelle`, mensuel, le 1er |
| 15 | Deux membres du bureau enregistrent une catégorie en même temps | Les deux enregistrements passent, ID distincts |
| 16 | Ouvrir l'outil sur un téléphone | Menu en haut, pas de défilement horizontal |

## Tests déjà passés ici

- **Serveur** (`node outils/test_serveur.js`) : 64 vérifications avec un simulateur de Google Sheets et Drive. Elles couvrent `setup()` relancé sans doublon, la lecture de lignes saisies à la main, les colonnes déplacées ou renommées, les contrôles, la rotation des sauvegardes, la redirection des e-mails, le quota et l'accès refusé.
- **Interface** (`python3 outils/test_interface.py`) : 50 vérifications dans un navigateur sur l'aperçu local, dont l'affichage sur téléphone.
- Ces tests ne remplacent pas les tests dans Google : les autorisations, le partage, le déclencheur, l'export `.xlsx` réel et le téléchargement CSV dans l'iframe Apps Script restent à vérifier.

## Choix faits, à valider

1. **Rubrique « 9. Administration »** ajoutée (absente du POC) : il fallait un endroit pour les paramètres, le journal, les lignes à corriger et les boutons de sauvegarde, de réinitialisation et d'import (lot 6).
2. **Colonne ID** ajoutée aux onglets `Categories` (CAT-001) et `Budgets` (BUD-2026-01), pour que Modifier / Supprimer fonctionnent comme partout ailleurs.
3. Paramètre **« Cotisation par défaut (15 €) »** ajouté à `Parametres` (la cotisation peut changer un jour sans toucher au code). Le champ **SIRET** du POC est conservé dans `Prestataires`.
4. Sous-catégories **provisoires** de « Divers » : Cotisations, Dons, Subventions (recettes), Frais bancaires (dépense), Autre. Elles seront remplacées par la liste du président.
5. **Police** : tous les textes du POC sous 14 px (étiquettes, badges, tableaux) passent à 14 px minimum, comme demandé par la charte.
6. Conséquences du déploiement **« utilisateur qui accède »** imposé par le prompt :
   - chaque membre du bureau doit accepter une fois l'écran d'autorisation « application non validée » ;
   - au lot 4, les e-mails partiront de **l'adresse Gmail du membre** qui clique, et compteront sur son propre quota ;
   - seul le propriétaire peut mettre à la corbeille les anciennes sauvegardes. Si un autre membre lance une sauvegarde, la rotation est reportée à la sauvegarde mensuelle, sans erreur, et c'est noté au journal.
   - Si ces points gênent, l'alternative simple est « Exécuter en tant que : moi (compte Brunants) » avec une liste d'e-mails autorisés dans `Parametres`.
