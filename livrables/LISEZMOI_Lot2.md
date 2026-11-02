# Outil de gestion « Les Brunants » — Lot 2 : Adhérents

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `Assistant_mise_a_jour_Lot2.html` | **À utiliser maintenant** : les 6 fichiers modifiés depuis le lot 1, avec un bouton « Copier » pour chacun |
| `Assistant_installation.html` | Installation complète des 20 fichiers (nouveau projet uniquement, voir `LISEZMOI_Lot1.md`) |
| `Apercu_local_Brunants.html` | Aperçu hors ligne avec les données fictives (rien n'est enregistré) |
| `apps_script/` | Les 20 fichiers de la version en cours |
| `outils/` | Simulateur, tests automatiques, générateurs (ne pas copier dans Apps Script) |

## Mise à jour (≈ 10 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**. C'est conseillé, pour pouvoir revenir en arrière.
2. Ouvrir `Assistant_mise_a_jour_Lot2.html`. Pour chacun des **6 fichiers** (`Donnees.gs`, `DonneesFictives.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_Adherents.html`) :
   - cliquer sur **Copier le contenu** ;
   - dans Apps Script, cliquer dans le fichier du même nom, puis faire `Ctrl`+`A` et `Ctrl`+`V`.
3. 💾 **Enregistrer le projet** : il ne doit plus rester de point orange.
4. **Exécuter `setup`** (bouton ▶ Exécuter). Il charge les données d'entraînement dans les onglets encore vides : `Adherents`, `Activites`, `Inscriptions`, `MobilHome`. Le journal d'exécution doit afficher « Adherents : 232 ligne(s) de départ chargée(s) ».
   - Si l'onglet `Adherents` contient déjà des lignes (essais), `setup()` n'y touche pas. Pour charger le jeu fictif, il faut vider l'onglet (garder la ligne 1), puis relancer `setup`.
5. **Publier la nouvelle version** : *Déployer → Gérer les déploiements* → ✏️ → *Version : Nouvelle version* → *Déployer*. L'URL ne change pas. **Sans cette étape, l'outil reste au lot 1.**
6. Recharger l'outil (`F5`). Le bas de la barre latérale doit afficher « Lot 2 — adhérents ».

## Ce que fait le lot 2

### Indicateurs (année choisie en haut)

- **Effectif total** : titulaires et sympathisants, en nombre et en %.
- **Nouveaux arrivants**, avec la comparaison avec l'année précédente.
- **Âge moyen** et **décès de l'année**, avec les noms.
- **Répartitions** : hommes / femmes, titulaires / sympathisants, Île-de-France / province, ancienneté moyenne.
- **Tranches d'âge** du POC, dont **80–85 ans** et **plus de 85 ans**.
- **Participants / non-participants**, avec la répartition Île-de-France / province des non-participants.

### Fiche adhérent (zone Saisie)

- Tous les champs du §4 du prompt.
- La région est calculée en direct depuis le code postal.
- Le conjoint se choisit en tapant un nom.
- Les cases **Désinscrit** et **Décès** font apparaître la date et le motif de fin.
- Les contrôles sont en français : champs obligatoires, e-mail, code postal, dates cohérentes, doublon (même nom, prénom et date de naissance).

### Liste des adhérents de l'année

- Colonnes demandées : nom, prénom, type, adresse postale complète, âge, téléphone et e-mail, cotisation, Participation Association, désinscrit.
- Recherche, 5 filtres, tri et filtres en tête de colonne.
- 25 lignes par page (ou toutes), et export CSV de toutes les lignes filtrées.
- La case **Désinscrit** ouvre une fenêtre qui demande le motif et la date. Avec le motif « Décès », la fiche est enregistrée comme décédée.
- Un clic sur le **montant de Participation** ouvre l'historique de l'adhérent.

### Anciens adhérents (archives)

- Toutes les fiches désinscrites ou décédées.
- Boutons « Décès de l'année », « Autres fins d'adhésion de l'année » et « Toutes les archives ».
- Bouton **Réinscrire** sur chaque fiche.

### Historique d'un adhérent

- Activités et locations de mobil-home de l'année, ou de toutes les années.
- Pour chacune : montant payé, coût par personne, **Participation Association en € et en %**, avec le cumul.

### Côté serveur

- Les mêmes règles sont revérifiées par le serveur.
- Une suppression est refusée si la personne est utilisée ailleurs : inscriptions, mobil-home, conjoint, organisateur. Le message conseille alors de la désinscrire plutôt.
- Les incohérences saisies à la main sont signalées dans *Administration → Lignes à corriger* : date de fin sans case cochée, désinscrit sans date, conjoint ou activité inexistants…

## Règles de calcul

| Indicateur | Règle |
|---|---|
| Adhérent de l'année N | Inscrit au plus tard le 31/12/N, et fin d'adhésion (ou décès) au plus tôt le 01/01/N |
| Âge, ancienneté | Calculés à la date du jour pour l'année en cours, au 31/12 pour une année passée, ou à la date de départ si elle est antérieure |
| Participant | Au moins une inscription non annulée à une activité de N, ou une location de mobil-home en N |
| Participation Association | Coût par personne − montant payé par l'adhérent. % = participation ÷ coût (activité à 100 €, payé 30 € → 70 € soit 70 %). Pour le mobil-home : l'aide versée |

## Données d'entraînement chargées

- **232 adhérents** fictifs :
  - en 2026 : 224 adhérents dont 188 titulaires, 13 nouveaux arrivants, 3 décès, 5 désinscriptions ;
  - en 2025 : 217 adhérents, 12 nouveaux arrivants, 2 décès ;
  - 29 couples rattachés, 30 personnes sans e-mail ;
  - les e-mails utilisent les domaines réservés `example.com/.net/.org`, qui n'appartiennent à personne.
- **15 activités** 2025-2026, avec **643 inscriptions**.
- **20 locations de mobil-home** : uniquement des titulaires, au plus 2 aides de 60 € par an.
- Les échéances, recettes, dépenses et prestataires arrivent aux lots 3 et 4. Les inscriptions ne sont pas encore modifiables depuis l'outil (lot 4).

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir **Adhérents**, année 2026 | Effectif 224 (188 titulaires · 36 sympathisants), nouveaux 13, décès 3, âge moyen 72,9 ans |
| 2 | Passer l'année à 2025 | Effectif 217, nouveaux 12, décès 2. Les titres affichent « … 2025 » et la liste ne montre que 2025 |
| 3 | Créer un adhérent né en 1938 à Saulx-les-Chartreux | Message « Adhérent ADH-0233 créé ». Effectif, nouveaux et « Plus de 85 ans » augmentent de 1 sans recharger la page. Ligne visible dans l'onglet `Adherents`, avec la région remplie |
| 4 | Recréer le même nom, prénom et date de naissance | Refus « Doublon… » |
| 5 | Saisir un code postal à 4 chiffres et un e-mail sans domaine | Deux messages d'erreur en français |
| 6 | Dans la liste, cocher « Désinscrit » sur la nouvelle fiche, puis choisir un motif | La fiche passe dans les archives. Elle reste dans la liste 2026 marquée « Désinscrit », et l'effectif 2026 ne change pas |
| 7 | Archives → **Réinscrire** | La fiche revient active, et le commentaire indique l'adhésion précédente |
| 8 | Modifier la fiche → cocher **Décès** sans date, puis avec la date du jour | Refus, puis « Décès 2026 » passe à 4 |
| 9 | Supprimer ADH-0001 | Refus « Suppression impossible… utilisez plutôt Désinscrit » |
| 10 | Cliquer sur le montant de Participation d'un adhérent, puis vérifier une ligne à la main | Coût − payé = participation ; % = participation ÷ coût ; cumul juste |
| 11 | Dans le classeur, onglet `Adherents` : mettre une date de fin sur une fiche sans cocher « Désinscrit » ; puis « Actualiser » | Signalé dans *Administration → Lignes à corriger*, sans erreur |
| 12 | Liste : tri par âge, filtres Type + Région, page suivante, « Exporter en CSV » | Tri et filtres justes. Le CSV contient toutes les lignes filtrées, avec téléphone et e-mail en colonnes séparées |

## Tests déjà passés ici

- **Serveur** : 64 vérifications du lot 1 et 35 du lot 2 (règles, désinscription, réinscription, suppression, saisies à la main incohérentes, données fictives).
- **Navigateur** : 50 vérifications du lot 1 et 49 du lot 2.
  - Les 14 indicateurs ont été **recalculés indépendamment** (en Python, à partir des mêmes données) pour 2025 et 2026 : ils sont identiques.
  - La Participation Association a été vérifiée ligne par ligne sur un adhérent.
- Largeur d'écran : la liste tient en entier dès 1366 px. En dessous, la colonne Actions reste visible pendant le défilement. Sur téléphone, pas de défilement horizontal.

## Choix faits, à valider

1. **Réinscription** : la date de réinscription devient la date d'inscription, et l'ancienne période est notée dans le commentaire.
   - Conséquence : l'ancienneté repart de zéro, et la personne n'est plus comptée dans les années de sa première adhésion.
   - Alternative possible : garder la date d'origine. Mais elle serait alors comptée adhérente pendant les années où elle était partie.
2. **Liste de l'année N** : elle inclut les personnes parties pendant N, marquées « Désinscrit » ou « Décédé », car elles comptent dans l'effectif N. Les archives montrent toutes les fiches parties, toutes années confondues.
3. **Participants** : les activités **et** le mobil-home comptent. Une inscription à une activité à venir de l'année compte déjà.
4. **Téléphone et e-mail** sont affichés dans une même colonne « Téléphone · E-mail » (comme la colonne Contact du POC), pour que la liste tienne sur un écran de portable. Ils restent séparés dans l'export CSV.
5. **« Plus de 85 ans »** = 85 ans et plus (la tranche « 80–85 ans » va de 80 à 84 ans).
6. Le **nom** est enregistré en majuscules, comme dans le POC.
7. Les activités, inscriptions et locations de mobil-home fictives sont chargées **dès maintenant** (au lieu du lot 6), pour que l'historique et la Participation Association soient testables.
