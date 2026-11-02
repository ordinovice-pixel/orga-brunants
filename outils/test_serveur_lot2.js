/**
 * test_serveur_lot2.js — Tests du serveur pour le lot 2 (adhérents)
 * Lancement : node outils/test_serveur_lot2.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), ctx);
vm.runInContext('FauxGAS.installer(globalThis)', ctx);
['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps_script', f), 'utf8'), ctx, { filename: f }));
const G = (e) => vm.runInContext(e, ctx);
let ok = 0, ko = 0;
const verif = (c, l) => { if (c) { ok++; console.log('  ✔ ' + l); } else { ko++; console.log('  ✘ ' + l); } };
const appel = (fn, ...args) => JSON.parse(JSON.stringify(ctx[fn](...JSON.parse(JSON.stringify(args)))));
function erreur(fn, motif, libelle) {
  try { fn(); verif(false, libelle + ' (aucune erreur)'); }
  catch (e) { verif(motif.test(e.message), libelle + ' → « ' + e.message.split('\n')[0] + ' »'); }
}
const auj = G("Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd')");
const adh = (d, id) => d.tables.Adherents.find(a => a.id === id);

console.log('\n1. Données fictives');
G('setup()');
let d = appel('chargerTout');
verif(d.avertissements.length === 0, 'aucun avertissement après chargement');
verif(d.tables.Adherents.length === 232 && d.tables.Activites.length === 15 && d.tables.MobilHome.length === 20, '232 adhérents, 15 activités, 20 mobil-home');
const r2 = G('setup()');
verif(/Adherents : déjà rempli/.test(r2) && appel('chargerTout').tables.Adherents.length === 232, 'setup() relancé : rien de dupliqué');
const emails = d.tables.Adherents.filter(a => a.email).map(a => a.email.split('@')[1]);
verif(emails.every(m => /^example\.(com|net|org)$/.test(m)), 'e-mails fictifs uniquement sur des domaines réservés');
const mh = d.tables.MobilHome;
const parTitAn = {};
mh.forEach(m => { const k = m.adherentId + m.annee; parTitAn[k] = (parTitAn[k] || 0) + (m.aideAsso > 0 ? 1 : 0); });
verif(Object.values(parTitAn).every(n => n <= 2) && mh.every(m => adh(d, m.adherentId).type === 'Titulaire'), 'mobil-home : titulaires uniquement, 2 aides au plus par an');
verif(d.tables.Inscriptions.every(i => { const a = adh(d, i.adherentId), act = d.tables.Activites.find(x => x.id === i.activiteId);
  return a && act && a.dateInscription <= act.dateDebut && (!a.dateFin || a.dateFin >= act.dateDebut); }), 'inscriptions : adhérents actifs à la date de l\'activité');

console.log('\n2. Création d\'un adhérent');
let r = appel('enregistrer', 'Adherents', { civilite: 'Mme', sexe: 'F', nom: 'Testeur', prenom: 'Lucie', dateNaissance: '1955-04-02',
  type: 'Titulaire', adresse: '1 rue du Test', codePostal: '91160', ville: 'Saulx-les-Chartreux', email: 'lucie@example.org',
  dateInscription: auj });
const idNouv = r.id;
let n = adh(r.donnees, idNouv);
verif(idNouv === 'ADH-0233' && /Adhérent ADH-0233 créé/.test(r.message), r.message);
verif(n.nom === 'TESTEUR' && n.region === 'Île-de-France' && n.cotisation === 15 && n.recoitMaillon === true, 'nom en majuscules, région calculée, cotisation 15 € et Maillon par défaut');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'F', nom: 'testeur', prenom: 'lucie', dateNaissance: '1955-04-02', type: 'Titulaire', dateInscription: auj }),
  /Doublon/, 'doublon nom + prénom + date de naissance refusé');
erreur(() => appel('enregistrer', 'Adherents', { nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: auj }), /Sexe/, 'sexe obligatoire');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: auj, codePostal: '9116', email: 'pas@mail' }),
  /5 chiffres[\s\S]*e-mail invalide|e-mail invalide[\s\S]*5 chiffres/, 'code postal et e-mail contrôlés');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: '2000-01-01', dateNaissance: '2010-01-01' }),
  /antérieure à la date de naissance/, 'inscription avant la naissance refusée');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: auj, dateNaissance: '2090-01-01' }),
  /futur/, 'naissance dans le futur refusée');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: auj, deces: true }),
  /Date du décès/, 'décès sans date refusé');
erreur(() => appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'X', prenom: 'Y', type: 'Titulaire', dateInscription: auj, desinscrit: true, dateFin: auj }),
  /Motif/, 'désinscription sans motif refusée');
erreur(() => appel('enregistrer', 'Adherents', Object.assign({}, n, { rattacheA: idNouv })), /lui-même/, 'conjoint = soi-même refusé');
erreur(() => appel('enregistrer', 'Adherents', Object.assign({}, n, { rattacheA: 'ADH-9999' })), /aucun enregistrement/, 'conjoint inexistant refusé');

console.log('\n3. Modification');
r = appel('enregistrer', 'Adherents', Object.assign({}, n, { codePostal: '45000', ville: 'Orléans', cotisation: 30, rattacheA: 'ADH-0003' }));
n = adh(r.donnees, idNouv);
verif(/modifié/.test(r.message) && n.region === 'Province' && n.cotisation === 30 && n.rattacheA === 'ADH-0003' && n.email === 'lucie@example.org', 'modification : région recalculée, autres champs conservés');
// cocher « Désinscrit » depuis la fiche, puis le décocher : date et motif effacés
r = appel('enregistrer', 'Adherents', Object.assign({}, n, { desinscrit: true, dateFin: auj, motifFin: 'Déménagement' }));
verif(adh(r.donnees, idNouv).desinscrit && adh(r.donnees, idNouv).motifFin === 'Déménagement', 'désinscription depuis la fiche');
r = appel('enregistrer', 'Adherents', Object.assign({}, adh(r.donnees, idNouv), { desinscrit: false }));
n = adh(r.donnees, idNouv);
verif(!n.desinscrit && !n.dateFin && !n.motifFin, 'case décochée : date et motif de fin effacés');

console.log('\n4. Désinscription et réinscription depuis les listes');
r = appel('desinscrire', idNouv, { motifFin: 'Santé', dateFin: auj });
n = adh(r.donnees, idNouv);
verif(n.desinscrit && n.dateFin === auj && n.motifFin === 'Santé' && /archives/.test(r.message), r.message);
verif(r.donnees.journal[0].action === 'Désinscription', 'journal : action « Désinscription »');
erreur(() => appel('desinscrire', idNouv, { motifFin: 'Santé', dateFin: auj }), /déjà dans les archives/, 'double désinscription refusée');
r = appel('reinscrire', idNouv, { date: auj, type: 'Sympathisant' });
n = adh(r.donnees, idNouv);
verif(!n.desinscrit && !n.dateFin && n.type === 'Sympathisant' && n.dateInscription === auj && /Adhésion précédente du/.test(n.commentaire), 'réinscription : fiche active, type changé, ancienne période dans le commentaire');
verif(r.donnees.journal[0].action === 'Réinscription', 'journal : action « Réinscription »');
erreur(() => appel('reinscrire', idNouv, { date: auj }), /déjà un adhérent actif/, 'réinscription d\'un actif refusée');
r = appel('desinscrire', idNouv, { motifFin: 'Décès', dateFin: auj });
n = adh(r.donnees, idNouv);
verif(n.deces && n.dateDeces === auj && n.motifFin === 'Décès' && !n.desinscrit && /décédé/.test(r.message), 'motif « Décès » : case Décès cochée, date du décès renseignée');
erreur(() => appel('reinscrire', idNouv, { date: '2090-01-01' }), /futur/, 'réinscription dans le futur refusée');
erreur(() => appel('desinscrire', 'ADH-0001', { motifFin: '', dateFin: auj }), /motif/, 'désinscription sans motif refusée');

console.log('\n5. Suppression');
const utilise = r.donnees.tables.Inscriptions[0].adherentId;
erreur(() => appel('supprimer', 'Adherents', utilise), /encore utilisé[\s\S]*Désinscrire/, 'adhérent inscrit à une activité : suppression refusée avec conseil');
r = appel('enregistrer', 'Adherents', { sexe: 'H', nom: 'Éphémère', prenom: 'Paul', type: 'Sympathisant', dateInscription: auj });
r = appel('supprimer', 'Adherents', r.id);
verif(/supprimé/.test(r.message), r.message);

console.log('\n6. Saisies à la main incohérentes');
const f = G("FauxGAS.classeurLie.brut('Adherents')");
const entetes = f.d[0];
const col = t => entetes.indexOf(t);
const ligneTest = f.d[5];
ligneTest[col('Date de fin')] = G('new Date(2026, 1, 1)');          // date de fin sans « Désinscrit »
f.d[6][col('Désinscrit')] = 'Oui';                                   // désinscrit sans date
f.d[7][col('Rattaché à (ID conjoint)')] = 'ADH-7777';                // conjoint inexistant
d = appel('chargerTout');
const motifs = d.avertissements.map(a => a.motif).join(' | ');
verif(/ni « Désinscrit » ni « Décès »/.test(motifs), 'date de fin sans case cochée signalée');
verif(/Désinscrit sans date de fin/.test(motifs), 'désinscrit sans date signalé');
verif(/ADH-7777 introuvable/.test(motifs), 'conjoint inexistant signalé');
verif(d.avertissements.every(a => a.niveau === 'À vérifier'), 'anomalies non bloquantes (lignes conservées)');

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
