# Outil de gestion « Les Brunants » — Lot 4b : retouches et test d'import (18/10/2026)

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

Le lot 4b s'installe **par-dessus le lot 4**. Si le lot 4 n'est pas encore installé, faites d'abord `Assistant_mise_a_jour_Lot4.html` (fourni aussi dans ce ZIP), avec sa réinitialisation.

## Mise à jour (environ 10 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_Lot4b.html`. Remplacer les **11 fichiers modifiés** : `Code.gs`, `Donnees.gs`, `DonneesFictives.gs`, `Import.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_Adherents.html`, `Js_Budget.html`, `Js_Activites.html`, `Js_Administration.html`.
3. 💾 **Enregistrer le projet**, puis exécuter **setup** (sur `Code.gs`, pas `doGet`). Aucune nouvelle autorisation n'est demandée.
4. Le journal doit afficher :
   - « colonne « Souhaite recevoir le Maillon » renommée « Souhaite recevoir le Maillon papier » » ;
   - « colonne(s) ajoutée(s) : Année entrée JMB, Date sortie JMB, Recevoir toutes les communications par mail ».

   Ces 3 colonnes sont ajoutées **à la fin** de l'onglet `Adherents`. C'est normal : l'outil retrouve chaque colonne par son titre, pas par sa place.
5. **Déployer → Gérer les déploiements** → ✏️ → **Nouvelle version** → **Déployer**. Ne pas utiliser « Nouveau déploiement ».
6. `F5` : le bas de la barre latérale affiche « Lot 4b ».
7. *Facultatif* : Administration → **Réinitialiser les données d'entraînement**, pour que le jeu d'essai remplisse aussi les nouveaux champs. Sans cela, ces champs restent vides sur les fiches existantes.

## Ce qui change

| Rubrique | Modification |
|---|---|
| Budget & Compta | **Répartition des dépenses par catégorie** : montant et % sont écrits sur l'anneau, et répétés dans la légende. Il n'y a plus besoin de survoler. Les parts de moins de 4 % sont trop fines pour y écrire : leurs chiffres sont dans la légende |
| Budget & Compta | En-têtes de la **liste des recettes en vert clair**, et de la **liste des dépenses en rouge clair** |
| Adhérents | Nouveaux champs **« Année entrée JMB »** (année, par exemple 1978) et **« Date sortie JMB »** (date). Ils figurent dans la fiche et dans l'onglet `Adherents`. L'outil refuse une sortie antérieure à l'entrée |
| Adhérents | Communications : « Souhaite recevoir le Maillon » devient **« Souhaite recevoir le Maillon papier »**. **« Recevoir toutes les communications par mail »** est ajouté entre « Abonné à Facebook » et le Maillon papier. Les cases déjà cochées sont conservées |
| Adhérents | La liste se filtre aussi sur « Communications par mail » |
| Activités | Nouveau **camembert « Répartition des activités »** de l'année : une part par activité, avec les chiffres et les % écrits sur le camembert et dans la légende. Un menu choisit la mesure : **nombre d'inscrits** (par défaut), montant encaissé, coût total ou participation de l'association. Les activités annulées sont exclues |

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Budget & Compta, 2026 | L'anneau affiche « 17 340 € · 66 % » sur Villégiatures. La légende sous l'anneau donne chaque catégorie avec son montant et son % |
| 2 | Descendre aux listes | En-têtes de la liste des recettes en vert clair, de la liste des dépenses en rouge clair. Le tri et les filtres fonctionnent comme avant |
| 3 | Adhérents → modifier une fiche : Année entrée JMB 1975, Date sortie JMB 31/03/2012, cocher « Recevoir toutes les communications par mail », puis Enregistrer | Message « … modifié ». Dans l'onglet `Adherents`, les 3 colonnes de fin sont remplies |
| 4 | Même fiche : Date sortie JMB 31/03/1970 | Refus : « La « Date sortie JMB » est antérieure à l'« Année entrée JMB » » |
| 5 | Activités, 2026 | Camembert de 8 parts : Assemblée générale 93 (31 %), Galette 63 (21 %), Repas de fin d'année 40 (13 %)… Total 297 inscriptions. Passer la mesure à « montant encaissé » : le camembert change, et les activités gratuites disparaissent |

## Test d'import des vrais adhérents (dans une copie)

Le classeur de l'outil (`Brunants_Donnees`) **n'est jamais modifié** par ce test. L'outil fabrique une copie, `Brunants_Donnees_TEST_IMPORT_aaaa-mm-jj_hhhmm`, dans `Outil_Brunants/Tests_import`. Il y vide les données fictives et y importe les adhérents.

### Ce qui a été préparé

Le fichier **`Import_Adherents_Brunants.csv`** a été déposé dans votre dossier `Documents\Atelier brunants 2025 - 2026\Projet nouvelle Organisation`. Il contient les 398 personnes de l'onglet « Base de données », déjà mises au format de l'outil, avec vos décisions du 18/10 :

- une lettre dans « Adhérent » (V compris) donne Titulaire, et le libellé de la lettre va en commentaire ;
- un chiffre dans « Sympa. » donne Sympathisant ;
- les **décédés** vont en archives avec leur date de décès. Les « X » sont titulaires ;
- les **anciens adhérents** vont en archives avec toutes leurs coordonnées : « Désinscrit », date de fin 31/12/2024 provisoire, motif « Autre ». On peut les **réinscrire** depuis les archives ;
- les noms sont gardés tels quels (par exemple « NOM1/NOM2 ») ;
- **86 couples** sont reliés dans les deux fiches, même quand l'adresse diffère ;
- le colis, la rupture conventionnelle, l'admission exceptionnelle et le n° de l'ancien fichier vont en commentaire ;
- la cotisation est à 0 € pour la lettre S ;
- les virgules des e-mails sont corrigées ;
- les textes des colonnes téléphone vont en commentaire ;
- une date d'entrée absente devient la date du conjoint, sinon le 01/01/2000 provisoire (noté en commentaire).

Le fichier contient des données personnelles. Il ne doit aller que dans le Drive des Brunants.

### Lancer le test

1. Installer le lot 4b, comme indiqué plus haut.
2. Ouvrir drive.google.com avec le compte des Brunants, puis le dossier **Outil_Brunants**. Y **glisser** `Import_Adherents_Brunants.csv` depuis votre dossier Windows.
3. Dans l'outil : **9. Administration → Outils → 🧪 Tester l'import des adhérents (dans une copie)**, confirmer, attendre 1 à 2 minutes.
4. Résultat attendu :
   - **398 fiches importées sur 398, 0 refusée** ;
   - 233 actifs (163 titulaires, 70 sympathisants) ;
   - 85 décédés et 80 anciens adhérents en archives ;
   - 86 couples reliés ;
   - 220 fiches « à vérifier ».
5. Cliquer sur **Ouvrir la copie**. L'onglet **Rapport_import** a des filtres : les refus d'abord, puis les fiches à vérifier, avec le motif. L'onglet **Adherents** montre les fiches telles que l'outil les enregistrera.

### Vérifications suggérées dans la copie

| Fiche (onglet Adherents de la copie) | Attendu |
|---|---|
| ADH-0002 et ADH-0003 | Premier couple du fichier : titulaire et sympathisante, rattachés l'un à l'autre. Le commentaire du titulaire reprend le libellé de sa lettre et le colis |
| ADH-0074 et ADH-0075 | Couple dont le sympathisant porte un nom « A/B » : relié, nom gardé tel quel |
| ADH-0124 et ADH-0125 | Couple relié malgré des adresses différentes (noté en commentaire) |
| ADH-0157 | Lettre S : cotisation 0 € |
| ADH-0001 | Décédée en 2002 : en archives, date de décès reprise |

(Les noms ne sont pas écrits ici pour que ce document ne contienne aucune donnée personnelle.)

On peut relancer le test autant de fois que l'on veut : chaque essai fabrique une nouvelle copie. Supprimez les copies quand vous n'en avez plus besoin. Dans une copie, le menu s'appelle « Brunants (copie de test) » et l'outil refuse d'y travailler.

Si vous corrigez le fichier Excel (des dates d'entrée, par exemple), je refabrique le CSV à partir de votre dossier.

## Tests déjà passés ici

- Serveur : lots 1 à 4 (64, 35, 41 et 67 vérifications), plus 17 vérifications pour le test d'import (sur un petit fichier fictif) : l'outil n'est pas modifié, la copie est bien distincte, les couples, les décédés et les anciens sont corrects, les refus sont expliqués et la copie est protégée. Le vrai fichier est passé dans le même simulateur : 398 importées, 0 refusée. Le test du lot 4 vérifie aussi qu'une **mise à jour depuis le lot 3 ou le lot 4** renomme la colonne du Maillon sans perdre les cases cochées et ajoute les 3 colonnes.
- Navigateur : lots 1 à 4 (50, 49, 46 et 83 vérifications), plus un contrôle visuel des 2 graphiques sur ordinateur et sur téléphone.
