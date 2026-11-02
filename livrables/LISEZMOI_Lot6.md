# Outil de gestion « Les Brunants » — Lot 6 : Assistant d'import, sauvegardes et restauration

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 6 s'installe **par-dessus le lot 5**. Il contient aussi les **liens vers les justificatifs** dans Budget & Compta (demande du 19/10).

## Mise à jour (environ 10 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_Lot6.html`. Il y a **9 fichiers à remplacer** et **1 fichier à créer**.
   - À remplacer : `Donnees.gs`, `Automatisations.gs`, `Import.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_Budget.html`, `Js_Prestataires.html`, `Js_Administration.html`.
   - À créer : **`Js_Import`** (type HTML).
3. 💾 **Enregistrer le projet**, puis exécuter **setup** (sur `Code.gs`). Aucune colonne n'est ajoutée et aucune nouvelle autorisation n'est demandée.
4. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**.
5. `F5` : le bas de la barre latérale affiche « Lot 6 ».

`Modele_import_adherents.xlsx` est le **modèle Excel** de l'assistant. Gardez-le sur votre PC.

## Ce que fait le lot 6

### Budget & Compta : ouvrir le justificatif

- Collez le lien de partage du fichier (Google Drive…) dans « Facture / justificatif ». Un lien **📎 Ouvrir le document** apparaît sous le champ.
- Dans les listes **Dépenses** et **Recettes**, la ligne affiche **📎 Ouvrir**. Le fichier s'ouvre dans un nouvel onglet. Cela marche aussi pour les factures de la fiche prestataire.
- Un lien copié sans « https:// » (drive.google.com/…) est complété automatiquement.
- Un simple n° de facture ou de reçu reste affiché en texte, sans lien.

### Administration → 📥 Assistant d'import des vraies données

Tables concernées : Adhérents, Activités, Prestataires, Catégories.

1. **Fichier** : CSV ou Excel (.xlsx, .xlsm). Le fichier est lu directement dans le navigateur.
   - L'onglet et la ligne des en-têtes sont **détectés automatiquement**, même s'il y a des lignes de titre au-dessus.
   - Les accents d'un CSV enregistré par Excel sont bien lus.
2. **Correspondance des colonnes** : l'outil propose la colonne du fichier pour chaque champ, à partir de son nom (Portable → Mobile, Titre → Civilité, CP → Code postal, Date Entrée Brunants → Date d'inscription…).
   - Chaque proposition se corrige avec la liste déroulante, et 3 exemples lus sont affichés.
   - Un champ obligatoire sans colonne est surligné en rouge.
3. **Contrôle**, sans rien écrire : chaque ligne est classée **Valide**, **À corriger** (importée avec une remarque) ou **Rejetée** (non importée, avec le motif).
   - Contrôles faits : dates, codes postaux, e-mails, champs obligatoires, valeurs hors liste, doublons (nom + prénom + date de naissance) dans le fichier et avec l'existant, conjoints.
   - Les lignes sont numérotées **comme dans le fichier**.
   - **⬇️ Rapport des rejets et remarques (CSV)** télécharge la liste à corriger.
   - Corrections automatiques : 0 initial perdu par Excel (codes postaux, téléphones), « x » = Oui, majuscules et accents des listes (« transport » → « Transport »), noms en majuscules.
4. **Import**, en 3 modes :
   - **Tester dans une copie** (recommandé) : une copie du classeur est créée dans `Outil_Brunants/Tests_import`, avec un onglet `Rapport_import`. **Le classeur de l'outil n'est pas modifié.**
   - **Ajouter** aux données existantes. Les doublons avec l'existant sont rejetés.
   - **Remplacer** la table. Ce qui en dépend est vidé aussi, pour ne laisser aucun lien cassé. L'écran l'indique avant de lancer : par exemple, remplacer les adhérents vide les inscriptions, les échéances et les locations. Une double confirmation est demandée.
   - **Ajouter** et **Remplacer** font une **sauvegarde complète juste avant**, et l'import est inscrit au journal.
5. **Les ID** : un ID du fichier au bon format (ADH-0012…) est gardé s'il est libre ; sinon l'outil en attribue un. Les conjoints et organisateurs désignés par un ID du même fichier suivent.

**Modèles :**
- `Modele_import_adherents.xlsx` : un onglet par table. Les en-têtes obligatoires sont en rouge, une ligne d'exemple fictive est fournie, et des listes déroulantes guident la saisie. Un onglet **Aide** décrit chaque colonne.
- Le bouton **⬇️ Télécharger le modèle (CSV)** donne les en-têtes de la table choisie.

### Administration → 🗄️ Sauvegardes et restauration

- **Afficher les sauvegardes** liste le dossier `Outil_Brunants/Sauvegardes`, de la plus récente à la plus ancienne, avec le lien vers la copie et vers le fichier .xlsx.
- **Vérifier** ouvre la sauvegarde et compare, onglet par onglet, son nombre de lignes avec le classeur actuel. Si un onglet manque, la sauvegarde ne peut pas servir à une restauration.
- **Restaurer** recopie les données de la sauvegarde **dans le classeur de l'outil**. L'adresse de l'outil et les droits du bureau ne changent pas.
  - **Les paramètres et le journal sont conservés.**
  - Une sauvegarde de l'état actuel est faite juste avant : une restauration se « défait » en restaurant cette dernière.
  - Les colonnes sont reprises par leur titre, donc une sauvegarde d'une version précédente de l'outil se restaure aussi.

### Procédure de restauration si l'outil ne s'ouvre plus

1. **Le classeur a été supprimé** : Google Drive → **Corbeille** → clic droit sur `Brunants_Donnees` → **Restaurer**. C'est possible pendant 30 jours, et l'outil refonctionne tel quel.
2. **Le classeur est inutilisable mais l'outil s'ouvre** : utiliser **Restaurer** ci-dessus.
3. **Ni l'un ni l'autre** :
   1. Dans `Outil_Brunants/Sauvegardes`, faire **Fichier → Créer une copie** de la dernière sauvegarde.
   2. Ouvrir la copie → **Extensions → Apps Script**. Le code est déjà là, car la copie le contient.
   3. Exécuter **setup** : vos données sont gardées et la copie est renommée `Brunants_Donnees`.
   4. **Déployer → Nouveau déploiement**.
   5. ⚠️ L'adresse de l'outil change : transmettez-la au bureau, et partagez le classeur avec lui.

Le guide d'installation du lot 7 reprendra cette procédure pas à pas.

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Administration, en bas de page | Les deux panneaux « Assistant d'import » et « Sauvegardes et restauration » |
| 2 | Assistant, table **Adhérents**, fichier `Modele_import_adherents.xlsx` | Onglet « Adhérents » choisi automatiquement, 30 colonnes associées. **3. Vérifier** : 1 ligne lue, 1 valide (EXEMPLE Jeanne) |
| 3 | Même fichier, mode **Ajouter** → Ajouter les lignes | Adhérents +1 (EXEMPLE Jeanne). Le message cite la sauvegarde faite juste avant |
| 4 | **3. Vérifier** à nouveau (mode Ajouter) | La ligne est **rejetée** : « Doublon : ADH-… EXEMPLE Jeanne… » |
| 5 | **Vos vraies données** : table Adhérents, fichier `Import_Adherents_Brunants.csv` (sur votre PC), mode **Tester dans une copie** | En-têtes en ligne 1, 30 champs associés. Vérifier : **398 lues, 398 valides, 0 rejetée**. Lancer : « Test terminé… 398 ligne(s) importée(s) » et un lien vers la copie (onglet Rapport_import). Le classeur de l'outil ne change pas |
| 6 | Table **Prestataires**, fichier `Modele_import_adherents.xlsx`, mode **Remplacer** | Onglet « Prestataires » choisi. L'avertissement liste ce qui sera vidé. Après la double confirmation, il reste « Autre » et « Autocars Exemple » |
| 7 | Sauvegardes → **Afficher**, puis **Vérifier** sur la 1re ligne | Tableau des 10 onglets. Prestataires : 14 dans la sauvegarde contre 2 aujourd'hui |
| 8 | **Restaurer** cette sauvegarde (double confirmation) | Les 14 prestataires reviennent. EXEMPLE Jeanne (test 3) est toujours là, car la sauvegarde a été faite après. Une sauvegarde « avant restauration » apparaît en tête de liste |
| 9 | Budget & Compta : une dépense avec, en justificatif, le lien de partage d'un fichier Drive | Le lien « 📎 Ouvrir le document » apparaît sous le champ. Dans la liste des dépenses, **📎 Ouvrir** ouvre le fichier |
| 10 | Une recette avec « Reçu n° 12 » | Texte « 📎 Reçu n° 12 » dans la liste, sans lien |
| 11 | Un fichier rempli avec des erreurs (date « 31/02/2020 », e-mail sans @…) | Lignes **rejetées** avec le motif. **⬇️ Rapport…** télécharge un CSV lisible dans Excel |

Après les tests :
- mettez à la corbeille les copies de `Outil_Brunants/Tests_import` ;
- supprimez EXEMPLE Jeanne, ou faites **Réinitialiser les données d'entraînement**.

## Tests déjà passés ici

- **Serveur** :
  - **45 vérifications** pour le lot 6 :
    - contrôle ligne par ligne, dont les doublons dans le fichier (seule la 2de occurrence est rejetée) ;
    - test dans une copie ;
    - ajout avec ID déjà pris et lien vers une ligne du même fichier ;
    - remplacement avec dépendances vidées et aucun lien cassé ;
    - prestataire « Autre » protégé ;
    - liste, vérification et restauration des sauvegardes, y compris une sauvegarde d'une version précédente ; sauvegarde incomplète refusée ;
    - mise à jour d'un classeur du lot 5.
  - Les tests des lots 1 à 5 et de l'ancien test d'import repassent (64, 35, 41, 68, 18 et 19 vérifications).
- **Vos vraies données, en local, via l'assistant** : 398 lignes lues, 398 valides, 0 rejetée. Les 172 conjoints sont reliés dans les deux sens. Rien de vos données n'est dans ce lot.
- **Navigateur** :
  - **54 vérifications** pour le lot 6 :
    - CSV Windows-1252 avec lignes de titre ;
    - correspondance automatique des 14 colonnes ;
    - rapport CSV ;
    - les 3 modes avec leurs confirmations ;
    - fichier Excel lu avec SheetJS (onglet choisi, dates JJ/MM/AAAA) ;
    - modèle .xlsx pour 2 tables ;
    - sauvegardes ;
    - liens justificatifs ;
    - affichage téléphone sans défilement horizontal.
  - Les tests des lots 1 à 5 repassent (50, 49, 46, 83 et 52 vérifications).

## Points à valider

1. **Nombre de sauvegardes gardées** : 12 aujourd'hui (paramètre `NB_SAUVEGARDES`). Les sauvegardes faites avant chaque import, réinitialisation ou restauration comptent dans ces 12. Plusieurs imports à la suite peuvent donc pousser vers la corbeille des sauvegardes mensuelles. **Je propose de passer à 24.** D'accord ?
2. **Restauration** : elle porte sur **toutes** les tables de données à la fois (adhérents, activités, comptabilité…), pas sur une seule. C'est le plus sûr pour garder la cohérence, par exemple entre inscriptions et recettes. Cela vous convient ?
3. **Bascule vers les vraies données** : le mode « Remplacer » des adhérents est prêt, mais je propose de ne l'utiliser **qu'après la phase de test de l'outil**. Elle se ferait avec le mode entraînement désactivé, et après avoir décidé ce qu'on garde des activités et des comptes fictifs. D'accord ?
