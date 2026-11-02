/**
 * test_serveur_lot6c.js — Vrais adhérents en mode entraînement : import « Remplacer », protection par la
 * réinitialisation et par setup, retour à l'état fictif après restauration d'une sauvegarde antérieure.
 * Les « vrais » adhérents du test sont fictifs (adresses @exemple.fr, différentes des example.com du jeu d'essai).
 * Lancement : node outils/test_serveur_lot6c.js
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
G('setup()');
const initial = appel('chargerTout');

// 40 « vrais » adhérents, dont 2 couples ; certains champs manquent (fiches à compléter)
const noms = ['MARTIN', 'BERNARD', 'THOMAS', 'PETIT', 'ROBERT', 'RICHARD', 'DURAND', 'DUBOIS', 'MOREAU', 'LAURENT'];
const prenoms = ['Anne', 'Paul', 'Lucie', 'Jean', 'Marie', 'Louis', 'Claire', 'Henri'];
const L = [];
for (let i = 1; i <= 40; i++) {
  L.push({ id: 'ADH-' + String(i).padStart(4, '0'), sexe: i % 2 ? 'F' : 'H', nom: noms[i % 10] + (i > 10 ? i : ''), prenom: prenoms[i % 8],
    dateNaissance: i % 5 ? '0' + (1 + i % 9) + '/03/19' + (40 + i) : '', codePostal: '91160', ville: 'SAULX', adresse: i % 7 ? i + ' rue du Test' : '',
    email: i % 3 ? 'personne' + i + '@exemple.fr' : '', mobile: i % 4 ? '06000000' + String(i).padStart(2, '0') : '',
    dateInscription: i % 6 ? '01/09/20' + (10 + i % 15) : '01/01/2000', commentaire: i % 6 ? '' : 'Date d\'entrée Brunants inconnue (01/01/2000 provisoire)' });
}
L[0].rattacheA = 'ADH-0002'; L[1].rattacheA = 'ADH-0001';

console.log('\n1. Import des vrais adhérents (mode « Remplacer »)');
let r = appel('importerDonnees', 'Adherents', L, 'test', 1);
verif(appel('chargerTout').adherentsReels === null, 'un test dans une copie ne marque pas l\'outil');
r = appel('importerDonnees', 'Adherents', L, 'remplacer', 1);
let d = r.donnees;
verif(d.tables.Adherents.length === 40 && d.adherentsReels && d.adherentsReels.nb === 40, 'outil marqué « adhérents réels » (' + JSON.stringify(d.adherentsReels) + ')');
verif(d.tables.Inscriptions.length === 0 && d.tables.Echeances.length === 0 && d.tables.MobilHome.length === 0, 'inscriptions, échéances, locations fictives retirées');
verif(d.tables.Activites.length === initial.tables.Activites.length && d.tables.Activites.every(a => !a.organisateur), 'activités fictives gardées, sans organisateur');
verif(d.tables.Recettes.every(x => !x.adherentId && (x.origine === 'Saisie manuelle' || !x.origine)) && d.avertissements.length === 0, 'aucune donnée fictive accrochée à un vrai adhérent, aucun avertissement');
verif(d.parametres.MODE_ENTRAINEMENT === true, 'le mode entraînement reste actif (e-mails redirigés)');

console.log('\n2. setup() relancé (mise à jour suivante) : rien de fictif n\'est rechargé');
const rapport = G('setup()');
d = appel('chargerTout');
verif(d.tables.Inscriptions.length === 0 && d.tables.MobilHome.length === 0 && d.tables.Echeances.length === 0, 'onglets Inscriptions, Échéances, MobilHome toujours vides (pas d\'inscriptions fictives sur de vraies personnes)');
verif(/Adhérents réels conservés/.test(rapport), 'setup l\'indique dans son rapport');

console.log('\n3. Fiches complétées puis réinitialisation');
const a5 = d.tables.Adherents.find(a => a.id === 'ADH-0005');
r = appel('enregistrer', 'Adherents', Object.assign({}, a5, { dateNaissance: '1950-05-05', email: 'complete@exemple.fr' }));
appel('enregistrerActivite', Object.assign({}, d.tables.Activites[0], { nom: 'Activité modifiée' }));
const avant = appel('chargerTout').tables.Adherents;
r = appel('reinitialiserDonnees');
d = r.donnees;
verif(JSON.stringify(d.tables.Adherents) === JSON.stringify(avant), 'les 40 adhérents réels sont strictement identiques, fiche complétée comprise');
verif(/40 adhérents réels ont été conservés/.test(r.message), 'message : ' + r.message.split('\n')[1]);
verif(d.tables.Activites.length === initial.tables.Activites.length && !d.tables.Activites.some(a => a.nom === 'Activité modifiée') && d.tables.Activites.every(a => !a.organisateur), 'activités fictives rechargées (sans organisateur)');
verif(d.tables.Inscriptions.length === 0 && d.tables.MobilHome.length === 0 && d.tables.Categories.length === 27 && d.tables.Budgets.length === 14, 'pas d\'inscriptions ni de locations fictives ; catégories et budgets rechargés');
verif(d.tables.Recettes.length > 10 && d.tables.Recettes.every(x => x.origine === 'Saisie manuelle' && !x.adherentId) && d.tables.Depenses.every(x => x.origine === 'Saisie manuelle'), 'recettes et dépenses fictives saisies à la main seulement');
verif(d.avertissements.length === 0, 'aucun avertissement');
// on peut s'entraîner : inscrire un vrai adhérent à une activité fictive
const act = d.tables.Activites.find(a => a.statut === 'Ouvert aux inscriptions');
r = appel('inscrireActivite', act.id, 'ADH-0003', '');
verif(/INS-/.test(r.id), 'entraînement possible : inscription d\'un vrai adhérent à une activité fictive');

console.log('\n4. Restauration d\'une sauvegarde antérieure à l\'import');
const sav = appel('listerSauvegardes').sauvegardes;
const ancienne = sav.find(s => appel('verifierSauvegarde', s.id).tables.find(t => t.table === 'Adherents').sauvegarde === initial.tables.Adherents.length);
r = appel('restaurerSauvegarde', ancienne.id);
verif(r.donnees.tables.Adherents.length === initial.tables.Adherents.length && r.donnees.adherentsReels === null, 'adhérents fictifs revenus : l\'outil n\'est plus marqué « adhérents réels »');
r = appel('reinitialiserDonnees');
verif(r.donnees.tables.Inscriptions.length === initial.tables.Inscriptions.length && !/réels/.test(r.message), 'la réinitialisation recharge alors le jeu complet');

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
