# Outil de gestion « Les Brunants » — Lot 4c : retouches du 19/10/2026

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 4c s'installe **par-dessus le lot 4b**. Le LISEZMOI du lot 4b reste valable pour tout le reste.

## Mise à jour (environ 5 minutes)

1. Ouvrir `Assistant_mise_a_jour_Lot4c.html`. Remplacer les **4 fichiers modifiés** : `Donnees.gs`, `Import.gs`, `Styles.html`, `Js_Budget.html`.
2. 💾 **Enregistrer le projet**, puis exécuter **setup** (sur `Code.gs`). Rien ne change dans le classeur.
3. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**.
4. `F5` : le bas de la barre latérale affiche « Lot 4c ».

## Ce qui change

| Rubrique | Modification |
|---|---|
| Budget & Compta | En-tête du **formulaire de saisie dépense en rouge clair**, du **formulaire de saisie recette en vert clair**, comme les listes |
| Budget & Compta | Graphique **Recettes vs Dépenses** : le montant de chaque barre est écrit au-dessus de la barre, sans survol. Les mois sans montant n'affichent rien |
| Test d'import | Un code postal ou un téléphone qui a perdu son **0 initial** (06700 devenu 6700) est complété. Cela arrive quand le fichier est ouvert dans Excel ou converti en Google Sheets avant le dépôt. C'est ce qui avait fait refuser 2 fiches au premier test |
| Test d'import | Un fichier d'import converti en Google Sheets est lu sur ses vraies valeurs (dates, nombres), et non sur leur affichage. Si Google a lu les dates à l'américaine (mois/jour), le test s'arrête avec une explication au lieu d'importer des dates fausses |

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Budget & Compta | Formulaire dépense rouge clair à gauche, recette vert clair à droite |
| 2 | Graphique Recettes vs Dépenses 2026 | Chaque barre porte son montant (par exemple « 10 126 € » en dépenses de septembre) |
| 3 | Administration → 🧪 Tester l'import des adhérents | **398 fiches importées sur 398, 0 refusée**, 233 actifs, 85 décédés et 80 anciens en archives, 86 couples |
| 4 | Dans la nouvelle copie, onglet Adherents : ADH-0233 et ADH-0238 | Présents, avec les codes postaux 06700 et 07150 |

## Tests déjà passés ici

- Serveur : lots 1 à 4 (64, 35, 41 et 67 vérifications). Le test d'import passe à 19 vérifications, dont un code postal à 4 chiffres et un fichier converti en Google Sheets.
- Navigateur : lots 1 à 4 (50, 49, 46 et 83 vérifications), plus un contrôle visuel du graphique et des formulaires.
