# Outil de gestion « Les Brunants » — Lot 6c : vos vrais adhérents dans l'outil

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 6c s'installe **par-dessus le lot 6b**. Il prépare l'import de vos vrais adhérents (votre choix du 22/10) et applique vos réponses du même jour.

## 1. Installer la mise à jour (environ 10 minutes)

1. Dans l'outil, cliquez sur **💾 Sauvegarder maintenant**.
2. Ouvrez `Assistant_mise_a_jour_Lot6c.html` et remplacez les **10 fichiers** qu'il indique.
3. 💾 **Enregistrez le projet**, puis exécutez **setup**. Le journal doit afficher :
   - « nombre de sauvegardes conservées passé de 12 à 24 » ;
   - « sous-catégorie « 8.3 Dons » ajoutée » ;
   - « descriptif de 7.2 mis à jour ».
4. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**.
5. Dans l'outil, appuyez sur `F5` : le bas de la barre latérale affiche « Lot 6c ».

> ⚠️ **N'importez pas vos adhérents avant d'avoir installé cette mise à jour.** C'est elle qui les protège.

## 2. Ce que change le lot 6c

- **Vos vrais adhérents sont protégés.**
  - Une fois importés, le bouton **« Réinitialiser les données d'entraînement » ne touche plus aux adhérents**, ni à ce que vous aurez complété dans leurs fiches. Il ne recharge que les activités, les comptes, les budgets et les catégories d'entraînement.
  - Il ne recrée **aucune inscription, aucun paiement et aucune location fictive** sur vos vrais adhérents.
  - Administration affiche « 🔒 Adhérents réels (importés le …) : ils sont conservés par la réinitialisation ».
  - Si vous relancez un jour « Remplacer » sur les adhérents, l'outil vous prévient que **tout ce que vous avez complété serait perdu**.
- **Le mode entraînement reste actif** : aucun e-mail ne part vers un adhérent. Tous les messages vont à l'adresse de test.
- **Nouveau filtre « À compléter »** dans la liste des adhérents. Il propose 6 choix :
  - Date d'entrée provisoire (01/01/2000) ;
  - Sans date de naissance ;
  - Sans e-mail ;
  - Sans téléphone ;
  - Adresse incomplète ;
  - Fiche complète.

  Une fiche à qui il manque plusieurs choses apparaît sous chacun des choix concernés.
- **Vos réponses du 22/10 :**
  - nouvelle sous-catégorie **8.3 Dons** ;
  - « maintenance informatique » seulement en **7.7** ;
  - **24 sauvegardes** conservées.

## 3. Importer vos vrais adhérents (environ 5 minutes)

1. **💾 Sauvegarder maintenant**, par précaution.
2. **Administration → Assistant d'import** :
   - table **Adhérents** ;
   - fichier **`Import_Adherents_Brunants.csv`**, sur votre PC, dans le dossier « Projet nouvelle Organisation ».
3. Cliquez sur **3. Vérifier les lignes**. Vous devez voir **398 lues, 398 valides, 0 rejetée**, comme lors de votre test.
4. Dans « 4. Import », cochez **« Remplacer les données de la table »**, cliquez sur **Remplacer la table**, puis confirmez deux fois.
5. Résultat attendu : « Import terminé : 398 ligne(s) importée(s) ».

**Ce qui se passe à ce moment-là :**

| Supprimé (fictif) | Gardé pour vous entraîner (fictif) |
|---|---|
| Les 234 adhérents fictifs, leurs inscriptions, leurs paiements, leurs locations de mobil-home | Les activités (sans organisateur), les recettes et dépenses saisies, les budgets, les prestataires, les catégories |

Vous pouvez ensuite **inscrire vos vrais adhérents aux activités fictives** pour vous entraîner. En mode entraînement, aucun e-mail ne leur parvient.

## 4. Vérifier l'import, puis compléter les fiches

| # | Ce que vous faites | Ce que vous devez voir |
|---|---|---|
| 1 | **Adhérents**, année 2026 | Environ 233 adhérents actifs. Les décédés et les anciens sont dans les **Archives** |
| 2 | Chercher quelques noms connus, ouvrir leur fiche (✏️) | Adresse, téléphones, e-mails, date d'entrée, conjoint (« Rattaché à ») corrects. Les informations de l'ancien fichier sont dans « Commentaire » |
| 3 | Filtre **« À compléter » → Date d'entrée provisoire** | Une cinquantaine de fiches. Pour chacune : ✏️, mettre la vraie date d'inscription, retirer la mention « 01/01/2000 provisoire » du commentaire, Enregistrer. La fiche sort du filtre |
| 4 | **« À compléter » → Sans e-mail**, puis **Sans téléphone** | Environ 30 fiches sans e-mail, une quinzaine sans téléphone, à compléter si vous avez l'information |
| 5 | **Administration** | La mention « 🔒 Adhérents réels (importés le …) » |
| 6 | **Réinitialiser les données d'entraînement** | La confirmation dit que vos 398 adhérents réels sont conservés. Après coup, vos fiches complétées sont intactes, les activités fictives sont revenues, sans aucune inscription |
| 7 | Administration → Catégories | 27 lignes, dont **8.3 Dons**. Le descriptif de 7.2 ne parle plus de maintenance informatique |
| 8 | Administration → Paramètres | « Nombre de sauvegardes conservées » : **24** |

## 5. À retenir

- **Ne relancez plus « Remplacer » sur les adhérents** : vos compléments seraient perdus. Pour un ou deux nouveaux adhérents, utilisez la fiche (« Nouvel adhérent ») ou le mode **Ajouter**.
- **Ne désactivez pas le mode entraînement** pour l'instant. Les e-mails partiraient vers les vrais adhérents, alors que les activités et les comptes sont encore fictifs. Le passage complet au réel se fera après la phase de test, en vidant les activités et comptes fictifs.
- Le classeur et ses sauvegardes contiennent maintenant **de vraies données personnelles** : gardez le partage limité au bureau.

## Tests déjà passés ici

- **Serveur** :
  - **17 vérifications** pour le lot 6c :
    - import « Remplacer » ;
    - rien de fictif rattaché aux vrais adhérents ;
    - `setup` et réinitialisation qui les conservent à l'identique ;
    - inscription d'un vrai adhérent à une activité fictive ;
    - retour à la normale après restauration d'une sauvegarde antérieure.
  - Mise à jour d'un classeur du lot 6b : 8.3 Dons, 7.2 et 24 sauvegardes (8 vérifications).
  - Tous les tests des lots précédents repassent.
- **Votre CSV, en local** : 398 lignes importées avec « Remplacer », puis une réinitialisation. Les 398 adhérents sont conservés, sans aucune inscription fictive et sans avertissement. Parmi les 233 actifs : 49 dates d'entrée provisoires, 31 sans e-mail, 13 sans téléphone, 1 sans date de naissance.
- **Navigateur** :
  - **14 vérifications** pour le lot 6c : import, alertes, filtre « À compléter », réinitialisation.
  - Les tests des lots précédents repassent.
