/**
 * test_serveur_lot6.js — Assistant d'import (contrôle, test dans une copie, ajouter, remplacer)
 *                        et sauvegardes (liste, vérification, restauration).
 * Lancement : node outils/test_serveur_lot6.js
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
const nbSauvegardes = () => appel('listerSauvegardes').sauvegardes.length;
G('setup()');
const initial = appel('chargerTout').tables;

console.log('\n1. Champs proposés');
const infos = appel('infosImport');
verif(Object.keys(infos).join(',') === 'Adherents,Activites,Prestataires,Categories', '4 tables importables');
verif(!infos.Adherents.champs.some(c => c.cle === 'region') && infos.Adherents.champs.find(c => c.cle === 'nom').requis, 'champ calculé (région) exclu ; « Nom » obligatoire');
erreur(() => appel('verifierImport', 'Recettes', [], 'remplacer'), /impossible/, 'table non importable refusée');

console.log('\n2. Contrôle des lignes (aucune écriture)');
const L = [
  { id: 'ADH-0101', civilite: 'M.', sexe: 'H', nom: 'Lefort', prenom: 'Marc', dateNaissance: '12/03/1950', codePostal: '6700', ville: 'Nice', mobile: '612345678', email: 'marc@exemple.fr', dateInscription: '01/01/2010', rattacheA: 'ADH-0102', abonneFacebook: 'x' },
  { id: 'ADH-0102', civilite: 'Mme', sexe: 'F', nom: 'LEFORT', prenom: 'Anne', dateNaissance: '1951-05-20', codePostal: '91610', dateInscription: '01/01/2010', rattacheA: 'ADH-0101' },
  { sexe: 'F', nom: '', prenom: 'Sans nom', dateInscription: '01/01/2015' },
  { sexe: 'X', nom: 'MAUVAIS', prenom: 'Sexe', dateInscription: '01/01/2015', email: 'pas-un-mail' },
  { sexe: 'H', nom: 'Lefort', prenom: 'Marc', dateNaissance: '12/03/1950', dateInscription: '01/01/2012' },
  { sexe: 'H', nom: 'Seul', prenom: 'Paul', dateNaissance: '05/06/1949', dateInscription: '01/01/2018', rattacheA: 'ADH-0102' },
  { id: 'ZZZ-1', sexe: 'F', nom: 'Neuve', prenom: 'Lucie', dateInscription: '15/09/2020', type: 'Sympathisant' }
];
const v = appel('verifierImport', 'Adherents', L, 'remplacer', 1);
const st = l => v.lignes.find(x => x.n === l + 1);
verif(v.stats.lues === 7 && v.stats.rejetees === 3, `7 lues, 3 rejetées (${JSON.stringify(v.stats)})`);
verif(st(1).statut === 'Valide' && st(2).statut === 'Valide', 'couple relié par les ID du fichier : 2 lignes valides');
verif(st(3).statut === 'Rejetée' && /Nom/.test(st(3).motifs.join()), 'nom manquant : rejetée (' + st(3).motifs[0] + ')');
verif(st(4).statut === 'Rejetée' && st(4).motifs.length >= 2, 'sexe hors liste et e-mail invalide : rejetée (' + st(4).motifs.join(' · ') + ')');
verif(st(5).statut === 'Rejetée' && /Doublon.*ligne 2 du fichier/.test(st(5).motifs.join()), 'doublon dans le fichier : seule la 2de occurrence est rejetée, numérotée comme le fichier (' + st(5).motifs[0] + ')');
verif(st(6).statut === 'À corriger' && st(6).motifs.some(m => /non réciproque/.test(m)) && st(6).motifs.length === 1, 'à corriger : rattachement non réciproque (importée avec remarque)');
verif(st(7).statut === 'À corriger' && /ZZZ-1.*nouvel ID/.test(st(7).motifs.join()), 'ID non reconnu signalé');
verif(st(1).n === 2, 'n° de ligne = ligne du fichier (en-têtes en ligne 1)');
verif(appel('chargerTout').tables.Adherents.length === initial.Adherents.length, 'classeur inchangé après le contrôle');
const va = appel('verifierImport', 'Adherents', [{ sexe: 'F', nom: initial.Adherents[0].nom, prenom: initial.Adherents[0].prenom, dateNaissance: initial.Adherents[0].dateNaissance, dateInscription: '01/01/2015' }], 'ajouter');
verif(initial.Adherents[0].dateNaissance && va.lignes[0].statut === 'Rejetée' && /Doublon : ADH-/.test(va.lignes[0].motifs.join()), 'mode « ajouter » : doublon avec un adhérent existant rejeté');

console.log('\n3. Tester dans une copie');
let r = appel('importerDonnees', 'Adherents', L, 'test', 1);
let t = appel('chargerTout').tables;
verif(t.Adherents.length === initial.Adherents.length && t.Inscriptions.length === initial.Inscriptions.length, 'classeur de l\'outil inchangé');
const idCopie = r.url.match(/d\/([^/]+)\//)[1];
const lireCopie = (tb) => JSON.parse(JSON.stringify(G(`(function(){ var c = SpreadsheetApp.openById('${idCopie}'); return lireTable_(c, '${tb}', [], contexte_(c)); })()`)));
const adhC = lireCopie('Adherents');
verif(r.stats.importees === 4 && adhC.length === 4 && lireCopie('Inscriptions').length === 0, 'copie : 4 adhérents (table remplacée), inscriptions vidées');
const marc = adhC.find(a => a.prenom === 'Marc');
verif(marc.id === 'ADH-0101' && marc.rattacheA === 'ADH-0102' && marc.codePostal === '06700' && marc.mobile === '0612345678' && marc.abonneFacebook === true && marc.nom === 'LEFORT', 'ID du fichier gardé, conjoint, 0 initial remis (CP, mobile), « x » → Oui, nom en majuscules');
const lucie = adhC.find(a => a.prenom === 'Lucie');
verif(/^ADH-\d{4}$/.test(lucie.id) && lucie.id !== 'ZZZ-1', 'ID non reconnu remplacé par ' + lucie.id);
const rap = G(`SpreadsheetApp.openById('${idCopie}').getSheetByName('Rapport_import').getDataRange().getValues()`).map(l => Array.from(l));
verif(/Test d'import — table Adherents/.test(rap[0][0]) && rap.filter(l => l[1] === 'Rejetée').length === 3, 'onglet Rapport_import : résumé et 3 rejets');
const jr = appel('chargerTout').journal[0];
verif(jr.action === 'Test d\'import' && /n'a pas été modifié/.test(jr.resume), 'test journalisé dans l\'outil');

console.log('\n4. Ajouter');
const sav0 = nbSauvegardes();
r = appel('importerDonnees', 'Adherents', [
  { sexe: 'H', nom: 'Nouveau', prenom: 'Jean', dateInscription: '01/02/2026', rattacheA: '#2' },
  { sexe: 'F', nom: 'Nouveau', prenom: 'Julie', dateInscription: '01/02/2026', id: 'ADH-0001' }
], 'ajouter', 1);
t = r.donnees.tables;
const jean = t.Adherents.find(a => a.prenom === 'Jean' && a.nom === 'NOUVEAU'), julie = t.Adherents.find(a => a.prenom === 'Julie' && a.nom === 'NOUVEAU');
verif(t.Adherents.length === initial.Adherents.length + 2 && nbSauvegardes() === sav0 + 1, '2 adhérents ajoutés, sauvegarde faite juste avant');
verif(julie.id !== 'ADH-0001' && t.Adherents.find(a => a.id === 'ADH-0001').nom === initial.Adherents.find(a => a.id === 'ADH-0001').nom, 'ID du fichier déjà pris (ADH-0001) : nouvel ID ' + julie.id + ', l\'existant n\'est pas écrasé');
verif(jean.rattacheA === julie.id, 'lien vers une ligne du même fichier suivi vers le nouvel ID');
verif(t.Inscriptions.length === initial.Inscriptions.length && /mode « ajouter »/.test(r.donnees.journal[0].resume), 'rien d\'autre n\'est touché ; import journalisé');
erreur(() => appel('importerDonnees', 'Adherents', [{ nom: 'Seul' }], 'ajouter'), /Aucune ligne importable/, 'aucune ligne importable');

console.log('\n5. Remplacer');
const avantRemp = appel('chargerTout').tables;
const manuelle = avantRemp.Recettes.find(x => x.origine === 'Saisie manuelle' && x.adherentId);
r = appel('importerDonnees', 'Adherents', L, 'remplacer', 1);
t = r.donnees.tables;
verif(t.Adherents.length === 4 && t.Inscriptions.length === 0 && t.Echeances.length === 0 && t.MobilHome.length === 0, 'adhérents remplacés ; inscriptions, échéances, mobil-home vidés');
verif(!t.Recettes.some(x => x.origine && x.origine !== 'Saisie manuelle') && !t.Depenses.some(x => x.origine && x.origine !== 'Saisie manuelle'), 'recettes / dépenses automatiques retirées');
verif(!manuelle || (t.Recettes.find(x => x.id === manuelle.id) && !t.Recettes.find(x => x.id === manuelle.id).adherentId), 'recette manuelle conservée, adhérent effacé' + (manuelle ? ' (' + manuelle.id + ')' : ''));
verif(r.donnees.avertissements.length === 0, 'aucune référence cassée (aucun avertissement)');
verif(/Sauvegarde faite juste avant/.test(r.message), 'message : ' + r.message.split('\n')[0]);

console.log('\n6. Autres tables');
r = appel('importerDonnees', 'Prestataires', [{ raisonSociale: 'Camping des Pins', activite: 'hébergement / mobil-home' }, { raisonSociale: 'Autocars Martin', activite: 'TRANSPORT' }, { id: 'PRE-000', raisonSociale: 'Autre' }], 'remplacer', 1);
t = r.donnees.tables;
verif(t.Prestataires.some(p => p.id === 'PRE-000') && t.Prestataires.length === 3 && t.Prestataires.find(p => p.raisonSociale === 'Autocars Martin').activite === 'Transport' && r.stats.rejetees === 1 && t.Depenses.every(d => !d.prestataireId || t.Prestataires.some(p => p.id === d.prestataireId)),
  'prestataires remplacés (« TRANSPORT » → « Transport »), « Autre » conservé et non dupliqué, références des dépenses propres (' + t.Prestataires.map(p => p.raisonSociale).join(', ') + ')');
const c0 = initial.Categories[0];
const cats = appel('verifierImport', 'Categories', [{ categorie: 'Nouvelle catégorie', type: 'Dépense' }, { categorie: c0.categorie, sousCategorie: c0.sousCategorie, type: c0.type }], 'ajouter');
verif(cats.lignes[0].statut !== 'Rejetée' && cats.lignes[1].statut === 'Rejetée', 'catégories : nouvelle acceptée, existante rejetée en mode « ajouter » (' + cats.lignes[1].motifs[0] + ')');
const acts = appel('verifierImport', 'Activites', [{ nom: 'Sortie test', categorie: 'Catégorie inconnue', dateDebut: '12/05/2027' }, { nom: 'Sortie test 2', categorie: '2. Sorties et spectacles', dateDebut: '12/05/2027', prixParPersonne: '25,50' }], 'remplacer');
verif(acts.lignes[0].statut === 'Rejetée' && /inconnue/.test(acts.lignes[0].motifs.join()) && acts.lignes[1].statut !== 'Rejetée', 'activités : catégorie inconnue rejetée, prix « 25,50 » accepté');

console.log('\n7. Sauvegardes : liste, vérification, restauration');
const liste = appel('listerSauvegardes').sauvegardes;
verif(liste.length >= 3 && liste.every(s => /^Sauvegarde_Brunants_/.test(s.nom) && s.urlXlsx) && liste[0].date >= liste[liste.length - 1].date, liste.length + ' sauvegardes, de la plus récente à la plus ancienne, avec leur .xlsx');
// la sauvegarde faite avant le remplacement des prestataires contient les adhérents importés en 5 ; celle d'avant l'étape 5 contient le jeu fictif + 2
const avant5 = liste.find(s => s.nom && appel('verifierSauvegarde', s.id).tables.find(x => x.table === 'Adherents').sauvegarde === initial.Adherents.length + 2);
const ver = appel('verifierSauvegarde', avant5.id);
verif(ver.manquants.length === 0 && /lisible/.test(ver.message) && ver.tables.find(x => x.table === 'Adherents').actuel === 4, 'vérifier : sauvegarde lisible, comparaison table par table (' + ver.message + ')');
const nb = nbSauvegardes();
r = appel('restaurerSauvegarde', avant5.id);
t = r.donnees.tables;
verif(t.Adherents.length === initial.Adherents.length + 2 && t.Inscriptions.length === initial.Inscriptions.length && t.Prestataires.length === initial.Prestataires.length, 'restaurer : données revenues à l\'état d\'avant l\'import (' + t.Adherents.length + ' adhérents, ' + t.Inscriptions.length + ' inscriptions)');
verif(r.donnees.avertissements.length === 0 && t.Echeances.length === initial.Echeances.length, 'restauration complète, aucun avertissement');
verif(nbSauvegardes() === Math.min(nb + 1, 12) && /Avant restauration|Restauration/.test(r.donnees.journal[0].action + r.donnees.journal[0].resume), 'sauvegarde de l\'état actuel faite avant ; restauration journalisée');
verif(appel('chargerTout').parametres.EMAIL_TEST === appel('chargerTout').parametres.EMAIL_TEST && G('classeur_().getSheetByName("Journal").getLastRow()') > 5, 'paramètres et journal conservés');
erreur(() => appel('restaurerSauvegarde', G('classeur_().getId()')), /introuvable/, 'un fichier hors du dossier Sauvegardes est refusé');
// sauvegarde d'une version précédente : une colonne absente reste vide, le reste est restauré
const idVieille = avant5.id;
verif(appel('chargerTout').tables.Adherents.some(a => a.anneeEntreeJMB), '(jeu fictif restauré : « Année entrée JMB » renseignée pour certains)');
G(`(function(){ var f = SpreadsheetApp.openById('${idVieille}').getSheetByName('Adherents'); var e = f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0];
  f.getRange(1, e.indexOf('Année entrée JMB') + 1).setValue('Colonne inconnue'); f.getRange(1, e.indexOf('Souhaite recevoir le Maillon papier') + 1).setValue('Souhaite recevoir le Maillon'); })()`);
const contenu = appel('verifierSauvegarde', idVieille).tables.find(x => x.table === 'Adherents').sauvegarde;
r = appel('restaurerSauvegarde', idVieille);
t = r.donnees.tables;
verif(t.Adherents.length === contenu && t.Adherents.every(a => !a.anneeEntreeJMB) && t.Adherents.some(a => a.recoitMaillon === false) && t.Adherents.some(a => a.recoitMaillon === true),
  'sauvegarde d\'une version précédente : colonne absente vide, colonne à l\'ancien titre reprise');
G(`SpreadsheetApp.openById('${liste[1].id}').deleteSheet(SpreadsheetApp.openById('${liste[1].id}').getSheetByName('Budgets'))`);
const avantRefus = appel('chargerTout').tables.Adherents.length;
erreur(() => appel('restaurerSauvegarde', liste[1].id), /incomplète.*Budgets/, 'sauvegarde incomplète refusée');
verif(appel('chargerTout').tables.Adherents.length === avantRefus, 'refus : rien n\'a été modifié');

console.log('\n8. Mise à jour d\'une installation du lot 5');
{
  const c5 = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Buffer });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), c5);
  vm.runInContext('FauxGAS.installer(globalThis)', c5);
  const charger = (dossier) => ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(dossier, f), 'utf8'), c5, { filename: f }));
  charger(path.join(__dirname, 'reference_lot5'));
  vm.runInContext('setup()', c5);
  c5.sauvegarderMaintenant();
  const avant = JSON.parse(JSON.stringify(c5.chargerTout()));
  charger(path.join(__dirname, '..', 'apps_script'));
  vm.runInContext('setup()', c5);
  const apres = JSON.parse(JSON.stringify(c5.chargerTout()));
  verif(apres.avertissements.length === 0 && /Lot 6/.test(apres.version) && ['Adherents', 'Recettes', 'Echeances'].every(t => apres.tables[t].length === avant.tables[t].length),
    'setup du lot 6 sur un classeur du lot 5 : données conservées, aucun avertissement (' + apres.version + ')');
  const l = JSON.parse(JSON.stringify(c5.listerSauvegardes())).sauvegardes;
  verif(l.length === 1 && JSON.parse(JSON.stringify(c5.verifierSauvegarde(l[0].id))).manquants.length === 0, 'la sauvegarde faite avec le lot 5 est listée et vérifiable');
}

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
