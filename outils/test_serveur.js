/**
 * test_serveur.js — Teste le code Apps Script (lot 1) avec le simulateur faux_gas.js
 * Lancement : node outils/test_serveur.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dossierGs = path.join(__dirname, '..', 'apps_script');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), ctx, { filename: 'faux_gas.js' });
vm.runInContext('FauxGAS.installer(globalThis)', ctx);
['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(dossierGs, f), 'utf8'), ctx, { filename: f }));

const G = (expr) => vm.runInContext(expr, ctx);
let ok = 0, ko = 0;
function verif(cond, libelle) {
  if (cond) { ok++; console.log('  ✔ ' + libelle); } else { ko++; console.log('  ✘ ' + libelle); }
}
function contientDate(o) {
  if (Object.prototype.toString.call(o) === '[object Date]') return true;
  if (o && typeof o === 'object') return Object.keys(o).some(k => contientDate(o[k]));
  return false;
}
function appelClient(fn, ...args) {   // imite google.script.run : pas de Date, JSON uniquement
  if (fn.endsWith('_')) throw new Error('fonction privée');
  const r = ctx[fn](...JSON.parse(JSON.stringify(args)));
  if (contientDate(r)) throw new Error('Le retour de ' + fn + ' contient une Date (refusé par google.script.run)');
  return JSON.parse(JSON.stringify(r));
}
function attendErreur(fn, motif, libelle) {
  try { fn(); verif(false, libelle + ' (aucune erreur levée)'); }
  catch (e) { verif(motif.test(e.message), libelle + ' → « ' + e.message.split('\n')[0] + ' »'); }
}

console.log('\n1. setup() sur un classeur vierge');
const rapport = G('setup()');
const ss = G('FauxGAS.classeurLie');
const onglets = ss.feuilles.map(f => f.nom);
verif(ss.nom === 'Brunants_Donnees', 'classeur renommé Brunants_Donnees');
verif(JSON.stringify(onglets) === JSON.stringify(['Adherents', 'Activites', 'Inscriptions', 'Echeances', 'Recettes', 'Depenses',
  'Categories', 'Budgets', 'Prestataires', 'MobilHome', 'Parametres', 'Journal']), '12 onglets dans l\'ordre, « Feuille 1 » supprimée : ' + onglets.join(', '));
const props = G('FauxGAS.proprietes');
const racine = G('DriveApp.getFolderById(FauxGAS.proprietes.ID_DOSSIER)');
verif(racine.nom === 'Outil_Brunants', 'dossier Outil_Brunants créé');
verif(G('DriveApp.getFolderById(FauxGAS.proprietes.ID_SAUVEGARDES)').nom === 'Sauvegardes', 'sous-dossier Sauvegardes');
verif(G('DriveApp.getFolderById(FauxGAS.proprietes.ID_FICHES)').nom === 'Fiches_inscription', 'sous-dossier Fiches_inscription');
verif(G('DriveApp.getFileById(FauxGAS.classeurLie.id)').parents[0] === props.ID_DOSSIER, 'classeur rangé dans Outil_Brunants');
verif(G('FauxGAS.declencheurs').length === 1 && G('FauxGAS.declencheurs')[0].fn === 'sauvegardeMensuelle', 'déclencheur mensuel installé');
const nbCat = ss.brut('Categories').getLastRow() - 1;
const nbBud = ss.brut('Budgets').getLastRow() - 1;
verif(nbCat === 27, nbCat + ' catégories/sous-catégories du bureau chargées');
verif(nbBud === 14, '14 budgets (7 catégories de dépenses × 2025-2026)');
verif(ss.brut('Prestataires').d.filter(l => l && l[0] === 'PRE-000').length === 1, 'prestataire « Autre » PRE-000 présent');
verif(ss.brut('Parametres').getLastRow() === G('PARAMETRES_DEF').length + 1, G('PARAMETRES_DEF').length + ' paramètres écrits');

console.log('\n2. setup() relancé : aucune donnée dupliquée');
G('setup()');
verif(ss.brut('Categories').getLastRow() - 1 === nbCat, 'catégories inchangées');
verif(ss.brut('Budgets').getLastRow() - 1 === nbBud, 'budgets inchangés');
verif(ss.brut('Prestataires').d.filter(l => l && l[0] === 'PRE-000').length === 1, 'un seul « Autre »');
verif(ss.brut('Parametres').getLastRow() === G('PARAMETRES_DEF').length + 1, 'paramètres inchangés');
verif(G('FauxGAS.declencheurs').length === 1, 'toujours un seul déclencheur');

console.log('\n3. chargerTout()');
let d = appelClient('chargerTout');
verif(d.tables.Categories.length === nbCat, 'catégories lues : ' + d.tables.Categories.length);
verif(d.tables.Budgets.length === 14 && d.tables.Budgets[0].annee === 2025 && typeof d.tables.Budgets[0].montant === 'number' && d.tables.Budgets[0].montant > 0, 'budgets typés (année et montant en nombres)');
verif(d.avertissements.length === 0, 'aucun avertissement sur un classeur propre');
verif(d.parametres.MODE_ENTRAINEMENT === true && d.parametres.EMAIL_TEST === 'tresoriere.test@exemple.fr', 'paramètres : mode entraînement + e-mail de test = installateur');
verif(d.journal.length >= 2 && d.journal[0].action === 'Installation', 'journal lu (le plus récent en premier)');
verif(d.tables.Categories[0].id === 'CAT-001' && d.tables.Budgets.some(b => b.id === 'BUD-2026-01' && b.annee === 2026), 'identifiants CAT-001 et BUD-2026-01');

console.log('\n4. enregistrer() — création, modification, contrôles');
let r = appelClient('enregistrer', 'Categories', { categorie: '7. Fonctionnement association', sousCategorie: 'Galette des rois', type: 'Dépense' });
verif(r.id === 'CAT-' + String(nbCat + 1).padStart(3, '0') && /créée/.test(r.message), 'création : ' + r.message);
verif(r.donnees.tables.Categories.length === nbCat + 1, 'données fraîches renvoyées');
r = appelClient('enregistrer', 'Categories', { id: r.id, categorie: '7. Fonctionnement association', sousCategorie: 'Galette', type: 'Les deux' });
verif(/modifiée/.test(r.message) && r.donnees.tables.Categories.filter(c => c.sousCategorie === 'Galette').length === 1, 'modification : ' + r.message);
attendErreur(() => appelClient('enregistrer', 'Categories', { categorie: '', type: 'Les deux' }), /obligatoire/, 'catégorie vide refusée');
attendErreur(() => appelClient('enregistrer', 'Categories', { categorie: '7. Fonctionnement association', sousCategorie: 'galette', type: 'Recette' }), /existe déjà/, 'doublon refusé (insensible à la casse)');
attendErreur(() => appelClient('enregistrer', 'Categories', { categorie: 'X', type: 'Truc' }), /non autorisée/, 'type hors liste refusé');
attendErreur(() => appelClient('enregistrer', 'Inscriptions', { activiteId: 'X' }), /impossible/, 'table pas encore ouverte à la saisie générique (inscriptions : lot 4) refusée');
attendErreur(() => appelClient('enregistrer', 'Categories', { id: 'CAT-999', categorie: '7. Fonctionnement association', type: 'Les deux' }), /introuvable/, 'modification d\'un ID inexistant refusée');

console.log('\n5. supprimer()');
const idGalette = r.id;
r = appelClient('supprimer', 'Categories', idGalette);
verif(/supprimée/.test(r.message) && !r.donnees.tables.Categories.some(c => c.id === idGalette), 'suppression : ' + r.message);
// une catégorie utilisée par un budget ne peut pas perdre sa dernière ligne
r = appelClient('enregistrer', 'Categories', { categorie: 'Test seul', type: 'Les deux' });
const idTest = r.id;
const fb = ss.brut('Budgets');
fb.d.push(['BUD-2026-99', 2026, 'Test seul', 100]);
attendErreur(() => appelClient('supprimer', 'Categories', idTest), /encore utilisée/, 'suppression d\'une catégorie utilisée refusée');
fb.d.pop();
appelClient('supprimer', 'Categories', idTest);

console.log('\n6. Modifications à la main dans les feuilles + « Actualiser »');
const fc = ss.brut('Categories');
const l = fc.getLastRow();
fc.d[l] = ['CAT-500', 'Divers', 'Ajout manuel', 'les deux'];         // casse différente : accepté et corrigé
fc.d[l + 1] = ['', 'Divers', 'Sans ID', 'Recette'];                  // ID manquant : ignorée
fc.d[l + 2] = ['CAT-001', 'Divers', 'Doublon d\'ID', 'Recette'];      // ID en double : ignorée
fc.d[l + 3] = ['CAT-501', 'Divers', 'Type bizarre', 'Peut-être'];     // valeur inattendue : gardée, à vérifier
const fbud = ss.brut('Budgets');
fbud.d[fbud.getLastRow()] = ['BUD-2027-01', 'deux mille', '7. Fonctionnement association', 100];   // année illisible : ignorée
fbud.d[fbud.getLastRow()] = ['BUD-2027-02', 2027, '7. Fonctionnement association', '1 200,50 €'];  // montant en texte : accepté
const fadh = ss.brut('Adherents');
fadh.d[1] = ['ADH-0001', 'Mme', 'F', 'DUPONT', 'Marie', '31/02/1950', 'Titulaire', '1 rue X', '', 1000, 'Bourg', '', 612345678, '', 'marie@exemple', '', new Date(2020, 0, 5), '', '', 15, 'oui', '', '', '', '', '', '', '', '', '', ''];
fadh.d[2] = ['ADH-0002', 'M.', 'H', 'MARTIN', 'Paul', '', 'Titulaire', '', '', '75011', 'Paris', '', '', '', '', '', '45/13/2020'];
// colonne déplacée à la main : on échange « Nom » et « Prénom »
const fp = ss.brut('Prestataires');
d = appelClient('chargerTout');
const cats = d.tables.Categories;
verif(cats.some(c => c.id === 'CAT-500' && c.type === 'Les deux'), 'ligne ajoutée à la main lue (« les deux » → « Les deux »)');
verif(!cats.some(c => c.sousCategorie === 'Sans ID') && !cats.some(c => c.sousCategorie === 'Doublon d\'ID'), 'lignes sans ID / ID en double ignorées');
verif(cats.some(c => c.id === 'CAT-501'), 'valeur inattendue non bloquante');
verif(d.tables.Budgets.some(b => b.id === 'BUD-2027-02' && b.montant === 1200.5), 'montant « 1 200,50 € » lu comme 1200.5');
verif(!d.tables.Budgets.some(b => b.id === 'BUD-2027-01'), 'année illisible : ligne ignorée');
const a1 = d.tables.Adherents.find(a => a.id === 'ADH-0001');
verif(a1 && a1.codePostal === '01000' && a1.region === 'Province' && a1.mobile === '0612345678', 'CP 1000 → 01000, région calculée, 0 du mobile restauré');
verif(a1 && a1.dateNaissance === '' && a1.dateInscription === '2020-01-05' && a1.abonneFacebook === true && a1.recoitMaillon === true, 'date impossible vidée, date Sheets lue, « oui » → vrai, Maillon vide → Oui par défaut');
verif(!d.tables.Adherents.some(a => a.id === 'ADH-0002'), 'adhérent avec date d\'inscription illisible ignoré');
const av = d.avertissements;
console.log('    Avertissements :'); av.forEach(a => console.log('      [' + a.niveau + '] ' + a.table + ' ligne ' + a.ligne + ' : ' + a.motif));
verif(av.filter(a => a.niveau === 'Ignorée').length === 4, '4 lignes ignorées signalées');
verif(av.some(a => a.niveau === 'À vérifier' && /31\/02\/1950/.test(a.motif)) && av.some(a => a.niveau === 'À vérifier' && /Peut-être/.test(a.motif)), 'lignes « à vérifier » signalées (date impossible, valeur inattendue)');

console.log('\n7. Colonne déplacée / renommée / supprimée à la main');
const fcat = ss.brut('Categories');
fcat.d.forEach(l => { const t = l[1]; l[1] = l[3]; l[3] = t; });   // échange Catégorie et Type
d = appelClient('chargerTout');
verif(d.tables.Categories.find(c => c.id === 'CAT-001').categorie === '1. Séjours et villégiatures', 'colonnes échangées : lecture correcte par titre');
r = appelClient('enregistrer', 'Categories', { categorie: 'Divers', sousCategorie: 'Après échange', type: 'Recette' });
const ligneEcrite = fcat.d[fcat.getLastRow() - 1];
verif(ligneEcrite[1] === 'Recette' && ligneEcrite[3] === 'Divers', 'écriture dans les bonnes colonnes après échange');
fcat.d[0][2] = 'Sous catégorie';  // titre légèrement modifié (sans tiret)
d = appelClient('chargerTout');
verif(d.avertissements.some(a => /Sous-catégorie/.test(a.motif)), 'titre modifié → avertissement « colonne absente »');
G('setup()');
verif(fcat.d[0].indexOf('Sous-catégorie') > 3, 'setup() recrée la colonne manquante en fin de ligne');
fcat.d[0][2] = 'Sous-catégorie'; fcat.d[0].pop();

console.log('\n8. Paramètres');
r = appelClient('enregistrerParametres', { MODE_ENTRAINEMENT: true, EMAIL_TEST: 'test@exemple.fr', AIDE_MOBILHOME: '65', NB_AIDES_MOBILHOME: '2', DEPARTEMENTS_IDF: '75, 77, 78, 91, 92, 93, 94, 95', NB_SAUVEGARDES: '3', COTISATION_DEFAUT: '15' });
verif(r.donnees.parametres.AIDE_MOBILHOME === 65 && r.donnees.parametres.EMAIL_TEST === 'test@exemple.fr' && r.donnees.parametres.NB_SAUVEGARDES === 3, 'paramètres enregistrés et relus');
verif(r.donnees.journal[0].action === 'Paramètres', 'modification journalisée');
attendErreur(() => appelClient('enregistrerParametres', { EMAIL_TEST: 'pas-un-mail' }), /invalide/, 'e-mail de test invalide refusé');
attendErreur(() => appelClient('enregistrerParametres', { DEPARTEMENTS_IDF: 'Paris' }), /2 chiffres/, 'départements invalides refusés');
attendErreur(() => appelClient('enregistrerParametres', { MODE_ENTRAINEMENT: true, EMAIL_TEST: '' }), /obligatoire/, 'mode entraînement sans e-mail de test refusé');

console.log('\n9. Sauvegardes (rotation à 3)');
for (let i = 0; i < 5; i++) r = appelClient('sauvegarderMaintenant');
const fichiersSauv = Object.values(G('FauxGAS.fichiers')).filter(f => f.parents[0] === props.ID_SAUVEGARDES && !f.corbeille);
verif(fichiersSauv.filter(f => !/\.xlsx$/.test(f.getName())).length === 3, '3 copies conservées sur 5');
verif(fichiersSauv.filter(f => /\.xlsx$/.test(f.getName())).length === 3, '3 exports .xlsx conservés');
verif(/^Sauvegarde_Brunants_\d{4}-\d{2}-\d{2}/.test(fichiersSauv[0].getName()), 'nom « ' + fichiersSauv[0].getName() + ' »');
const copie = fichiersSauv.find(f => f.classeur);
verif(copie && copie.classeur.brut('Categories').getLastRow() === fcat.getLastRow(), 'la copie contient bien les données');
verif(/Sauvegarde/.test(r.message) && r.donnees.derniereSauvegarde.split('|').length === 3, 'dernière sauvegarde mémorisée : ' + r.donnees.derniereSauvegarde);
G('FauxGAS.refuserSuppression = true');
r = appelClient('sauvegarderMaintenant');
verif(r.donnees.journal[0].resume.indexOf('non supprimée') > 0, 'purge refusée (autre propriétaire) : signalée sans planter');
G('FauxGAS.refuserSuppression = false');
G('sauvegardeMensuelle()');
verif(G('FauxGAS.classeurLie').brut('Journal').d.slice(-1)[0][5].indexOf('Automatique (mensuelle)') === 0, 'sauvegarde mensuelle journalisée');

console.log('\n10. E-mails');
G('FauxGAS.mails = []');
r = appelClient('envoyerMailTest');
let mails = G('FauxGAS.mails');
verif(mails.length === 1 && mails[0].to === 'test@exemple.fr' && !mails[0].bcc && /ENTRAÎNEMENT/.test(mails[0].subject), 'mode entraînement : 1 seul message, vers l\'e-mail de test uniquement');
verif(/adherent\.fictif\.1@exemple\.fr/.test(mails[0].htmlBody), 'le message liste les destinataires prévus');
G('FauxGAS.mails = []');
G("envoyerMail_(['a@x.fr','b@x.fr','a@x.fr','pas-mail'], 'Sujet', '<p>x</p>')");
mails = G('FauxGAS.mails');
verif(mails.length === 1 && mails[0].to === 'test@exemple.fr', 'tout envoi passe par la redirection en mode entraînement');
appelClient('enregistrerParametres', { MODE_ENTRAINEMENT: false });
G('FauxGAS.mails = []');
const liste = JSON.stringify(Array.from({ length: 120 }, (_, i) => 'adh' + i + '@x.fr'));
G('FauxGAS.quota = 100');
attendErreur(() => G("envoyerMail_(" + liste + ", 'Sujet', '<p>x</p>')"), /Quota/, 'mode réel : quota insuffisant détecté avant envoi');
G('FauxGAS.quota = 500');
G("envoyerMail_(" + liste + ", 'Sujet', '<p>x</p>')");
mails = G('FauxGAS.mails');
verif(mails.length === 3 && mails[0].bcc.split(',').length === 50, 'mode réel : copie cachée par paquets de 50');
appelClient('enregistrerParametres', { MODE_ENTRAINEMENT: true });

console.log('\n11. Accès refusé');
G('FauxGAS.refuserAcces = true');
attendErreur(() => appelClient('chargerTout'), /Accès refusé/, 'compte sans accès au classeur');
G('FauxGAS.refuserAcces = false');

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
