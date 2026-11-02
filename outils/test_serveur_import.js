/**
 * test_serveur_import.js — Test d'import des adhérents dans une COPIE du classeur (données fictives)
 * Lancement : node outils/test_serveur_import.js [fichier.csv]
 *   sans argument : petit CSV fictif construit ici ; avec un fichier : import de ce fichier (contrôle local).
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
const appel = (fn, ...args) => JSON.parse(JSON.stringify(ctx[fn](...args)));

G('setup()');
const avant = appel('chargerTout');
const idDossier = G("PropertiesService.getScriptProperties().getProperty('ID_DOSSIER')");

console.info('\n1. Sans fichier d\'import');
try { appel('testerImportAdherents'); verif(false, 'erreur attendue'); }
catch (e) { verif(/introuvable/.test(e.message), 'message clair : ' + e.message.split('\n')[0]); }

const ENTETES = 'ID;Civilité;Sexe (H/F);Nom;Prénom;Date de naissance;Type;Adresse;Complément d\'adresse;Code postal;Ville;Région (calculée);Mobile;Téléphone fixe;E-mail principal;E-mail secondaire;Date d\'inscription;Année entrée JMB;Date sortie JMB;Cotisation (€);Abonné Facebook;Recevoir toutes les communications par mail;Souhaite recevoir le Maillon papier;Rattaché à (ID conjoint);Ne plus rien envoyer;Décès;Date du décès;Désinscrit;Date de fin;Motif de fin;Commentaire;Statut ancien fichier;À vérifier (import)';
const fictif = [ENTETES,
  'ADH-0001;M.;H;DURAND;Paul;05/02/1948;Titulaire;1 rue A;;91610;BALLANCOURT;;0600000101;0100000102;paul@exemple.fr;;01/01/2004;1977;31/12/2003;15;Non;Non;Oui;ADH-0002;Non;Non;;Non;;;N° ancien fichier : 2 · Exemple fictif, en couple;Actif;',
  'ADH-0002;Mme;F;DURAND;Lise;21/10/1949;Sympathisant;1 rue A;;91610;BALLANCOURT;;600000103;;lise@exemple.fr;;01/01/2004;;;15;Non;Non;Oui;ADH-0001;Non;Non;;Non;;;Date du conjoint reprise;Actif;',
  'ADH-0003;Mme;F;MARTIN;Rose;;Titulaire;2 rue B;;75014;PARIS;;;;;;01/01/2000;;;0;Non;Non;Non;;Non;Non;;Non;;;Spécificité (gratuité);Actif;Date d\'entrée Brunants à compléter',
  'ADH-0004;Mme;F;FICTIVE;Odette;08/06/1939;Titulaire;;;;;;;;;;01/01/2000;1980;30/06/1996;15;Non;Non;Non;;Oui;Oui;14/03/2003;Non;14/03/2003;Décès;;Décédé;',
  'ADH-0005;M.;H;COSTE;Jean;;Sympathisant;3 rue C;;6700;NICE;;;;;;01/01/2000;;;15;Non;Non;Non;;Non;Non;;Oui;31/12/2024;Autre;Ancien adhérent;Ancien adhérent;',
  'ADH-0006;M.;H;ERREUR;Sans date;;Titulaire;;;;;;;;mauvais@;;;;;15;Non;Non;Non;;Non;Non;;Non;;;;Actif;',
  'ADH-0007;Mme;F;"VIRGULE; GUILLEMETS";Anne;;Sympathisant;4 rue D;;91160;SAULX;;;;;;01/01/2010;;;15;Non;Non;Non;ADH-0001;Non;Non;;Non;;;;Actif;'
].join('\r\n');
const fichierArg = process.argv[2];
G('FauxGAS').deposerFichier('Import_Adherents_Brunants.csv', fichierArg ? fs.readFileSync(fichierArg, 'utf8') : '﻿' + fictif, idDossier);

console.info('\n2. Test d\'import');
const r = appel('testerImportAdherents');
const s = r.stats;
console.info('   ' + r.message);
const apres = appel('chargerTout');
verif(apres.tables.Adherents.length === avant.tables.Adherents.length && apres.tables.Recettes.length === avant.tables.Recettes.length,
  'classeur de l\'outil inchangé (' + apres.tables.Adherents.length + ' adhérents fictifs)');
verif(apres.journal[0].action === 'Test d\'import' && /n'a pas été modifié/.test(apres.journal[0].resume), 'test journalisé dans l\'outil');
const idCopie = r.url.match(/d\/([^/]+)\//)[1];
verif(idCopie !== G('classeur_().getId()') && /^Brunants_Donnees_TEST_IMPORT_/.test(r.nom), 'copie distincte : ' + r.nom);
const dossierCopie = G(`DriveApp.getFileById('${idCopie}').getParents().next().getName()`);
verif(dossierCopie === 'Tests_import', 'copie rangée dans Outil_Brunants/Tests_import');
const lireCopie = (t) => JSON.parse(JSON.stringify(G(`(function(){ var c = SpreadsheetApp.openById('${idCopie}'); var a = []; return lireTable_(c, '${t}', a, contexte_(c)); })()`)));
const adh = lireCopie('Adherents');
if (!fichierArg) {
  verif(s.lus === 7 && s.importes === 6 && s.refuses === 1, `7 lignes lues, 6 importées, 1 refusée (lu ${s.lus}, importé ${s.importes}, refusé ${s.refuses})`);
  verif(lireCopie('Recettes').length === 0 && lireCopie('Activites').length === 0 && lireCopie('Prestataires').length === 1, 'copie : données fictives vidées, « Autre » conservé');
  const p = adh.find(a => a.id === 'ADH-0001'), l = adh.find(a => a.id === 'ADH-0002');
  verif(p.rattacheA === 'ADH-0002' && l.rattacheA === 'ADH-0001' && l.mobile === '0600000103', 'couple relié dans les deux sens ; 0 du portable remis');
  verif(adh.find(a => a.id === 'ADH-0003').cotisation === 0, 'gratuité : cotisation 0 €');
  const d = adh.find(a => a.id === 'ADH-0004'), c = adh.find(a => a.id === 'ADH-0005');
  verif(d.deces && d.dateDeces === '2003-03-14' && c.desinscrit && c.dateFin === '2024-12-31', 'décédé et ancien adhérent en archives');
  verif(c.codePostal === '06700' && c.region === 'Province', 'code postal « 6700 » (zéro perdu par Excel) → 06700');
  verif(!adh.some(a => a.id === 'ADH-0006'), 'ligne sans date d\'inscription et à e-mail invalide refusée');
  verif(adh.find(a => a.id === 'ADH-0007').nom === 'VIRGULE; GUILLEMETS', 'CSV : point-virgule entre guillemets bien lu');
  const rap = G(`SpreadsheetApp.openById('${idCopie}').getSheetByName('Rapport_import').getDataRange().getValues()`).map(l => Array.from(l));
  const refus = rap.find(l => l[1] === 'ADH-0006'), nr = rap.find(l => l[1] === 'ADH-0007');
  verif(refus && refus[0] === 'Refusée' && /obligatoire/.test(refus[7]) && /invalide/.test(refus[7]), 'Rapport_import : refus expliqué (« ' + (refus ? refus[7] : '') + ' »)');
  verif(nr && /non réciproque/.test(nr[7]), 'Rapport_import : rattachement non réciproque signalé');
  verif(rap[0][0].indexOf('Test d\'import') === 0 && rap.some(l => l[0] === 'Importée — à vérifier'), 'Rapport_import : résumé et lignes « à vérifier »');
} else {
  const rap = G(`SpreadsheetApp.openById('${idCopie}').getSheetByName('Rapport_import').getDataRange().getValues()`).map(l => Array.from(l));
  console.info(JSON.stringify(s));
  rap.filter(l => l[0] === 'Refusée').forEach(l => console.info('   REFUS ' + l.slice(1, 4).join(' ') + ' : ' + l[7]));
  const motifs = {};
  rap.filter(l => l[0] === 'Importée — à vérifier').forEach(l => String(l[7]).split(' · ').forEach(m => { const k = m.replace(/ :.*/, ''); motifs[k] = (motifs[k] || 0) + 1; }));
  console.info('   À vérifier : ' + JSON.stringify(motifs));
  verif(s.refuses === 0, 'aucune ligne refusée');
}
if (!fichierArg) {
  console.info('\n2 bis. Fichier converti en Google Sheets (zéros perdus, vraies dates)');
  G(`(function () {
    var it = DriveApp.searchFiles("title contains 'Import_Adherents_Brunants'");
    while (it.hasNext()) it.next().setTrashed(true);
    var f = DriveApp.getFileById(classeur_().getId()).makeCopy('Import_Adherents_Brunants', DriveApp.getFolderById('${idDossier}'));
    var c = SpreadsheetApp.openById(f.getId());
    var sh = c.insertSheet('Import', 0);
    var lignes = ${JSON.stringify(fictif.split('\r\n').map(l => l.split(';')))};
    lignes = lignes.filter(function (l) { return l.length === lignes[0].length; });
    lignes.forEach(function (l, n) {
      if (!n) return;
      l[9] = l[9] ? Number(l[9]) : '';                     // code postal devenu nombre
      l[12] = l[12] ? Number(l[12]) : '';                  // portable devenu nombre
      l[16] = l[16] ? new Date(Number(l[16].slice(6)), Number(l[16].slice(3, 5)) - 1, Number(l[16].slice(0, 2)), 12) : '';  // vraie date
    });
    sh.getRange(1, 1, lignes.length, lignes[0].length).setValues(lignes);
  })()`);
  const r2 = appel('testerImportAdherents');
  const id2 = r2.url.match(/d\/([^/]+)\//)[1];
  const adh2 = JSON.parse(JSON.stringify(G(`(function(){ var c = SpreadsheetApp.openById('${id2}'); return lireTable_(c, 'Adherents', [], contexte_(c)); })()`)));
  const c2 = adh2.find(a => a.id === 'ADH-0005'), l2 = adh2.find(a => a.id === 'ADH-0002'), p2 = adh2.find(a => a.id === 'ADH-0001');
  verif(r2.stats.importes === 5 && c2 && c2.codePostal === '06700' && l2.mobile === '0600000103' && p2.dateInscription === '2004-01-01',
    `version Google Sheets lue : ${r2.stats.importes} importées, CP 06700, portable 0600000103, date 01/01/2004`);
}
console.info('\n3. Garde-fous dans la copie');
G(`FauxGAS.classeurLie = FauxGAS.classeurs['${idCopie}']`);
G("PropertiesService.getScriptProperties().deleteProperty('ID_CLASSEUR')");
try { G('setup()'); verif(false, 'setup refusé dans la copie'); } catch (e) { verif(/copie de test/.test(e.message), 'setup refusé dans la copie de test'); }
try { G('chargerTout()'); verif(false, 'outil refusé dans la copie'); } catch (e) { verif(/copie de test/.test(e.message), 'l\'outil refuse de travailler dans la copie'); }

console.info('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
