/**
 * test_serveur_lot6b.js — Catégories et sous-catégories du bureau (dossier budgétaire V5)
 * Lancement : node outils/test_serveur_lot6b.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function contexte(dossier) {
  const c = vm.createContext({ console: { log() {}, warn() {}, error: console.error }, Buffer });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), c);
  vm.runInContext('FauxGAS.installer(globalThis)', c);
  charger(c, dossier);
  return c;
}
function charger(c, dossier) {
  ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(dossier, f), 'utf8'), c, { filename: f }));
}
const ICI = path.join(__dirname, '..', 'apps_script');
const ctx = contexte(ICI);
const G = (e) => vm.runInContext(e, ctx);
let ok = 0, ko = 0;
const verif = (c, l) => { if (c) { ok++; console.info('  ✔ ' + l); } else { ko++; console.info('  ✘ ' + l); } };
const appel = (fn, ...args) => JSON.parse(JSON.stringify(ctx[fn](...JSON.parse(JSON.stringify(args)))));
function erreur(fn, motif, libelle) {
  try { fn(); verif(false, libelle + ' (aucune erreur)'); }
  catch (e) { verif(motif.test(e.message), libelle + ' → « ' + e.message.split('\n')[0] + ' »'); }
}
const C1 = '1. Séjours et villégiatures', C7 = '7. Fonctionnement association', C8 = '8. Subvention et Adhésions';
G('setup()');
let d = appel('chargerTout');
const t = d.tables;

console.log('\n1. Catégories du bureau');
const cats = t.Categories;
const majeures = [...new Set(cats.map(c => c.categorie))];
verif(cats.length === 27 && majeures.length === 8, '8 catégories, 27 sous-catégories');
verif(majeures.join(' | ') === '1. Séjours et villégiatures | 2. Sorties et spectacles | 3. Convivialité et fêtes | 4. Loisirs et animations | 5. Culture, créativité et bien-être | 6. Informatique et apprentissages | 7. Fonctionnement association | 8. Subvention et Adhésions',
  'noms et ordre des catégories conformes au document');
const nums = cats.map(c => c.sousCategorie.split(' ')[0]);
verif(nums.join(',') === '1.1,1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3,4.1,4.2,4.3,5.1,5.2,6.1,6.2,6.3,7.1,7.2,7.3,7.4,7.5,7.6,7.7,8.1,8.2,8.3', 'sous-catégories numérotées 1.1 à 8.3 (« Randonnées » renumérotée 2.3)');
verif(cats.every(c => c.descriptif && c.descriptif.length > 10), 'chaque sous-catégorie a son descriptif « Ce qu\'elle recouvre »');
verif(cats.filter(c => c.categorie === C8).every(c => c.type === 'Recette') && cats.filter(c => c.categorie !== C8).every(c => c.type === 'Les deux'), 'types : 1 à 7 « Les deux » (dépenses et recettes liées), 8 « Recette »');
verif(cats.find(c => c.sousCategorie === '7.3 Communication et information').descriptif.indexOf('Le Maillon') === 0, 'descriptif repris du document (7.3 : « Le Maillon : imprimerie… »)');

console.log('\n2. Données d\'entraînement reclassées');
const connues = new Set(cats.map(c => c.categorie + '|' + c.sousCategorie));
const orphelines = ['Activites', 'Recettes', 'Depenses'].map(n => t[n].filter(x => !connues.has(x.categorie + '|' + x.sousCategorie)).length);
verif(orphelines.join('/') === '0/0/0', 'toutes les activités, recettes et dépenses ont une catégorie et une sous-catégorie du bureau');
verif(d.avertissements.length === 0, 'aucun avertissement');
verif(t.Budgets.length === 14 && !t.Budgets.some(b => b.categorie === C8) && new Set(t.Budgets.map(b => b.categorie)).size === 7, '14 budgets : 7 catégories de dépenses × 2025-2026 (pas de budget pour la catégorie 8)');
const sc = (tab, s) => t[tab].filter(x => x.sousCategorie === s);
verif(sc('Recettes', '8.2 Adhésion').length > 5 && sc('Recettes', '8.2 Adhésion').every(r => /^Cotisations/.test(r.libelle)), 'cotisations → 8.2 Adhésion');
verif(sc('Recettes', '8.1 Subvention').length > 0 && sc('Recettes', '8.1 Subvention').every(r => /^Subvention/.test(r.libelle)), 'subventions → 8.1 Subvention');
verif(sc('Recettes', '8.3 Dons').length === 6 && sc('Recettes', '8.3 Dons').every(r => /^Don/.test(r.libelle)), 'dons → 8.3 Dons (6 lignes)');
verif(!/maintenance informatique,/.test(cats.find(c => c.sousCategorie === '7.2 Gestion administrative et financière').descriptif) && /maintenance informatique/.test(cats.find(c => c.sousCategorie === '7.7 Services et outils informatiques').descriptif), 'maintenance informatique seulement en 7.7');
verif(t.MobilHome.every(m => t.Depenses.find(x => x.id === m.depenseId).sousCategorie === '1.2 Villégiature en mobil-home'), 'locations de mobil-home → 1.2 Villégiature en mobil-home');
verif(t.Activites.find(a => /Galette/.test(a.nom)).sousCategorie.indexOf('3.3') === 0 && t.Activites.find(a => /Assemblée/.test(a.nom)).sousCategorie === '7.1 Gouvernance associative' && t.Activites.find(a => /PSC1/.test(a.nom)).sousCategorie.indexOf('6.2') === 0,
  'activités : galette en 3.3, AG en 7.1, premiers secours en 6.2');
verif(sc('Depenses', '7.3 Communication et information').some(x => /Maillon/.test(x.libelle)) && sc('Depenses', '7.2 Gestion administrative et financière').some(x => /Assurance/.test(x.libelle)) && sc('Depenses', '7.2 Gestion administrative et financière').some(x => /tenue de compte/.test(x.libelle)),
  'fonctionnement : Maillon en 7.3, assurance et frais bancaires en 7.2');
const pay = t.Recettes.filter(r => r.echeanceId && r.activiteId);
verif(pay.length > 100 && pay.every(r => { const a = t.Activites.find(x => x.id === r.activiteId); return r.categorie === a.categorie && r.sousCategorie === a.sousCategorie; }), 'paiements des adhérents : même catégorie et sous-catégorie que l\'activité');

console.log('\n3. Saisies');
const auj = G("Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd')");
let r = appel('enregistrer', 'Recettes', { date: auj, libelle: 'Participation séjour', montant: 120, categorie: C1, sousCategorie: '1.1 Séjours 7j. et +' });
verif(/REC-/.test(r.id), 'recette dans 1.1 acceptée (participation à un séjour)');
erreur(() => appel('enregistrer', 'Depenses', { date: auj, libelle: 'X', montant: 10, categorie: C8, sousCategorie: '8.1 Subvention' }), /côté dépenses/, 'dépense en 8.1 refusée (recettes seulement)');
const tit = t.Adherents.find(a => a.type === 'Titulaire' && !a.desinscrit && !a.deces && a.dateInscription < '2026-01-01');
r = appel('enregistrerLocation', { adherentId: tit.id, campingId: 'PRE-005', semaine: (Number(auj.slice(0, 4)) + 1) + '-07-11', coutLocation: 420 });
const m = r.donnees.tables.MobilHome.find(x => x.id === r.id);
verif(r.donnees.tables.Depenses.find(x => x.id === m.depenseId).categorie === C1 && r.donnees.tables.Recettes.find(x => x.id === m.recetteId).sousCategorie === '1.2 Villégiature en mobil-home', 'nouvelle location : dépense et recette automatiques en 1.2');
const c72 = cats.find(c => c.sousCategorie === '7.2 Gestion administrative et financière');
r = appel('enregistrer', 'Categories', Object.assign({}, c72, { descriptif: c72.descriptif + ' Hors maintenance informatique (voir 7.7).' }));
verif(/7\.7/.test(r.donnees.tables.Categories.find(c => c.id === c72.id).descriptif), 'descriptif modifiable depuis Administration');
const sch = G('schemaPourInterface_()');
verif(sch.mobilHome.sousCategorie === '1.2 Villégiature en mobil-home' && sch.categoriesBudget.length === 7, 'interface : catégorie mobil-home et 7 catégories budgétaires transmises');

console.log('\n4. Mise à jour d\'un classeur du lot 6 (anciennes catégories)');
{
  const c6 = contexte(path.join(__dirname, 'reference_lot6'));
  vm.runInContext('setup()', c6);
  charger(c6, ICI);
  const rapport = vm.runInContext('setup()', c6);
  const entetes = vm.runInContext("(function(){ var f = classeur_().getSheetByName('Categories'); return f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0]; })()", c6);
  verif(Array.from(entetes).indexOf('Ce qu\'elle recouvre') >= 0, 'colonne « Ce qu\'elle recouvre » ajoutée à l\'onglet Categories');
  verif(/anciennes catégories provisoires/.test(rapport) && /Réinitialiser/.test(rapport), 'setup signale les anciennes catégories et indique la réinitialisation');
  const av = JSON.parse(JSON.stringify(c6.chargerTout()));
  verif(av.tables.Categories.length === 42 && av.avertissements.length === 0, 'sans réinitialisation, rien n\'est cassé (anciennes catégories conservées)');
  const ap = JSON.parse(JSON.stringify(c6.reinitialiserDonnees()));
  verif(ap.donnees.tables.Categories.length === 27 && ap.donnees.avertissements.length === 0 && ap.donnees.tables.Budgets.length === 14, 'après « Réinitialiser » : catégories du bureau, 14 budgets, aucun avertissement');
  verif(!/anciennes catégories/.test(vm.runInContext('setup()', c6)), 'setup suivant : plus d\'alerte');
}

console.log('\n5. Mise à jour d\'un classeur du lot 6b (décisions du 22/10)');
{
  const c6 = contexte(path.join(__dirname, 'reference_lot6b'));
  vm.runInContext('setup()', c6);
  const avant = JSON.parse(JSON.stringify(c6.chargerTout()));
  charger(c6, ICI);
  const rapport = vm.runInContext('setup()', c6);
  const ap = JSON.parse(JSON.stringify(c6.chargerTout()));
  verif(avant.tables.Categories.length === 26 && ap.tables.Categories.length === 27 && ap.tables.Categories.some(c => c.sousCategorie === '8.3 Dons' && c.type === 'Recette') && /8\.3 Dons/.test(rapport), 'setup ajoute « 8.3 Dons » sans réinitialisation');
  verif(/7\.7\)/.test(ap.tables.Categories.find(c => c.sousCategorie === '7.2 Gestion administrative et financière').descriptif) && /descriptif de 7\.2/.test(rapport), 'descriptif de 7.2 mis à jour');
  verif(Number(avant.parametres.NB_SAUVEGARDES) === 12 && Number(ap.parametres.NB_SAUVEGARDES) === 24 && /de 12 à 24/.test(rapport), 'sauvegardes conservées : 12 → 24');
  verif(ap.avertissements.length === 0 && ap.tables.Recettes.length === avant.tables.Recettes.length, 'données conservées, aucun avertissement');
  const r2 = vm.runInContext('setup()', c6);
  verif(!/8\.3 Dons|de 12 à 24|descriptif de 7\.2/.test(r2), 'setup relancé : rien à refaire');
  c6.enregistrerParametres({ NB_SAUVEGARDES: 10 });
  vm.runInContext('setup()', c6);
  verif(Number(JSON.parse(JSON.stringify(c6.chargerTout())).parametres.NB_SAUVEGARDES) === 10, 'une valeur choisie à la main (10) n\'est pas écrasée');
}

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
