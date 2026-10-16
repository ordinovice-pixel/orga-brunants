# Memory bank — Outil de gestion « Les Brunants »

Mise à jour : 16/10/2026 · Tenue par Jeff (OrdiNovice) et Claude

Cette memory bank est la **trace de référence** du projet : ce qui a été décidé, où on en est, quels fichiers existent et à quoi ils servent. Elle évite de tout redemander ou de rescanner les dossiers à chaque conversation.

## Les fichiers de la memory bank

| Fichier | Contenu | Quand le lire |
|---|---|---|
| `00-LISEZ-MOI.md` | Ce fichier : sommaire et règles de tenue | Toujours en premier |
| `01-contexte-projet.md` | Association, personnes, objectifs, contraintes, charte graphique | Pour situer le projet |
| `02-etat-avancement.md` | Où on en est, lot en cours, prochaine action, ce qu'on attend | **Au début de chaque séance de travail** |
| `03-decisions.md` | Registre numéroté des décisions (DEC-xxx), avec date et source | Avant de changer une règle ou un comportement |
| `04-architecture-technique.md` | Stack, onglets du classeur, automatisations, déploiement | Avant de toucher au code ou aux données |
| `05-carte-des-fichiers.md` | Chaque fichier (code, outils, livrables, Drive) et son rôle | Pour savoir quel fichier fait quoi |
| `06-journal-evolutions.md` | Historique daté des versions (POC puis lots) | Pour retrouver quand et pourquoi une chose a changé |
| `07-questions-ouvertes.md` | Points à trancher, avec qui et pour quand | Avant une réunion ou un nouveau lot |
| `08-lecons-et-procedures.md` | Pièges rencontrés, procédures d'installation et de mise à jour | En cas de problème ou de mise à jour dans Google |

## Règles de tenue

1. **Une information, un seul endroit.** Les autres fichiers renvoient vers lui (ex. « voir DEC-012 »).
2. **À la fin de chaque séance** (lot livré, réunion, décision) : mettre à jour `02`, ajouter une ligne dans `06`, et compléter `03` / `07` si besoin. La date de mise à jour en tête de chaque fichier est changée.
3. **Une question tranchée** passe de `07` à `03` (elle devient une décision avec un numéro).
4. **Un nouveau fichier de code ou un nouveau livrable** est ajouté dans `05` au moment où il est créé.
5. Les noms des personnes et les montants sont ceux validés par le bureau. En cas de doute (transcription automatique), le signaler par « (à vérifier) ».

## Pour Claude, au début d'une conversation

- Lire `02-etat-avancement.md` puis le fichier utile pour la demande.
- **Le dossier de travail de Claude ne survit pas d'une conversation à l'autre.** La version de référence du code est le **dernier ZIP livré** (voir `05`). Pour reprendre le développement, demander à Jeff de joindre ce ZIP ; ne pas repartir de zéro ni réécrire un fichier de mémoire.
- Méthode inchangée : modifications ciblées sur la version précédente, jamais de réécriture complète (voir DEC-030).
- Proposer en fin de séance la mise à jour de la memory bank, puis **commiter** dans le dépôt GitHub privé (voir DEC-033 et `08`).
