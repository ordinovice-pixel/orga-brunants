# Guide d'utilisation de l'outil « Les Brunants » — lot 6c

`Guide_utilisation_Brunants.html` est un fichier **autonome** (images, styles et script intégrés, environ 3 Mo). Il s'ouvre dans n'importe quel navigateur, même sans connexion internet, sur ordinateur comme sur téléphone, et s'imprime proprement (une rubrique par page).

## Contenu

- **Accueil** : recherche libre, « Je veux… » (tâches courantes), index par rubrique construit automatiquement.
- **Les bases** : écran, année, zones, listes, formulaires, messages, numéros, Actualiser, Sauvegarder, mode entraînement.
- **Une partie par rubrique** : Tableau de bord, Adhérents, Budget & Compta, Activités, Prestataires, Calendrier, rubriques à venir, Administration (partie bureau seulement).
  - Chaque partie reprend les zones de l'outil : **Indicateurs** (bleu), **Saisie** (vert), **Listes** (jaune), puis **Tutos** (orange).
- **16 tutos illustrés**, dont les 10 exercices de la Prise en main.
- **Glossaire** de 39 termes.
- **68 captures**, toutes prises avec les **données fictives** de l'aperçu local (DEC-062).

## Lien direct vers un endroit du guide (futur bouton « ? »)

Chaque élément a une ancre stable, par exemple :

- `Guide_utilisation_Brunants.html#adh-liste` (liste des adhérents) ;
- `#act-suivi` (suivi des paiements) ;
- `#bud-solde` (solde budget) ;
- `#tuto-rembourser` (rembourser une échéance).

La page expose aussi `window.GuideBrunants.aller(id)` et `window.GuideBrunants.chercher(texte)`.

## Régénérer le guide après un nouveau lot

Depuis le dossier `guide/` :

```bash
# 1. Bibliothèques des graphiques (une seule fois)
npm pack chart.js@4.4.1 chartjs-plugin-datalabels@2.2.0
mkdir -p npm/cj npm/dl
tar xzf chart.js-4.4.1.tgz -C npm/cj
tar xzf chartjs-plugin-datalabels-2.2.0.tgz -C npm/dl

# 2. Captures (aperçu local du nouveau lot, données fictives)
python3 outils/captures_guide.py ../Apercu_local_Brunants.html npm captures

# 3. Assemblage en un seul fichier, avec contrôle des liens et des ancres
python3 outils/construire_guide.py . ../apps_script/Logo.html Guide_utilisation_Brunants.html

# 4. Vérification : erreurs, 18 recherches types, ancres, affichage téléphone
python3 outils/verifier_guide.py Guide_utilisation_Brunants.html verif
```

Les textes sont dans `source/` : `guide_source.html` (accueil, bases, styles), un fichier `rub_*.html` par rubrique, `guide.js` (navigation, index, recherche et synonymes). Une nouvelle fiche (`class="fiche"` avec un `id`) est automatiquement ajoutée à l'index et à la recherche.
