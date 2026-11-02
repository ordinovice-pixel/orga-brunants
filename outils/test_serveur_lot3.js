/**
 * test_serveur_lot3.js — Tests du serveur pour le lot 3 (budget, compta, prestataires)
 * Lancement : node outils/test_serveur_lot3.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function nouveauContexte() {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), ctx);
  vm.runInContext('FauxGAS.installer(globalThis)', ctx);
  ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps_script', f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
let ctx = nouveauContexte();
const G = (e) => vm.runInContext(e, ctx);
let ok = 0, ko = 0;
const verif = (c, l) => { if (c) { ok++; console.log('  ✔ ' + l); } else { ko++; console.log('  ✘ ' + l); } };
const appel = (fn, ...args) => JSON.parse(JSON.stringify(ctx[fn](...JSON.parse(JSON.stringify(args)))));
function erreur(fn, motif, libelle) {
  try { fn(); verif(false, libelle + ' (aucune erreur)'); }
  catch (e) { verif(motif.test(e.message), libelle + ' → « ' + e.message.split('\n')[0] + ' »'); }
}
const somme = l => Math.round(l.reduce((s, x) => s + x.montant, 0) * 100) / 100;

console.log('\n1. Données fictives comptables');
G('setup()');
let d = appel('chargerTout');
verif(d.avertissements.length === 0, 'aucun avertissement');
verif(d.tables.Prestataires.length === 14 && d.tables.Prestataires.filter(p => p.id === 'PRE-000').length === 1, '13 prestataires + « Autre »');
verif(d.tables.Recettes.length > 40 && d.tables.Depenses.length > 100, d.tables.Recettes.length + ' recettes, ' + d.tables.Depenses.length + ' dépenses');
verif(d.tables.Depenses.every(x => x.date <= '2026-10-09') && d.tables.Recettes.every(x => x.date <= '2026-10-09'), 'aucun mouvement après le 09/10/2026');
verif(d.tables.Depenses.some(x => x.budgete === 'Hors budget') && d.tables.Recettes.some(x => x.budgete === 'Hors budget'), 'recettes et dépenses hors budget présentes');
verif(d.tables.Depenses.filter(x => x.activiteId).every(x => d.tables.Activites.some(a => a.id === x.activiteId)), 'dépenses liées à des activités existantes');
const cats8 = new Set(d.tables.Depenses.map(x => x.categorie));
verif(cats8.size === 6 && !cats8.has('4. Loisirs et animations') && !cats8.has('8. Subvention et Adhésions'), 'dépenses dans 6 des 7 catégories de dépenses (aucune activité fictive de loto ou concours)');
const b25 = d.tables.Budgets.filter(b => b.annee === 2025), dep25 = d.tables.Depenses.filter(x => x.date.startsWith('2025') && x.budgete === 'Budgété');
const pct25 = 100 * somme(dep25) / b25.reduce((s, b) => s + b.montant, 0);
verif(pct25 > 85 && pct25 < 110, 'budget 2025 consommé à ' + Math.round(pct25) + ' % (cohérent)');
const cot = d.tables.Recettes.filter(r => r.sousCategorie === '8.2 Adhésion' && r.date.startsWith('2026'));
verif(cot.length >= 4 && cot.every(r => /adhérent/.test(r.libelle)), 'cotisations 2026 regroupées par mois (' + cot.length + ' lignes)');

console.log('\n2. Mise à jour d\'une installation du lot 2');
ctx = nouveauContexte();
G('setup()');
const ss = G('FauxGAS.classeurLie');
// on remet l'état « lot 2 » : budgets du lot 1, seulement « Autre », pas de recettes ni de dépenses
const anciens = { 2025: [5700, 3300, 2400, 2300, 1900, 1400, 2000, 500], 2026: [6000, 3500, 2500, 2400, 2000, 1500, 2100, 500] };
const cats = G('CATEGORIES_BUDGET');
const fb = ss.brut('Budgets');
for (let r = 1; r < fb.d.length; r++) if (fb.d[r] && fb.d[r][0]) fb.d[r][3] = anciens[fb.d[r][1]][cats.indexOf(fb.d[r][2])];
['Recettes', 'Depenses'].forEach(t => { ss.brut(t).d.length = 1; });
const fp = ss.brut('Prestataires');
fp.d = [fp.d[0], fp.d.find(l => l && l[0] === 'PRE-000')];
const rapport = G('setup()');
d = appel('chargerTout');
verif(!/montants fictifs du lot 1 remplacés/.test(rapport) && d.tables.Budgets.length === 14, 'budgets : migration du lot 1 sans objet avec les catégories du bureau (14 budgets conservés)');
verif(/Prestataires : 13 ligne/.test(rapport) && d.tables.Prestataires.length === 14, 'prestataires chargés alors que « Autre » existait déjà');
verif(/Recettes : \d+ ligne/.test(rapport) && /Depenses : \d+ ligne/.test(rapport), 'recettes et dépenses chargées');
// budgets modifiés à la main : pas de remplacement
ctx = nouveauContexte();
G('setup()');
const fb2 = G('FauxGAS.classeurLie').brut('Budgets');
for (let r = 1; r < fb2.d.length; r++) if (fb2.d[r] && fb2.d[r][0]) fb2.d[r][3] = anciens[fb2.d[r][1]][cats.indexOf(fb2.d[r][2])];
fb2.d[1][3] = 9999;
const r3 = G('setup()');
verif(!/remplacés/.test(r3) && appel('chargerTout').tables.Budgets.some(b => b.montant === 9999), 'budgets modifiés à la main : non remplacés');

console.log('\n3. Recettes et dépenses saisies');
ctx = nouveauContexte();
G('setup()');
let r = appel('enregistrer', 'Recettes', { date: '2026-10-08', libelle: 'Cotisations octobre', montant: '45,50', categorie: '8. Subvention et Adhésions',
  sousCategorie: '8.2 Adhésion', budgete: 'Budgété', origine: 'Automatique', echeanceId: 'ECH-99999' });
let rec = r.donnees.tables.Recettes.find(x => x.id === r.id);
verif(/^REC-2026-\d{4}$/.test(r.id) && /Recette REC-2026-\d{4} créée/.test(r.message), r.message);
verif(rec.montant === 45.5 && rec.origine === 'Saisie manuelle' && rec.echeanceId === '', 'montant « 45,50 » lu ; origine forcée à « Saisie manuelle »');
erreur(() => appel('enregistrer', 'Depenses', { date: '2026-10-08', libelle: 'X', montant: 10, categorie: '8. Subvention et Adhésions', sousCategorie: '8.2 Adhésion' }),
  /inconnue pour « 8. Subvention et Adhésions » côté dépenses/, 'sous-catégorie réservée aux recettes refusée pour une dépense');
erreur(() => appel('enregistrer', 'Depenses', { date: '2026-10-08', libelle: 'X', montant: 0, categorie: '7. Fonctionnement association' }), /supérieur à 0/, 'montant nul refusé');
erreur(() => appel('enregistrer', 'Depenses', { date: '2026-10-08', libelle: 'X', montant: 10, categorie: 'Inconnue' }), /inconnue/, 'catégorie inconnue refusée');
erreur(() => appel('enregistrer', 'Depenses', { date: '2026-10-08', libelle: 'X', montant: 10, categorie: '7. Fonctionnement association', prestataireId: 'PRE-999' }), /aucun enregistrement/, 'prestataire inexistant refusé');
erreur(() => appel('enregistrer', 'Depenses', { libelle: 'X', montant: 10, categorie: '7. Fonctionnement association' }), /Date de paiement/, 'date obligatoire');
r = appel('enregistrer', 'Depenses', { date: '2025-12-20', libelle: 'Car sortie', montant: 312.4, categorie: '2. Sorties et spectacles',
  sousCategorie: '2.2 Visites et découvertes 1 journée', prestataireId: 'PRE-001', activiteId: 'ACT-2025-002', budgete: 'Hors budget' });
let dep = r.donnees.tables.Depenses.find(x => x.id === r.id);
verif(/^DEP-2025-\d{4}$/.test(r.id) && dep.prestataireId === 'PRE-001' && dep.budgete === 'Hors budget', 'dépense 2025 hors budget, liée à un prestataire et une activité : ' + r.id);
r = appel('enregistrer', 'Depenses', Object.assign({}, dep, { montant: 300 }));
verif(/modifiée/.test(r.message) && r.donnees.tables.Depenses.find(x => x.id === dep.id).montant === 300, 'modification');
r = appel('supprimer', 'Depenses', dep.id);
verif(/supprimée/.test(r.message), r.message);

console.log('\n4. Lignes automatiques protégées (une seule saisie)');
const f = G("FauxGAS.classeurLie.brut('Recettes')");
const e = f.d[0];
const ligne = e.map(() => '');
ligne[e.indexOf('ID')] = 'REC-2026-0999'; ligne[e.indexOf("Date d'encaissement")] = G('new Date(2026, 8, 1)');
ligne[e.indexOf('Libellé')] = 'Paiement échéance 1/3'; ligne[e.indexOf('Montant (€)')] = 120; ligne[e.indexOf('Catégorie')] = '1. Séjours et villégiatures';
ligne[e.indexOf('Budgété / Hors budget')] = 'Budgété'; ligne[e.indexOf('Origine')] = 'Automatique'; ligne[e.indexOf("ID de l'échéance source")] = 'ECH-00001';
f.d.push(ligne);
d = appel('chargerTout');
const auto = d.tables.Recettes.find(x => x.id === 'REC-2026-0999');
erreur(() => appel('enregistrer', 'Recettes', Object.assign({}, auto, { montant: 1 })), /créée automatiquement/, 'modification d\'une recette automatique refusée');
erreur(() => appel('supprimer', 'Recettes', 'REC-2026-0999'), /créée automatiquement/, 'suppression d\'une recette automatique refusée');

console.log('\n5. Budgets prévisionnels');
r = appel('enregistrerBudgets', 2027, { '1. Séjours et villégiatures': '18000', '7. Fonctionnement association': 950, '6. Informatique et apprentissages': '' });
let b27 = r.donnees.tables.Budgets.filter(b => b.annee === 2027);
verif(b27.length === 2 && b27.find(b => b.categorie === '1. Séjours et villégiatures').montant === 18000 && /2027 enregistrés \(2/.test(r.message), r.message + ' (case vide : pas de ligne à 0 €)');
verif(b27.every(b => /^BUD-2027-\d{2}$/.test(b.id)), 'identifiants BUD-2027-xx');
r = appel('enregistrerBudgets', 2027, { '1. Séjours et villégiatures': 18500, '7. Fonctionnement association': 950 });
verif(/1 catégorie/.test(r.message) && r.donnees.tables.Budgets.filter(b => b.annee === 2027).length === 2, 'mise à jour sans doublon : ' + r.message);
r = appel('enregistrerBudgets', 2027, { '1. Séjours et villégiatures': 18500 });
verif(/aucun changement/.test(r.message), 'aucun changement détecté');
erreur(() => appel('enregistrerBudgets', 2027, { '7. Fonctionnement association': -5 }), /positif/, 'montant négatif refusé');
erreur(() => appel('enregistrerBudgets', 2027, { 'Voyages lunaires': 5 }), /inconnue/, 'catégorie inconnue refusée');
erreur(() => appel('enregistrer', 'Budgets', { annee: 2027, categorie: '7. Fonctionnement association', montant: 1 }), /existe déjà/, 'doublon année + catégorie refusé');

console.log('\n6. Prestataires');
r = appel('enregistrer', 'Prestataires', { raisonSociale: 'Taxis du Plateau', activite: 'Transport', email: 'taxi@example.com', dateDebutRelation: '2026-09-01' });
verif(/^PRE-014$/.test(r.id) && /Prestataire PRE-014 créé/.test(r.message), r.message);
erreur(() => appel('enregistrer', 'Prestataires', { raisonSociale: 'taxis du plateau' }), /existe déjà/, 'raison sociale en double refusée');
erreur(() => appel('enregistrer', 'Prestataires', { id: 'PRE-000', raisonSociale: 'Autre chose' }), /permanente/, 'entrée « Autre » non modifiable');
erreur(() => appel('supprimer', 'Prestataires', 'PRE-000'), /permanente/, 'entrée « Autre » non supprimable');
erreur(() => appel('supprimer', 'Prestataires', 'PRE-003'), /encore utilisé[\s\S]*Depenses/, 'prestataire avec factures : suppression refusée');
r = appel('supprimer', 'Prestataires', 'PRE-014');
verif(/supprimé/.test(r.message), r.message);
erreur(() => appel('supprimer', 'Categories', d.tables.Categories.find(c => c.sousCategorie === '8.2 Adhésion').id), /encore utilisé|encore utilisée/, 'catégorie utilisée par des recettes : suppression contrôlée') ;

console.log('\n7. Renommage d\'une sous-catégorie reporté partout');
d = appel('chargerTout');
const cm = d.tables.Categories.find(c => c.sousCategorie === '1.2 Villégiature en mobil-home');
const nbAvant = d.tables.Recettes.concat(d.tables.Depenses).filter(x => x.sousCategorie === '1.2 Villégiature en mobil-home').length;
r = appel('enregistrer', 'Categories', Object.assign({}, cm, { sousCategorie: 'Mobil-home (camping)' }));
const apres = r.donnees.tables.Recettes.concat(r.donnees.tables.Depenses);
verif(nbAvant > 0 && apres.filter(x => x.sousCategorie === 'Mobil-home (camping)').length === nbAvant && !apres.some(x => x.sousCategorie === '1.2 Villégiature en mobil-home'),
  r.message + ' (' + nbAvant + ' lignes attendues)');
verif(r.donnees.avertissements.length === 0 && r.donnees.journal.some(j => j.action === 'Automatisation' && /Renommage reporté/.test(j.resume)), 'aucune ligne orpheline, renommage journalisé');

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
