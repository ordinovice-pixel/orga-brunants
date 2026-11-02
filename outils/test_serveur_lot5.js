/**
 * test_serveur_lot5.js — Choix du lot 4 tranchés le 19/10/2026 :
 *   remboursement déduit des recettes, dates d'échéances personnalisables, date des lignes mobil-home.
 * Lancement : node outils/test_serveur_lot5.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console: { log() {}, warn() {}, error: console.error }, Buffer });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), ctx);
vm.runInContext('FauxGAS.installer(globalThis)', ctx);
['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps_script', f), 'utf8'), ctx, { filename: f }));
const G = (e) => vm.runInContext(e, ctx);
let ok = 0, ko = 0;
const verif = (c, l) => { if (c) { ok++; console.info('  ✔ ' + l); } else { ko++; console.info('  ✘ ' + l); } };
const appel = (fn, ...args) => JSON.parse(JSON.stringify(ctx[fn](...JSON.parse(JSON.stringify(args)))));
function erreur(fn, motif, libelle) {
  try { fn(); verif(false, libelle + ' (aucune erreur)'); }
  catch (e) { verif(motif.test(e.message), libelle + ' → « ' + e.message.split('\n')[0] + ' »'); }
}
const auj = G("Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd')");
const an = Number(auj.slice(0, 4));
G('setup()');

console.log('\n1. Jeu fictif');
let d = appel('chargerTout');
const t = d.tables;
const remb = t.Echeances.filter(e => e.rembourse);
verif(remb.length === 1 && t.Recettes.some(r => r.id === remb[0].remboursementId && r.montant === -remb[0].montant && r.origine === 'Remboursement'),
  'le remboursement fictif est une recette négative (' + remb[0].remboursementId + ')');
verif(!t.Depenses.some(x => x.origine === 'Remboursement'), 'aucune dépense de remboursement');
const repas = t.Activites.find(a => a.datesEcheances);
const dates = [...new Set(t.Echeances.filter(e => t.Inscriptions.some(i => i.id === e.inscriptionId && i.activiteId === repas.id)).map(e => e.numero + ':' + e.datePrevue))].sort();
verif(dates.join(' ') === '1:2026-10-01 2:2026-11-15 3:2027-01-15' && repas.dateDebut === '2026-12-12', repas.nom + ' : échéances aux dates de la fiche, dont une après l\'activité (' + dates.join(', ') + ')');

console.log('\n2. Dates d\'échéances personnalisées');
const d1 = (an + 1) + '-01-10', d2 = (an + 1) + '-02-10', d3 = (an + 1) + '-04-10';
let r = appel('enregistrerActivite', { nom: 'Séjour test dates', categorie: '1. Séjours et villégiatures', dateDebut: (an + 1) + '-03-01', prixParPersonne: 300, nbEcheances: 3,
  datesEcheances: [d1, d2, d3].map(x => x.slice(8) + '/' + x.slice(5, 7) + '/' + x.slice(0, 4)).join('; '), notification: false, statut: 'Ouvert aux inscriptions' });
const idAct = r.id;
r = appel('inscrireActivite', idAct, 'ADH-0001', '');
let cases = r.donnees.tables.Echeances.filter(e => e.inscriptionId === r.id).sort((a, b) => a.numero - b.numero);
verif(cases.map(e => e.datePrevue).join(' ') === [d1, d2, d3].join(' '), 'inscription : échéances aux dates de la fiche, la 3e après l\'activité');
appel('payerEcheance', cases[0].id, auj);
let act = appel('chargerTout').tables.Activites.find(a => a.id === idAct);
const n2 = (an + 1) + '-02-20', n3 = (an + 1) + '-05-20';
r = appel('enregistrerActivite', Object.assign({}, act, { datesEcheances: '05/01/' + (an + 1) + '; 20/02/' + (an + 1) + '; 20/05/' + (an + 1), appliquerEcheances: true }));
cases = r.donnees.tables.Echeances.filter(e => e.inscriptionId === cases[0].inscriptionId).sort((a, b) => a.numero - b.numero);
verif(/2 échéance\(s\) non payée\(s\)/.test(r.message) && cases[0].datePrevue === d1 && cases[1].datePrevue === n2 && cases[2].datePrevue === n3,
  'modifier la fiche avec « appliquer » : seules les échéances non payées changent (' + r.message.split('\n')[1] + ')');
r = appel('modifierEcheance', cases[2].id, (an + 1) + '-06-30');
verif(r.donnees.tables.Echeances.find(e => e.id === cases[2].id).datePrevue === (an + 1) + '-06-30', 'modifier une échéance : ' + r.message);
erreur(() => appel('modifierEcheance', cases[0].id, (an + 1) + '-06-30'), /déjà payée/, 'échéance payée : date verrouillée');
r = appel('enregistrerActivite', { nom: 'Sortie une date', categorie: '2. Sorties et spectacles', dateDebut: (an + 1) + '-03-01', prixParPersonne: 20, nbEcheances: 1,
  datesEcheances: '15/02/' + (an + 1), notification: false });
G(`(function(){ var f = classeur_().getSheetByName('Activites'); var v = f.getDataRange().getValues(); var c = carteColonnes_(v[0], SCHEMA.Activites);
  for (var i = 1; i < v.length; i++) if (v[i][c.id] === '${r.id}') f.getRange(i + 1, c.datesEcheances + 1).setValue(new Date(${an + 1}, 1, 15, 12)); })()`);
act = appel('chargerTout').tables.Activites.find(a => a.id === r.id);
verif(act.datesEcheances === '15/02/' + (an + 1), 'une date unique transformée en date par Sheets est relue correctement (' + act.datesEcheances + ')');

console.log('\n3. Remboursement déduit des recettes');
const somme = l => Math.round(l.reduce((s, x) => s + Number(x.montant), 0) * 100) / 100;
const rec0 = somme(appel('chargerTout').tables.Recettes);
r = appel('rembourserEcheance', cases[0].id, auj);
const rr = r.donnees.tables.Recettes.find(x => x.id === r.id);
verif(rr.montant === -100 && rr.origine === 'Remboursement' && Math.abs(somme(r.donnees.tables.Recettes) - rec0 + 100) < 0.01, 'recette négative de −100 € ; total des recettes −100 €');
r = appel('annulerRemboursement', cases[0].id);
verif(!r.donnees.tables.Recettes.some(x => x.id === rr.id) && /recette REC/.test(r.message), 'annulation : ' + r.message);

console.log('\n4. Mobil-home : date des lignes comptables');
const tit = appel('chargerTout').tables.Adherents.find(a => a.type === 'Titulaire' && !a.desinscrit && !a.deces && a.dateInscription < an + '-01-01');
r = appel('enregistrerLocation', { adherentId: tit.id, campingId: 'PRE-005', semaine: (an + 1) + '-07-04', coutLocation: 400 });
let m = r.donnees.tables.MobilHome.find(x => x.id === r.id);
verif(r.donnees.tables.Depenses.find(x => x.id === m.depenseId).date === auj, 'par défaut : lignes datées du jour de la saisie');
const hier = G(`ajouterJours_('${auj}', -3)`);
r = appel('enregistrerLocation', Object.assign({}, m, { dateLignes: hier }));
m = r.donnees.tables.MobilHome.find(x => x.id === m.id);
verif(r.donnees.tables.Depenses.find(x => x.id === m.depenseId).date === hier && r.donnees.tables.Recettes.find(x => x.id === m.recetteId).date === hier, 'date choisie : dépense et recette au ' + hier);
erreur(() => appel('enregistrerLocation', Object.assign({}, m, { dateLignes: (an + 2) + '-01-01' })), /futur/, 'date de paiement dans le futur refusée');

console.log('\n5. Mise à jour d\'une installation du lot 4c');
{
  const c4 = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Buffer });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), c4);
  vm.runInContext('FauxGAS.installer(globalThis)', c4);
  const charger = (dossier) => ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(dossier, f), 'utf8'), c4, { filename: f }));
  charger(path.join(__dirname, 'reference_lot4c'));
  vm.runInContext('setup()', c4);
  const avant = JSON.parse(JSON.stringify(c4.chargerTout()));
  charger(path.join(__dirname, '..', 'apps_script'));
  vm.runInContext('setup()', c4);
  const apres = JSON.parse(JSON.stringify(c4.chargerTout()));
  verif(apres.avertissements.length === 0 && apres.tables.Recettes.length === avant.tables.Recettes.length && apres.tables.Echeances.length === avant.tables.Echeances.length,
    'setup du lot 5 sur un classeur du lot 4c : données conservées, aucun avertissement');
  const cols = (t) => vm.runInContext(`(function(){ var f = classeur_().getSheetByName('${t}'); return f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0]; })()`, c4);
  verif(cols('Echeances').indexOf('ID recette de remboursement') >= 0 && cols('Activites').some(c => /^Dates des échéances/.test(c)), 'colonnes « ID recette de remboursement » et « Dates des échéances » ajoutées');
  const e = avant.tables.Echeances.find(x => x.rembourse);
  verif(e && e.depenseId && apres.tables.Depenses.some(d => d.id === e.depenseId), 'ancien remboursement (dépense) conservé tant qu\'on ne réinitialise pas');
  const r = JSON.parse(JSON.stringify(c4.annulerRemboursement(e.id)));
  verif(!r.donnees.tables.Depenses.some(d => d.id === e.depenseId), 'un ancien remboursement s\'annule toujours : ' + r.message);
  const r2 = JSON.parse(JSON.stringify(c4.reinitialiserDonnees()));
  verif(!r2.donnees.tables.Depenses.some(d => d.origine === 'Remboursement') && r2.donnees.tables.Recettes.some(x => x.origine === 'Remboursement' && x.montant < 0), 'après réinitialisation : remboursement fictif en recette négative');
}

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
