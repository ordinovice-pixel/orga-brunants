# 01 — Contexte du projet

Mise à jour : 16/10/2026

## L'association

- **Les Brunants** : association d'environ 230 adhérents, composés de **titulaires** et de **sympathisants** (le mot « adhérents » désigne l'ensemble).
- Local occupé depuis 2020-2021 ; environ 7 à 8 sorties par an, des villégiatures (dont des locations de mobil-home), des animations et une AG annuelle.
- Bulletin : **le Maillon** (courrier postal, mail ou Facebook).

## Les personnes

| Personne | Rôle | Intérêt dans le projet |
|---|---|---|
| Gérard Couturier | Président, commanditaire | A rédigé la synthèse des besoins (22/07/2026) ; veut être autonome sur l'information |
| Maryse Reigadas | Trésorière | Saisie comptable unique ; fin de la double saisie |
| Guy Chonez | Coordinateur | Tenait le fichier adhérents et le calendrier partagé ; déchargé du fichier par l'outil |
| Patrice Reigadas | Responsable maquettes | Nomenclature des brochures ; abonnement Adobe / InDesign à revoir |
| Florent Rossi | Contact technique | NAS Synology DS920 |
| Jeff Madeline (OrdiNovice) | Chef de projet | Conception, développement (avec Claude), formation, mise en service |

Le bureau = président + trésorière + coordinateur. Le CA a une consultation limitée (à définir).

## Objectifs (CDC §1.2 et réunion du 11/08/2026)

1. **Alléger** les tâches récurrentes du bureau et du CA.
2. **Pérenniser et transmettre** : l'outil doit pouvoir être repris par quelqu'un d'autre, sans dépendre de la mémoire d'une personne.
3. **Une seule saisie**, plus d'oubli ni de second tableau de suivi.
4. Rendre le président **autonome** et responsabiliser bureau et CA.
5. Rester **simple** (« pas d'usine à gaz ») : MVP d'environ 80 % du besoin, puis versions successives.

## Contraintes non négociables

- Données **lisibles et modifiables à la main** (Google Sheets) ; l'outil doit continuer à fonctionner après une modification manuelle.
- Pas d'installation de logiciel côté utilisateur ; usage depuis un navigateur, en local ou à distance.
- Architecture modulaire, migration facile vers un autre ordinateur ou un autre compte.
- Respect du RGPD (volet à prévoir : responsable du fichier, contrôle des accès).

## Charte graphique

- Fond clair uniquement. Bleu principal `#1A5276`, bleu secondaire `#2E86C1`, accent ambre `#F39C12`.
- Police Calibri, 14 px minimum. Logo (pommier, soleil, bandeau jaune « Les Brunants ») en en-tête. Responsive.
- Trois zones par rubrique, toujours dans cet ordre : **Indicateurs** (bleu ciel `#E3F2FD`), **Saisie** (vert clair `#E8F5E9`), **Listes** (jaune clair `#FFF8E1`).

## Échéances

- 07/10/2026 : présentation du prototype au bureau (faite).
- **31/12/2026 : date butoir du produit minimum fonctionnel.**
- Ensuite : présentation au CA, formation, import des vraies données, mise en service.
