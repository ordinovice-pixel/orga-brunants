# Description des tables du classeur `Brunants_Donnees`

Généré à partir de la description des tables du code (`apps_script/Donnees.gs`, version lot 6c). L'outil retrouve chaque colonne par son **titre** : on peut déplacer une colonne, pas la renommer.

## Ce qu'on peut faire à la main, et ce qu'il ne faut jamais faire

Le plus sûr est de tout saisir dans l'outil : il contrôle chaque valeur et met à jour les lignes liées. Le classeur sert de stockage. Avant toute modification à la main : **💾 Sauvegarder maintenant**.

**Possible à la main** : corriger un texte, une adresse, un téléphone, un e-mail ou un commentaire ; ajouter une ligne en respectant les formats, avec un **ID nouveau et unique** au bon format ; déplacer une colonne, ou ajouter une colonne à vous à droite des autres (l'outil l'ignore). Ensuite, **⟳ Actualiser** dans l'outil : une ligne incomplète ou illisible apparaît dans *9. Administration → Lignes à corriger*.

**Jamais à la main** : changer un ID ou renommer le titre d'une colonne ; renommer, supprimer ou réordonner les onglets ; toucher aux onglets **Inscriptions**, **Echeances** et **MobilHome** ; modifier une recette ou une dépense dont l'origine est « Automatique » ou « Remboursement » ; remplir la colonne calculée (région) ; modifier **Parametres** (passer par Administration) et **Journal**.

**Formats** : dates JJ/MM/AAAA ; montants en nombre, sans le signe € ; cases Oui / Non ; codes postaux et téléphones en texte (0 initial gardé). Une liste n'accepte que ses valeurs, écrites exactement.

## Les 12 onglets

| Onglet | Contenu | ID | Saisie |
| --- | --- | --- | --- |
| Adherents | Une ligne par adhérent, actif ou en archives (désinscrit ou décédé). | ADH-0001 | Rubrique Adhérents |
| Activites | Une ligne par activité (sortie, séjour, repas, atelier…). | ACT-2026-001 | Rubrique Activités |
| Inscriptions | Une ligne par participant à une activité. Créée par « Inscrire ». | INS-00001 | Rubrique Activités (automatique) |
| Echeances | Les cases de paiement de chaque inscription : une ligne par échéance. | ECH-00001 | Rubrique Activités (automatique) |
| Recettes | Toutes les recettes : saisies à la main ou créées automatiquement (paiements, remboursements, mobil-home). | REC-2026-0001 | Budget & Compta, Activités |
| Depenses | Toutes les dépenses : saisies à la main ou créées automatiquement (location de mobil-home). | DEP-2026-0001 | Budget & Compta, Activités |
| Categories | Les catégories et sous-catégories du bureau, avec « Ce qu'elle recouvre ». | CAT-001 | Administration |
| Budgets | Le budget prévisionnel de dépenses : une ligne par année et par catégorie. | BUD-2026-01 | Budget & Compta |
| Prestataires | Les entreprises avec lesquelles l'association travaille. « Autre » (PRE-000) est permanent. | PRE-001 | Rubrique Prestataires |
| MobilHome | Une ligne par location de mobil-home (une semaine). | MH-0001 | Rubrique Activités (automatique) |
| Parametres | Les réglages de l'outil | — | Administration → Paramètres |
| Journal | La trace de toutes les opérations | — | Automatique |

## Adherents

Une ligne par adhérent, actif ou en archives (désinscrit ou décédé). Saisie : Rubrique Adhérents.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. ADH-0001 | Oui | Jamais le modifier |
| Civilité | Liste : M., Mme | Non | Oui |
| Sexe (H/F) | Liste : H, F | Oui | Oui |
| Nom | Texte | Oui | Oui |
| Prénom | Texte | Oui | Oui |
| Date de naissance | Date JJ/MM/AAAA | Non | Oui |
| Type | Liste : Titulaire, Sympathisant | Non (vide = Titulaire) | Oui |
| Adresse | Texte | Non | Oui |
| Complément d'adresse | Texte | Non | Oui |
| Code postal | Code postal, 5 chiffres (texte) | Non | Oui |
| Ville | Texte | Non | Oui |
| Région (calculée) | Calculé par l'outil | Non | Non (recalculé) |
| Mobile | Téléphone, 10 chiffres (texte) | Non | Oui |
| Téléphone fixe | Téléphone, 10 chiffres (texte) | Non | Oui |
| E-mail principal | Adresse e-mail | Non | Oui |
| E-mail secondaire | Adresse e-mail | Non | Oui |
| Date d'inscription | Date JJ/MM/AAAA | Oui | Oui |
| Année entrée JMB | Nombre de 1940 à 2100 | Non | Oui |
| Date sortie JMB | Date JJ/MM/AAAA | Non | Oui |
| Cotisation (€) | Montant en € | Non (vide = paramètre COTISATION_DEFAUT) | Oui |
| Abonné Facebook | Oui / Non | Non (vide = Non) | Oui |
| Recevoir toutes les communications par mail | Oui / Non | Non (vide = Non) | Oui |
| Souhaite recevoir le Maillon papier | Oui / Non | Non (vide = Oui) | Oui |
| Rattaché à (ID conjoint) | ID d'un adhérent (ADH-…) | Non | Oui, avec un ID existant |
| Ne plus rien envoyer | Oui / Non | Non (vide = Non) | Oui |
| Décès | Oui / Non | Non (vide = Non) | Oui |
| Date du décès | Date JJ/MM/AAAA | Non | Oui |
| Désinscrit | Oui / Non | Non (vide = Non) | Oui |
| Date de fin | Date JJ/MM/AAAA | Non | Oui |
| Motif de fin | Liste : Déménagement, Non renouvellement, Décès, Santé, Autre | Non | Oui |
| Commentaire | Texte | Non | Oui |

## Activites

Une ligne par activité (sortie, séjour, repas, atelier…). Saisie : Rubrique Activités.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. ACT-2026-001 | Oui | Jamais le modifier |
| Nom | Texte | Oui | Oui |
| Catégorie | Une catégorie existante | Oui | Oui |
| Sous-catégorie | Texte | Non | Oui |
| Organisateur (ID adhérent) | ID d'un adhérent (ADH-…) | Non | Oui, avec un ID existant |
| Date de début | Date JJ/MM/AAAA | Oui | Oui |
| Date de fin | Date JJ/MM/AAAA | Non | Oui |
| Lieu | Texte | Non | Oui |
| Descriptif | Texte | Non | Oui |
| Nombre maximum de participants | Nombre | Non | Oui |
| Budget prévu (€) | Montant en € | Non | Oui |
| Prix par personne (€) | Montant en € | Non | Oui |
| Coût réel par personne (€) | Montant en € | Non | Oui |
| Participation association par personne (€) | Montant en € | Non | Oui |
| Participation association par personne (%) | Nombre de 0 à 100 | Non | Oui |
| Nombre d'échéances | Nombre de 1 à 12 | Non (vide = 1) | Oui |
| Dates des échéances (JJ/MM/AAAA séparées par « ; ») | Texte | Non | Par l'outil (fiche activité) |
| Notification par mail | Oui / Non | Non (vide = Oui) | Oui |
| Statut | Liste : En préparation, Ouvert aux inscriptions, Complet, Terminé, Annulé | Non (vide = En préparation) | Oui |

## Inscriptions

Une ligne par participant à une activité. Créée par « Inscrire ». Saisie : Rubrique Activités (automatique). **Ne pas modifier à la main** : ces lignes sont liées entre elles et aux recettes et dépenses automatiques.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. INS-00001 | Oui | Jamais le modifier |
| ID activité | ID d'une activité (ACT-…) | Oui | Non : par l'outil |
| ID adhérent | ID d'un adhérent (ADH-…) | Oui | Non : par l'outil |
| Date d'inscription | Date JJ/MM/AAAA | Non | Non : par l'outil |
| Statut | Liste : Inscrit, Désinscrit | Non (vide = Inscrit) | Non : par l'outil |
| Montant dû (€) | Montant en € | Non | Non : par l'outil |

## Echeances

Les cases de paiement de chaque inscription : une ligne par échéance. Saisie : Rubrique Activités (automatique). **Ne pas modifier à la main** : ces lignes sont liées entre elles et aux recettes et dépenses automatiques.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. ECH-00001 | Oui | Jamais le modifier |
| ID inscription | ID d'une inscription (INS-…) | Oui | Non : par l'outil |
| Numéro d'échéance | Nombre de 1 à 12 | Non | Non : par l'outil |
| Montant (€) | Montant en € | Non | Non : par l'outil |
| Date prévue | Date JJ/MM/AAAA | Non | Non : par l'outil |
| Payé | Oui / Non | Non (vide = Non) | Non : par l'outil |
| Date de paiement | Date JJ/MM/AAAA | Non | Non : par l'outil |
| ID recette générée | Texte | Non | Non : par l'outil |
| Remboursé | Oui / Non | Non (vide = Non) | Non : par l'outil |
| ID dépense générée | Texte | Non | Non : par l'outil |
| ID recette de remboursement | Texte | Non | Non : par l'outil |

## Recettes

Toutes les recettes : saisies à la main ou créées automatiquement (paiements, remboursements, mobil-home). Saisie : Budget & Compta, Activités. Les lignes dont l'origine est « Automatique » ou « Remboursement » ne se modifient jamais à la main : elles se corrigent depuis la rubrique Activités.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. REC-2026-0001 | Oui | Jamais le modifier |
| Date d'encaissement | Date JJ/MM/AAAA | Oui | Oui |
| Libellé | Texte | Oui | Oui |
| Montant (€) | Montant en € | Oui | Oui |
| Catégorie | Une catégorie existante | Oui | Oui |
| Sous-catégorie | Texte | Non | Oui |
| ID activité | ID d'une activité (ACT-…) | Non | Oui, avec un ID existant |
| ID adhérent | ID d'un adhérent (ADH-…) | Non | Oui, avec un ID existant |
| Budgété / Hors budget | Liste : Budgété, Hors budget | Non (vide = Budgété) | Oui |
| Origine | Liste : Saisie manuelle, Automatique, Remboursement | Non (vide = Saisie manuelle) | Jamais |
| ID de l'échéance source | Texte | Non | Jamais |
| Mode d'encaissement | Liste : Chèque, Virement, Carte bancaire, Espèces, Prélèvement | Non | Oui |
| Justificatif | Texte | Non | Oui |
| Commentaire | Texte | Non | Oui |

## Depenses

Toutes les dépenses : saisies à la main ou créées automatiquement (location de mobil-home). Saisie : Budget & Compta, Activités. Les lignes dont l'origine est « Automatique » ou « Remboursement » ne se modifient jamais à la main : elles se corrigent depuis la rubrique Activités.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. DEP-2026-0001 | Oui | Jamais le modifier |
| Date de paiement | Date JJ/MM/AAAA | Oui | Oui |
| Libellé | Texte | Oui | Oui |
| Montant (€) | Montant en € | Oui | Oui |
| Catégorie | Une catégorie existante | Oui | Oui |
| Sous-catégorie | Texte | Non | Oui |
| ID prestataire | ID d'un prestataire (PRE-…) | Non | Oui, avec un ID existant |
| ID activité | ID d'une activité (ACT-…) | Non | Oui, avec un ID existant |
| Budgété / Hors budget | Liste : Budgété, Hors budget | Non (vide = Budgété) | Oui |
| Origine | Liste : Saisie manuelle, Automatique, Remboursement | Non (vide = Saisie manuelle) | Jamais |
| ID source | Texte | Non | Jamais |
| Mode de paiement | Liste : Chèque, Virement, Carte bancaire, Espèces, Prélèvement | Non | Oui |
| Justificatif | Texte | Non | Oui |
| Commentaire | Texte | Non | Oui |

## Categories

Les catégories et sous-catégories du bureau, avec « Ce qu'elle recouvre ». Saisie : Administration. Renommer une sous-catégorie depuis Administration la renomme partout ; à la main, les recettes et dépenses ne suivraient pas.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. CAT-001 | Oui | Jamais le modifier |
| Catégorie | Texte | Oui | Oui |
| Sous-catégorie | Texte | Non | Oui |
| Type | Liste : Recette, Dépense, Les deux | Non (vide = Les deux) | Oui |
| Ce qu'elle recouvre | Texte | Non | Oui |

## Budgets

Le budget prévisionnel de dépenses : une ligne par année et par catégorie. Saisie : Budget & Compta.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. BUD-2026-01 | Oui | Jamais le modifier |
| Année | Nombre de 2000 à 2100 | Oui | Oui |
| Catégorie | Une catégorie existante | Oui | Oui |
| Budget prévisionnel (€) | Montant en € | Oui | Oui |

## Prestataires

Les entreprises avec lesquelles l'association travaille. « Autre » (PRE-000) est permanent. Saisie : Rubrique Prestataires.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. PRE-001 | Oui | Jamais le modifier |
| Raison sociale | Texte | Oui | Oui |
| Activité | Liste : Transport, Restauration / traiteur, Hébergement / mobil-home, Animation / intervenant, Fournitures / matériel, Assurance, Impression / communication, Autre | Non | Oui |
| Adresse | Texte | Non | Oui |
| Code postal | Code postal, 5 chiffres (texte) | Non | Oui |
| Ville | Texte | Non | Oui |
| Contact | Texte | Non | Oui |
| Téléphone | Téléphone, 10 chiffres (texte) | Non | Oui |
| E-mail | Adresse e-mail | Non | Oui |
| Site web | Texte | Non | Oui |
| SIRET | Texte | Non | Oui |
| Date de début de la relation | Date JJ/MM/AAAA | Non | Oui |
| Commentaire | Texte | Non | Oui |

## MobilHome

Une ligne par location de mobil-home (une semaine). Saisie : Rubrique Activités (automatique). **Ne pas modifier à la main** : ces lignes sont liées entre elles et aux recettes et dépenses automatiques.

| Colonne | Contenu | Obligatoire | À la main |
| --- | --- | --- | --- |
| ID | Identifiant, ex. MH-0001 | Oui | Jamais le modifier |
| ID adhérent | ID d'un adhérent (ADH-…) | Oui | Non : par l'outil |
| Année | Nombre de 2000 à 2100 | Oui | Non : par l'outil |
| Semaine (date de début) | Date JJ/MM/AAAA | Non | Non : par l'outil |
| Coût de la location (€) | Montant en € | Non | Non : par l'outil |
| Aide de l'association (€) | Montant en € | Non | Non : par l'outil |
| Montant payé par l'adhérent (€) | Montant en € | Non | Non : par l'outil |
| ID camping (prestataire) | ID d'un prestataire (PRE-…) | Non | Non : par l'outil |
| ID dépense générée | Texte | Non | Non : par l'outil |
| ID recette générée | Texte | Non | Non : par l'outil |

## Parametres

Les réglages de l'outil, une ligne par paramètre. Modifiez-les dans **9. Administration → Paramètres**, pas ici : l'outil contrôle les valeurs. Colonnes : Clé (ne jamais changer), Paramètre, Valeur, Description.

| Clé | Paramètre | Valeur de départ |
| --- | --- | --- |
| MODE_ENTRAINEMENT | Mode entraînement | Oui |
| EMAIL_TEST | E-mail de test | (à saisir) |
| AIDE_MOBILHOME | Montant de l'aide mobil-home (€) | 60 |
| NB_AIDES_MOBILHOME | Nombre d'aides mobil-home par titulaire et par an | 2 |
| DEPARTEMENTS_IDF | Départements d'Île-de-France | 75, 77, 78, 91, 92, 93, 94, 95 |
| NB_SAUVEGARDES | Nombre de sauvegardes conservées | 24 |
| EMAIL_LISTE | Adresse de la liste de diffusion (facultatif) | (à saisir) |
| COTISATION_DEFAUT | Cotisation par défaut (€) | 15 |

## Journal

Toutes les opérations faites par l'outil, de la plus récente à la plus ancienne : Date et heure, Utilisateur, Action, Table, ID, Résumé. **Ne jamais modifier** : c'est la trace de qui a fait quoi.
