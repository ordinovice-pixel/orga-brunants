# Compte rendu – Présentation du prototype de l'outil de gestion (réorganisation des Brunants)

Entretien du mardi 11 août 2026 (date déduite du fichier), 2 h 11, entre Jeff (concepteur du prototype) et le président de l'association. Marise, Guy, Patrice et les autres personnes citées ne sont pas présents.

## 1. Contexte et objectifs

Jeff présente le prototype (POC, version 1.4) de l'outil de gestion, construit à partir des entretiens menés, du dernier cahier des charges et de la rencontre avec Patrice. Ce prototype n'est ni fonctionnel ni alimenté par de vraies données : il sert à se projeter. Les chiffres affichés (participants, montants, alertes) sont des exemples fictifs.

Objectifs rappelés par les deux parties :

- Alléger, pérenniser et faciliter la transmission : l'outil doit pouvoir être repris par quelqu'un d'autre (Marise, Guy) sans dépendre de la mémoire d'une personne.
- Supprimer les doubles saisies et les oublis : Marise saisit une seule fois, et le second tableau de suivi disparaît.
- Rendre le président autonome : accéder à l'information essentielle sans solliciter Marise ou Guy.
- Responsabiliser le bureau et le conseil d'administration (CA), en leur donnant un accès simple à l'information.
- Rester dans un esprit associatif : « simple, simple, simple », pas d'« usine à gaz » (ce qui ferait peur en assemblée générale).
- Viser un MVP (produit minimal utile, environ 80 % du besoin), puis des versions successives : la version 5 après cette réunion, la version 6 construite ensemble, probablement une version 7 après usage réel.
- Jeff dira quand une demande coûte trop de temps de développement (« on s'en passe »). Faire appel à un développeur externe changerait complètement le budget et les délais.

## 2. Structure de l'outil

Sept rubriques sont prévues. Les quatre premières sont prioritaires et présentées dans le prototype.

- Tableau de bord (indicateurs et alertes)
- Adhérents (titulaires et sympathisants)
- Budget et comptabilité
- Activités et événements
- Procédures : chantier à venir, sous forme de fiches en ligne (remplaçant l'équivalent du « cahier » actuel), avec dates de création et de révision, historique des versions et rappel de révision tous les 6 mois ou tous les ans
- Assemblée générale : chantier à venir, organisation jugée complexe
- Une rubrique non détaillée pendant l'entretien

L'outil s'appuie sur des bases de données existantes (tableaux type Drive). Chaque action dans l'outil alimente ces tableaux. On peut aussi saisir ou extraire des données directement dans les tableaux pour les besoins non prévus par l'outil.

## 3. Décisions par rubrique

### 3.1 Tableau de bord

À conserver :

- Effectif en temps réel : total, titulaires et sympathisants (l'effectif est nécessaire à l'AG).
- Solde annuel, taux de recouvrement des cotisations, nombre d'activités réalisées et restantes dans l'année.
- Alertes utiles, par exemple les cotisations impayées et les sorties à venir. Ce sont des rappels de mémoire précieux.
- Chronologie des prochaines activités.
- Évolution mensuelle du budget : recettes et dépenses comparées à l'année précédente (2025 / 2026), avec montant et pourcentage.
- Répartition des dépenses par catégorie, sur l'année en cours uniquement et comparable d'une année à l'autre. Pas de cumul sur plusieurs années, car une année ne ressemble pas à une autre.
- Détail des dépenses affiché au survol (infobulle) plutôt qu'au clic.
- Âge moyen : la date de naissance est gardée pour cette statistique, sans en faire une usine à gaz.

À supprimer :

- Les alertes et la liste d'anniversaires du mois : décision « anniversaire, on fait sauter ».

À revoir :

- Équipement et investissements du club. Le président en veut une trace : environ 20 000 € investis depuis l'installation dans le local en 2020, avec la possibilité de retrouver les biens et leurs factures en cas de revente ou de fermeture. Il estime toutefois cet aspect marginal aujourd'hui et ne veut pas y perdre de temps ; le listing existant est conservé de son côté.
- Ce qu'on met en avant sur le tableau de bord : le suivi des dépenses de l'année par rapport au budget. Un cumul « investissement total depuis 2020 » (total de départ fourni, puis ajout annuel) reste une option.
- Nom de la rubrique « dépense locale » : provisoire, à renommer.

### 3.2 Adhérents

Vocabulaire : « adhérents » désigne l'ensemble (environ 230 personnes) ; il comprend les titulaires et les sympathisants. Dans le prototype, l'étiquette « adhérents » utilisée pour les titulaires est remplacée par « titulaires ». Les sympathisants ont désormais le droit de vote et peuvent se présenter au CA. Ils n'ont pas accès à certains services : la distinction sert notamment aux conditions de location à la semaine (à confirmer).

Fiche adhérent :

- Champs de base : nom, prénom, date de naissance, type (titulaire ou sympathisant), adresse découpée (avec code postal, pour les statistiques province / Île-de-France), coordonnées et adresse mail.
- Date d'inscription : l'ancienneté est calculée automatiquement.
- Cotisation. Elle est aujourd'hui de 15 € pour tous. Deux à quatre personnes versent plus. Décision : prévoir un champ modifiable pour la cotisation ou le don supérieur, utile pour remercier la personne. Le point est à confirmer avec Marise et Guy, car l'information ne sert qu'une fois par an, à l'AG.
- À ajouter : la case « est abonné à la page Facebook des Brunants » (oui / non, pas l'identifiant), le canal de réception du Maillon (courrier postal, mail ou Facebook) et l'inscription à l'AG. Si Facebook est coché pour le Maillon, la personne doit être abonnée.
- Possibilité de marquer une personne à laquelle on n'envoie plus rien (par exemple une personne empêchée).

Statuts et archivage :

- Après relances, un adhérent qui ne paie pas sort du fichier actif et passe dans les « anciens » (archivés). Il peut être réinscrit.
- Pas de mailing spécifique aux anciens : un besoin marginal (3 ou 4 personnes) qui ne justifie pas un module.
- Un module de désinscription et de réinscription est à prévoir.

Rattachement des conjoints :

- Aujourd'hui, le Maillon et la convocation à l'AG sont envoyés à chaque titulaire, y compris dans un couple. Le sympathisant ne reçoit pas de convocation, et on ne change pas cette règle.
- Jeff propose un rattachement (case « en couple » ou même adresse) pour n'envoyer qu'un exemplaire postal du Maillon par couple. Cela ferait une économie (30 à 40 couples ?). Le sujet est jugé non prioritaire. À prévoir en option, sans complexifier.
- Pour l'AG, on demande au titulaire s'il vient seul ou accompagné : à gérer via le bouton AG.

Statistiques de participation (usage interne au bureau, pas de communication en AG) :

- Nombre d'adhérents participants et non participants. Exemple fictif du prototype : 156 participants et 74 non-participants sur environ 230.
- Répartition géographique des non-participants (province ou Île-de-France), pour comprendre la non-participation. Le nombre brut de non-participants n'est pas jugé pertinent.

RGPD : un volet est à prévoir (responsable du fichier, politique de conformité, contrôle des accès). Une règle existe déjà pour les comptes Facebook : pas de création sans passer par Guy et le président.

### 3.3 Budget et comptabilité

- Une seule saisie par Marise dans l'outil. Le président et le bureau consultent sans redemander à Marise. Le second tableau de suivi est supprimé.
- Il faut conserver le détail des dépenses par famille pour pouvoir calculer les cumuls. L'outil affiche ce détail sans qu'il soit ressaisi.
- Catégories : plus on les définit finement, plus les automatisations fonctionneront. Les recettes sont soit liées à une activité (avec son nom), soit non. Une erreur d'imputation peut être corrigée après coup.
- Pour le bureau, le détail des dépenses est utile ; en AG on présente seulement les grandes rubriques (animations, etc.).
- Le CA est informé du budget par des présentations produites plus vite grâce à l'outil et à l'IA, avec un rendu plus professionnel.

### 3.4 Activités et événements

Fonctions retenues :

- Création d'une activité par formulaire complet : inscrits, coût détaillé, participation de l'association, historique.
- Simulation du prix par personne selon le nombre de participants (par exemple 30, 35 ou 40), avec coûts fixes (car, guide) et coûts variables (repas). Le prototype n'a pas de simulateur ; il travaille sur la réalité. L'historique des deux dernières années sert de référence pour les sorties comparables.
- Bouton « remboursement » (désistement) : il génère automatiquement une ligne de dépense pour Marise. Prévoir aussi le paiement échelonné.
- Historique de participation par adhérent (quelles activités ?).
- Notifications et rappels automatiques : mail aux personnes intéressées lors de la création d'une activité, rappel environ 10 jours avant avec l'heure et le programme (cas cité : des personnes manquant le car lors d'un voyage), constitution automatique des groupes d'inscrits (aujourd'hui ils sont recomposés à la main).
- Rendre les organisateurs autonomes, ce qui suppose de gérer finement les droits d'accès. Il y a environ 7 à 8 sorties par an.
- Si une automatisation n'est pas possible, une procédure écrite documente la solution de contournement. Jeff préviendra si un budget mensuel devient nécessaire pour un outil.

Règles de gestion évoquées :

- Participation de l'association : plafond de 600 € par personne pour une semaine ou une escapade (à écrire dans la fiche activité). Un dérapage passé à 330 € par personne pour une semaine de ski a motivé cette règle.
- Le CA a décidé à l'unanimité d'arrêter une opération de type « panier » (transcription incertaine) : logistique lourde et inscrits qui ne venaient que pour récupérer leur panier.

### 3.5 Participation de l'association par adhérent (ex-« économie »)

- L'indicateur montre ce que l'association finance pour chaque adhérent. Il permet de savoir quelle part du budget est consommée par quel pourcentage d'adhérents.
- Renommage décidé : ne plus parler d'« économie » (« vous avez gagné ») mais de « participation » ou « subvention de l'association ». Formule retenue : « participation de la subvention associative ».
- Précautions : analyse globale et non individuelle ; accès réservé au bureau, protégé par mot de passe ; à présenter le 7 octobre avec un exemple neutre (sans nommer d'adhérent) pour préserver les susceptibilités.
- Il faudra calculer ensemble ce qui relève de la gratuité totale (par exemple l'AG, à environ 130 € par personne présente, pour celui qui vient) ou partielle.

## 4. Accès, rôles et formation

- Bureau (président, Marise, Guy) : même niveau d'information et accès à tout. Chacun a une rubrique de prédilection, mais tous doivent comprendre l'outil, pour pouvoir se suppléer.
- CA : consultation limitée. Besoins évoqués : le calendrier, l'état des inscriptions, l'évolution du budget. Jeff étudie soit des droits différenciés par rôle, soit un second outil léger de consultation réservé au CA. Il faut d'abord la liste de ce que le CA doit voir.
- Rôles : l'outil décharge Marise de la double saisie et Guy de la tenue des tableaux d'adhérents. Le président veut lui confier une autre activité, plus importante. Guy pourra garder son propre historique de son côté, mais l'outil devient la référence.
- Formation : une formation générale rapide pour le bureau (comment l'outil est construit), puis des formations spécifiques par rubrique. Pour le CA, le format reste à définir.
- Le calendrier et le planning des activités sont aujourd'hui difficiles d'accès en ligne pour certains membres. Il faut un accès simple.

## 5. Contraintes techniques

- Environnement d'hébergement à choisir (Google Drive, OneDrive ou NAS) selon les contraintes.
- Migration facile vers un nouvel ordinateur, avec une arborescence documentée.
- Ces choix conditionnent les automatisations possibles.
- Un budget mensuel pour certains outils pourrait devenir nécessaire.

## 6. Actions décidées

| Qui | Action | Échéance |
|---|---|---|
| Jeff | Produire la version 5 du prototype avec toutes les corrections de ce compte rendu, puis charger les vraies données pour repérer les problèmes techniques | Avant le 7 octobre |
| Jeff | Appliquer les corrections : « titulaires », suppression des anniversaires, remplacement de « économie » par « participation de la subvention associative », infobulle de détail des dépenses, cases Facebook / canal du Maillon / inscription AG, champ cotisation supérieure, archivage des anciens | Version 5 |
| Jeff | Ajouter la répartition géographique des non-participants et le module de désinscription / réinscription | Version 5 |
| Jeff | Étudier les droits d'accès (bureau contre CA, mot de passe) et la variante d'un outil léger de consultation pour le CA | Après réception de la liste des besoins du CA |
| Jeff | Trancher l'environnement technique et la migration ; signaler les automatisations trop coûteuses ; prévoir le volet RGPD | En continu |
| Jeff | Remettre le prototype (version 4) et le document listant les fonctionnalités sur clé USB | Pendant la réunion |
| Jeff | Rédiger les procédures (chantier ultérieur), avec révisions périodiques | Après le MVP |
| Président | Fournir la liste de ce que le CA doit pouvoir consulter (calendrier, inscriptions, évolution du budget…) | Le lendemain après-midi (12 août) |
| Président | Fournir les noms des catégories et sous-catégories de dépenses et de recettes, et le nom de la rubrique « dépense locale » | D'ici la fin de la semaine (point jeudi matin) |
| Président | Lire le prototype et le document, noter ses remarques en citant les tableaux 1, 2, 3, etc. | Avant les prochains échanges |
| Président | Confirmer avec Marise et Guy ce qui est conservé (cotisations supérieures, rattachement des couples, informations de la fiche adhérent) | Avant le 7 octobre |
| Président | Faire l'inventaire des abonnements de l'association avec Marise (à partir du compte) et vérifier avec Patrice l'abonnement Adobe / InDesign (68 €/mois, soit environ 800 €/an) : partage de licence ou alternative | À voir lors de la rencontre du 7 |
| Président | Redéfinir le rôle de Guy, désormais déchargé du fichier | Avec la mise en place de l'outil |
| Jeff et président | Point complémentaire | Jeudi matin |
| Jeff et président | Fixer les dates de rentrée, se voir en septembre et une dernière fois avant le 7 octobre pour caler le vocabulaire | Septembre |
| Jeff et président | Présentation au bureau (Marise, Guy, président) : c'est indispensable d'avoir bien avancé, car Jeff en a besoin pour valider l'interface | 7 octobre 2026 |
| Président | Présenter ensuite l'outil au CA | Après le 7 octobre |

Jeff part environ trois semaines en vacances : le président peut lui envoyer un mail ou un SMS pendant cette période pour avancer, en évitant les week-ends sauf urgence.

## 7. Points restant à trancher

- Le traitement des équipements et investissements : cumul depuis 2020, listing avec factures, ou rien sur le tableau de bord.
- Le rattachement des couples et l'envoi d'un seul Maillon par couple.
- Le nom de la rubrique « dépense locale » et la liste finale des catégories.
- Le choix de l'environnement d'hébergement (Drive, OneDrive ou NAS).
- Un outil léger pour le CA ou des droits différenciés dans le même outil.
- Le format de la formation du CA.

## 8. Autres points notés (hors réorganisation)

L'atelier IA d'octobre : écrire aux personnes venues à la dernière présentation pour savoir si elles ont travaillé le sujet et ce qu'elles attendent, avec un compromis à trouver entre reprise des bases et approfondissement.

## Note sur la fiabilité

La transcription a été faite automatiquement. Certains noms (Guy, Marise, Patrice) et quelques passages inaudibles ou tronqués sont à vérifier. Les échéances et les responsables ont parfois été déduits du contexte. Anecdotes et récits personnels ont été volontairement omis.
