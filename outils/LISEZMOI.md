# `outils/` — simulateur, tests et générateurs

Rien de ce dossier ne se copie dans Apps Script. Il sert à tester l'outil **hors de Google** et à fabriquer les livrables.

## Le simulateur

`faux_gas.js` imite les services Google utilisés par l'outil (SpreadsheetApp, DriveApp, PropertiesService, LockService, MailApp, DocumentApp, UrlFetchApp, Utilities, ScriptApp…). Les vrais fichiers `.gs` tournent dessus, dans Node.js, sans compte Google.

## Les tests

| Fichiers | Ce qu'ils vérifient | Lancement |
|---|---|---|
| `test_serveur.js`, `test_serveur_lot2.js` … `test_serveur_lot6c.js`, `test_serveur_import.js` | Le code serveur, lot par lot : règles de gestion, automatismes, import, sauvegardes, mises à jour d'une version à l'autre (≈ 340 vérifications) | `node outils/test_serveur_lot6c.js` |
| `test_interface.py`, `test_interface_lot2.py` … `test_interface_lot6c.py` | L'interface dans un vrai navigateur (Playwright + Chromium), sur l'aperçu local ; indicateurs et graphiques recalculés indépendamment (≈ 370 vérifications) | `python3 outils/test_interface_lot6c.py <dossier_npm>` |
| `reference_lot3/` … `reference_lot6b/` | Le code des versions précédentes : sert aux tests de mise à jour et à l'assistant de mise à jour | — |

Tous les tests sont rejoués à chaque nouveau lot. Les données des tests sont **fictives**.

Les tests d'interface ont besoin de Chart.js (et de SheetJS pour le lot 6) en local, dans `<dossier_npm>` :

```bash
mkdir npm && cd npm
npm pack chart.js@4.4.1 chartjs-plugin-datalabels@2.2.0 xlsx@0.18.5
mkdir -p cj dl xl
tar xzf chart.js-4.4.1.tgz -C cj && tar xzf chartjs-plugin-datalabels-2.2.0.tgz -C dl && tar xzf xlsx-0.18.5.tgz -C xl
```

## Les générateurs (lancés depuis la racine du dépôt)

| Script | Produit |
|---|---|
| `construire_apercu.py` | `Apercu_local_Brunants.html` : le vrai code + le simulateur dans une seule page, pour une démonstration hors ligne |
| `construire_assistant_installation.py` | `Assistant_installation.html` : les 21 fichiers, un bouton « Copier » chacun |
| `construire_assistant_mise_a_jour.py <lot> <dossier de référence> [lot précédent]` | `Assistant_mise_a_jour_Lot<lot>.html` : seulement les fichiers modifiés depuis la référence |
| `construire_modele_import.py` | `Modele_import_adherents.xlsx` : un onglet par table importable + aide |

Les fichiers produits sont écrits à la racine ; la version livrée est rangée dans `livrables/`.
