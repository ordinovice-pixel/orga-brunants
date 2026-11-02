# Outil de gestion « Les Brunants » — Lot 4 : Activités

Version opérationnelle d'entraînement · octobre 2026 · OrdiNovice

## Mise à jour (environ 15 minutes)

1. Dans l'outil, cliquer sur **💾 Sauvegarder maintenant**.
2. Ouvrir `Assistant_mise_a_jour_Lot4.html`. Remplacer le contenu des **11 fichiers modifiés** : `Code.gs`, `Donnees.gs`, `DonneesFictives.gs`, `Automatisations.gs`, `Index.html`, `Styles.html`, `Js_Commun.html`, `Js_Adherents.html`, `Js_Budget.html`, `Js_Activites.html`, `Js_Administration.html`.
3. Cliquer sur 💾 **Enregistrer le projet**. Il ne doit plus rester aucun point orange.
4. Exécuter `setup` :
   - cliquer sur `Code.gs` ;
   - dans la liste à côté de « Débogage », choisir **setup**, et non `doGet` ;
   - cliquer sur **▷ Exécuter**.
5. **Nouvelle autorisation** : le lot 4 crée des Google Docs (les fiches d'inscription). Google affiche donc « Autorisation requise » :
   - **Examiner les autorisations**, puis choisir le compte des Brunants ;
   - si Google affiche « Google n'a pas validé cette application » : **Paramètres avancés**, puis **Accéder à … (non sécurisé)** ;
   - **Autoriser** ;
   - relancer **▷ Exécuter** si le journal n'affiche pas « Installation terminée ».
6. Publier la nouvelle version :
   - **Déployer → Gérer les déploiements** ;
   - sélectionner le déploiement actif, puis cliquer sur ✏️ ;
   - choisir **Nouvelle version**, puis **Déployer**.

   Ne pas utiliser « Nouveau déploiement ».
7. Recharger l'outil (`F5`). Le bas de la barre latérale doit afficher « Lot 4 — activités ». À la première ouverture, l'outil demande lui aussi l'autorisation : c'est normal, et chaque membre du bureau la donnera une fois.
8. **Indispensable** : 9. Administration → Outils → **↻ Réinitialiser les données d'entraînement**, puis confirmer deux fois. Comptez environ une minute.

   Les données du lot 3 n'avaient ni échéances, ni campings pour les locations, ni recettes automatiques. La réinitialisation recharge un jeu complet et cohérent. Une sauvegarde est faite juste avant.

## Ce que fait le lot 4

### Indicateurs (année choisie)

- **Activités** de l'année, réalisées et à venir.
- **Participants** et **non-participants** (à réengager), sur les adhérents et sympathisants actifs.
- **Paiements** : montant encaissé, reste dû et nombre d'échéances en attente.
- **Mobil-home** :
  - nombre de **semaines vendues**, **par camping** et au total ;
  - **montant total** des locations ;
  - **montant payé par l'association** (les aides).
- **Subventions** : part des adhérents qui ont bénéficié d'une participation de l'association, en Île-de-France et en province.
- Tableau **Coût par activité** du POC : inscrits, coût total, part de l'association, échéances payées.

### Fiche activité

- Le taux d'inscription moyen et la récurrence ont été retirés. Le champ s'appelle **« Prix par personne »**.
- **Nombre d'échéances** de 1 à 12.
- La **participation de l'association** (coût réel − prix) est calculée pendant la saisie.
- **Notification par mail** cochée par défaut. En mode entraînement, un seul mail part vers l'adresse de test, avec la liste des destinataires prévus.

### Activité sélectionnée

Un clic sur le nom d'une activité dans la liste l'ouvre.

- Résumé : inscrits / places, encaissé, reste dû, prix et part de l'association.
- **Inscrire un membre** en tapant son nom. Le maximum de places est contrôlé. Les cases de paiement sont créées automatiquement, une par échéance.
- **Suivi des paiements par participant**, avec une recherche et un filtre « reste à payer / en retard / à jour » :
  - cocher **Payé** demande la date et le mode d'encaissement, puis crée **la recette** dans Budget & Compta ;
  - décocher demande confirmation, puis supprime cette recette ;
  - **↩ Rembourser** crée **la dépense** (origine « Remboursement ») ;
  - **Désinscrire** supprime les échéances non payées. Les échéances payées restent visibles, pour un remboursement éventuel.
- **Générer la fiche d'inscription** : un Google Doc et son PDF dans `Outil_Brunants/Fiches_inscription`. La fiche contient :
  - l'en-tête : logo, nom, descriptif, dates, lieu, organisateur, nombre maximum, budget, participation demandée, somme subventionnée ;
  - le tableau : N°, Nom, Prénom, E-mail, Téléphone, puis une paire « Payé / Date » par échéance. Il y a une ligne par place.
- **Envoyer la notification** à nouveau, si besoin.

### Mobil-home et aides de 60 €

- Une location se saisit avec l'adhérent, le **camping**, la semaine et le coût. Elle crée automatiquement :
  - **la dépense** payée au camping ;
  - **la recette** de la part payée par l'adhérent.
- **L'aide est calculée par l'outil** : 60 € par semaine, **2 aides au maximum par titulaire et par an**. Les sympathisants n'y ont pas droit.
- Avant l'enregistrement, l'outil annonce l'aide prévue, ou « Plafond atteint » avec les semaines déjà aidées.
- Liste **Aides par titulaire** : semaines louées, aides utilisées « 1 / 2 » ou « 2 / 2 », et un badge « plafond atteint ». L'en-tête indique combien de titulaires sont au plafond et que **personne ne le dépasse**.

### Budget & Compta

- Les recettes et les dépenses ont désormais **Mode de paiement**, **Justificatif** et **Commentaire**, comme dans le POC.
- Le justificatif (📎) et le commentaire s'affichent sous le libellé dans les listes. Le mode de paiement est filtrable et figure dans l'export.

### Administration

- **Adresse de la liste de diffusion** (facultatif), pour les notifications : voir le choix n° 6.
- **Réinitialiser les données d'entraînement**, actif seulement en mode entraînement.

## Règles de calcul

| Élément | Règle |
|---|---|
| Année d'une activité, de ses inscriptions et de ses échéances | Année de la date de début de l'activité |
| Participation de l'association | Coût réel par personne − montant payé par l'adhérent (jamais négatif) |
| Adhérent subventionné | Participation de l'association > 0 sur l'année, activités et mobil-home compris |
| Échéances | Montant dû ÷ nombre d'échéances, au centime près. Le dernier versement absorbe l'arrondi. Les dates prévues sont réparties entre l'inscription et la veille de l'activité |
| Encaissé · reste dû | Échéances payées · échéances non payées des inscrits, pour les activités de l'année |
| Aide mobil-home | 60 € pour les **2 premières semaines de l'année** (ordre du calendrier) de chaque titulaire. L'aide ne dépasse pas le coût. Ajouter une semaine plus tôt ou en supprimer une **recalcule** les aides et la recette de l'adhérent |
| Montant total mobil-home | Somme des coûts de location de l'année |
| Montant payé par l'association | Somme des aides de l'année |

## Données d'entraînement (après réinitialisation)

- **15 activités** sur 2025 et 2026, **643 inscriptions** et **630 échéances**. Parmi elles, **494 sont payées**, chacune avec sa recette automatique, et une est remboursée.
- **20 locations de mobil-home** dans 2 campings, Les Pins Bleus et La Clairière, pour 6 titulaires en 2025 et 10 en 2026.
- **540 recettes**, dont 494 automatiques, et **110 dépenses**.
- Le chiffre des **recettes de Budget & Compta a monté** depuis le lot 3, car les participations aux activités y sont désormais : 2026 = 19 545 € de recettes, 26 222 € de dépenses, solde budget 6 397 €.

## Tests à faire dans Google

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Activités, année 2026 | **8 activités** (5 réalisées, 3 à venir), participants **177 / 224**, non-participants 47, encaissé **9 605 €** (reste dû 2 305 €, 128 échéances en attente) |
| 2 | Encart mobil-home 2026 | **12 semaines** vendues : Les Pins Bleus 8, La Clairière 4. Montant total **5 020 €**, payé par l'association **720 €** (12 aides, 10 titulaires). Liste des aides : **« 2 titulaire(s) au plafond · personne au-delà »** |
| 3 | Subventions 2026 · passer à 2025 | 2026 : 177 / 224 subventionnés, **10 011 €** ; IdF 133 / 170, province 44 / 54. 2025 : 7 activités, encaissé 11 265 €, mobil-home **8 semaines** (Pins Bleus 5, Clairière 3), 480 € d'aides |
| 4 | Nouvelle activité « Atelier cuisine », le 05/12/2026, catégorie Sorties / Visites, 3 places, 3 échéances, prix 90 €, coût réel 150 € | La participation affiche « 60 € · 40 % ». La notification est cochée. Message « Activité ACT-2026-009 créée » et « Notification : Mode entraînement… ». **Un seul mail** arrive à l'adresse de test, intitulé « [ENTRAÎNEMENT] Nouvelle activité : Atelier cuisine », avec la liste des 183 destinataires prévus |
| 5 | Inscrire 3 adhérents, puis un 4ᵉ | 3 lignes de suivi de 3 cases de 30 €. Le 4ᵉ est refusé : « Activité complète » |
| 6 | Cocher « Payé » sur une échéance (chèque) | Recettes de Budget & Compta **+30 €**. La recette porte le badge « Automatique ». Sa suppression depuis Budget & Compta est refusée, avec un renvoi vers Activités |
| 7 | Décocher cette case | Confirmation « Supprimer la recette ». La recette disparaît et les recettes reviennent à leur valeur |
| 8 | Payer une échéance, puis cliquer sur ↩ | Dépense « Remboursement » de 30 €. La case est verrouillée avec le badge « Remboursée » |
| 9 | Désinscrire un participant sans paiement | Ses cases disparaissent. Les inscrits passent à 2 / 3 |
| 10 | Générer la fiche d'inscription | Liens « ouvrir le Google Doc · ouvrir le PDF ». Les deux fichiers sont dans `Outil_Brunants/Fiches_inscription`. Le tableau a 3 lignes et les colonnes Payé 1 / Date 1 … Payé 3 / Date 3 |
| 11 | Mobil-home pour « BERNARD Suzanne », camping Les Pins Bleus, 350 €, semaines du 04/07, du 18/07 puis du 01/08/2026 | L'aide prévue s'affiche avant l'enregistrement. Aides 60 / 60 / **0** (« Plafond atteint »). Une dépense de 350 € par location, et des recettes de 290 / 290 / 350 €. Semaines vendues : 15 |
| 12 | Ajouter pour elle la semaine du 20/06, puis supprimer cette location · saisir une location pour « PERRIN Marie-Claire » (sympathisante) | L'outil prévient qu'une aide sera déplacée, et la semaine du 18/07 perd la sienne. Après la suppression, elle la retrouve. La sympathisante n'a pas d'aide (« réservée aux titulaires ») |
| 13 | Budget & Compta : dépense en « Carte bancaire », justificatif « Facture 118 », commentaire | Le 📎 et le commentaire s'affichent sous le libellé. Le filtre « Mode » fonctionne |
| 14 | Administration → Réinitialiser (double confirmation) | « Données d'entraînement réinitialisées ». Les tests 4 à 13 disparaissent et le test 1 redonne les mêmes chiffres |

## Tests déjà passés ici

- **Serveur** :
  - 65 vérifications pour le lot 4 : échéances au centime, une seule recette par paiement, remboursement, plafond des aides (y compris quand on ajoute une semaine plus tôt ou qu'on en supprime une), fiche d'inscription, notification redirigée, réinitialisation, et **mise à jour d'un classeur du lot 3** ;
  - les tests des lots 1 à 3 repassent (64, 35 et 41 vérifications).
- **Navigateur, avec Chart.js** :
  - 83 vérifications pour le lot 4. Tous les indicateurs (activités, paiements, mobil-home par camping, subventions par région, coût par activité) ont été **recalculés indépendamment** pour 2025 et 2026, puis après les saisies, avec un résultat identique. Tous les parcours des tests 4 à 14 ont été déroulés, ainsi que l'affichage sur téléphone ;
  - les tests des lots 1 à 3 repassent (50, 49 et 46 vérifications).

## Choix faits, à valider

1. **Remboursement** : il crée une **dépense « Budgété »** dans la catégorie de l'activité. Il compte donc dans le budget consommé, et la recette d'origine reste visible. L'autre solution serait de déduire le remboursement des recettes.
2. **Ordre des aides mobil-home** : les 2 aides vont aux **2 premières semaines du calendrier**, pas aux 2 premières saisies. Le résultat ne dépend donc pas de l'ordre de saisie. Est-ce bien la règle du bureau ?
3. **Dates des lignes de mobil-home** : la dépense et la recette sont datées du **jour de l'enregistrement**. On peut les dater de la semaine louée si le bureau compte ainsi.
4. **Dates prévues des échéances** : elles sont réparties automatiquement jusqu'à la veille de l'activité. Elles ne servent qu'au repérage des retards et se corrigent dans l'onglet `Echeances` si besoin.
5. **Prix modifié après les premières inscriptions** : les échéances déjà créées ne changent pas, et l'outil le signale. Le nouveau prix vaut pour les inscriptions suivantes.
6. **Notification en mode réel** : un compte Gmail gratuit envoie **100 e-mails par jour** au plus. Une annonce à tous les adhérents (183 adresses dans le jeu d'essai) serait refusée par l'outil, avec un message clair. La solution prévue est de renseigner, dans Administration, l'**adresse d'une liste de diffusion** (un groupe Google des adhérents). L'annonce ne compte alors que pour un seul envoi. Le bureau a-t-il, ou veut-il, un tel groupe ?
7. **Fiche d'inscription** : elle est **pré-remplie** avec les inscrits du moment et les paiements déjà cochés. Les lignes restantes, jusqu'au nombre de places, sont vides, pour les inscriptions sur papier.
