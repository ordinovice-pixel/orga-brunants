# 08 — Leçons apprises et procédures

Mise à jour : 16/10/2026

## Procédure : mettre à jour l'outil après un nouveau lot

1. Dans l'outil : **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_LotN.html`. Pour chaque carte : **Copier le contenu**, puis dans Apps Script cliquer sur le fichier du même nom, `Ctrl`+`A`, `Ctrl`+`V`.
3. **💾 Enregistrer le projet** (plus aucun point orange).
4. Choisir **`setup`** dans la liste à côté de « Débogage », puis **▶ Exécuter**. Accepter une nouvelle autorisation si Google la demande.
5. **Publier** : Déployer → **Gérer les déploiements** → ✏️ → Version : **Nouvelle version** → Déployer.
6. Recharger l'outil (`F5`) ; le bas de la barre latérale affiche le numéro du lot.
7. Si le LISEZMOI le demande : Administration → Réinitialiser les données d'entraînement.
8. Faire les tests du `LISEZMOI_LotN.md`.

## Pièges déjà rencontrés

| Symptôme | Cause | Solution |
|---|---|---|
| Le classeur garde son nom (« outil test »), pas de dossiers ni d'onglets | `setup()` n'a jamais été exécuté (seul l'outil était déployé) | Exécuter `setup` |
| On exécute `doGet` au lieu de `setup` | Mauvaise fonction choisie dans la liste | Choisir **`setup`** dans la liste à côté de « Débogage » |
| L'outil reste à l'ancienne version | Code enregistré mais pas publié | Gérer les déploiements → ✏️ → **Nouvelle version** |
| Nouvelle URL après une mise à jour | « Nouveau déploiement » au lieu de modifier l'existant | Toujours passer par **Gérer les déploiements → ✏️** |
| Des noms de fichiers collés *dans* un fichier | Consigne ambiguë du lot 1 | Utiliser l'assistant (un bouton Copier par fichier) |
| « Google n'a pas validé cette application » | Normal pour un outil interne | Paramètres avancés → Accéder à Outil Brunants → Autoriser |
| Dossiers créés à la racine du Drive | Ancienne version de `Code.gs` | Corrigé : les dossiers sont créés à côté du classeur |
| Accents cassés dans les infobulles des graphiques | Entités HTML dans les libellés Chart.js | Écrire les caractères UTF-8 directement |
| Chiffres faussés après un lot qui ajoute des colonnes | Anciennes données d'entraînement incomplètes | Réinitialiser les données d'entraînement |
| Annonce mail refusée en mode réel | Quota ≈ 100 e-mails par jour (compte gratuit) | Liste de diffusion (voir Q-06) |

## Procédure : versionner sur GitHub

- À chaque étape (lot livré, correction, décision), Claude met à jour la memory bank puis **commite** dans le dépôt privé, avec un message en français : `Lot 5 : tableau de bord et calendrier`.
- Une version livrée reçoit une étiquette `lot-N`.
- Avant tout ajout, vérifier qu'aucun fichier confidentiel n'est pris : `git status` ; en cas de doute, ne pas forcer (`git add -f`).
- Les vraies données des adhérents ne vont **jamais** dans Git : elles restent sur le Drive des Brunants.

## Leçons de méthode

- Toujours **sauvegarder avant** une mise à jour ou un import.
- Les tests de Claude passent hors ligne (simulateur) ; **seuls les tests du LISEZMOI dans Google font foi**.
- Si l'onglet `Adherents` contient déjà des lignes, `setup()` n'y touche pas : pour recharger le jeu fictif, utiliser la réinitialisation (ou vider l'onglet en gardant la ligne 1).
- Une modification à la main dans le classeur est prise en compte après **« Actualiser »** ; une ligne incomplète est ignorée et signalée dans Administration.
- Le dossier de travail de Claude est effacé entre deux conversations : **joindre le dernier ZIP** pour reprendre.
