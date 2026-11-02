/**
 * test_serveur_lot4.js — Tests du serveur pour le lot 4 (activités, échéances, mobil-home, fiche, réinitialisation)
 * Lancement : node outils/test_serveur_lot4.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console, Buffer });
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
const an = Number(auj.slice(0, 4));
const somme = l => Math.round(l.reduce((s, x) => s + Number(x.montant), 0) * 100) / 100;

console.log('\n1. Données fictives du lot 4');
G('setup()');
let d = appel('chargerTout');
verif(d.avertissements.length === 0, 'aucun avertissement');
const E = d.tables.Echeances, R = d.tables.Recettes, D = d.tables.Depenses, M = d.tables.MobilHome;
verif(E.length > 500 && E.filter(e => e.paye).length > 400, E.length + ' échéances, ' + E.filter(e => e.paye).length + ' payées');
verif(E.filter(e => e.paye).every(e => R.some(r => r.id === e.recetteId && r.echeanceId === e.id && r.origine === 'Automatique' && r.montant === e.montant)),
  'chaque échéance payée a exactement sa recette automatique (même montant)');
verif(R.filter(r => r.origine === 'Automatique' && /^ECH-/.test(r.echeanceId)).length === E.filter(e => e.paye).length, 'aucune recette automatique en trop');
verif(E.filter(e => e.rembourse).length === 1 && E.filter(e => e.rembourse).every(e => R.some(x => x.id === e.remboursementId && x.origine === 'Remboursement' && x.montant === -e.montant && x.echeanceId === e.id)) && !D.some(x => x.origine === 'Remboursement'),
  'un remboursement, déduit des recettes (recette négative), aucune dépense de remboursement');
const parTit = {};
M.forEach(m => { const k = m.adherentId + '|' + m.annee; parTit[k] = (parTit[k] || 0) + (m.aideAsso > 0 ? 1 : 0); });
verif(Object.values(parTit).every(n => n <= 2), 'mobil-home : jamais plus de 2 aides par titulaire et par an');
verif(new Set(M.map(m => m.campingId)).size === 2 && M.every(m => D.some(x => x.id === m.depenseId && x.prestataireId === m.campingId)), '2 campings, chaque location liée à sa dépense au camping');

console.log('\n2. Activité : création, participation calculée, notification');
G('FauxGAS.mails = []');
let r = appel('enregistrerActivite', { nom: 'Sortie test 3 fois', categorie: '2. Sorties et spectacles', sousCategorie: '2.2 Visites et découvertes 1 journée', dateDebut: (an + 1) + '-03-15',
  maxParticipants: 2, coutReelParPersonne: 100, prixParPersonne: 30, nbEcheances: 3, notification: true, statut: 'Ouvert aux inscriptions', organisateur: 'ADH-0003' });
const idAct = r.id;
let act = r.donnees.tables.Activites.find(a => a.id === idAct);
verif(new RegExp('^ACT-' + (an + 1) + '-001$').test(idAct) && /créée/.test(r.message), r.message.split('\n')[0]);
verif(act.participationEuro === 70 && act.participationPct === 70, 'participation association calculée : 100 € − 30 € = 70 € soit 70 %');
const mails = G('FauxGAS.mails');
verif(mails.length === 1 && mails[0].to === r.donnees.parametres.EMAIL_TEST && /\[ENTRAÎNEMENT\] Nouvelle activité/.test(mails[0].subject) && /Notification/.test(r.message),
  'mode entraînement : un seul e-mail, vers l\'adresse de test');
const nbPrevus = Number((mails[0].htmlBody.match(/envoyé à (\d+) destinataire/) || [])[1]);
const attendus = r.donnees.tables.Adherents.filter(a => !a.desinscrit && !a.deces && !a.neRienEnvoyer && a.email).length;
verif(nbPrevus === attendus, 'destinataires prévus : ' + nbPrevus + ' adhérents actifs avec e-mail (hors « ne plus rien envoyer »)');
G('FauxGAS.mails = []');
r = appel('enregistrerActivite', Object.assign({}, act, { lieu: 'Paris' }));
verif(/modifiée/.test(r.message) && G('FauxGAS.mails').length === 0, 'modification : pas de nouvelle notification');
appel('enregistrerParametres', { EMAIL_LISTE: 'liste-brunants@example.org' });
G('FauxGAS.mails = []');
appel('notifierActivite', idAct);
verif(/1 destinataire/.test(G('FauxGAS.mails')[0].htmlBody), 'liste de diffusion paramétrée : un seul destinataire');
appel('enregistrerParametres', { EMAIL_LISTE: '' });

console.log('\n3. Inscription en 3 échéances');
r = appel('inscrireActivite', idAct, 'ADH-0001', '');
const idIns = r.id;
let cases = r.donnees.tables.Echeances.filter(e => e.inscriptionId === idIns).sort((a, b) => a.numero - b.numero);
verif(cases.length === 3 && /3 case\(s\) de paiement/.test(r.message), r.message);
verif(cases.map(e => e.montant).join('/') === '10/10/10' && cases[0].datePrevue === auj && cases[2].datePrevue < (an + 1) + '-03-15', 'montants 10/10/10 €, dates étalées jusqu\'à la veille de l\'activité');
erreur(() => appel('inscrireActivite', idAct, 'ADH-0001'), /déjà inscrit/, 'double inscription refusée');
const archive = r.donnees.tables.Adherents.find(a => a.desinscrit);
erreur(() => appel('inscrireActivite', idAct, archive.id), /n'est plus adhérent/, 'adhérent archivé refusé');
r = appel('inscrireActivite', idAct, 'ADH-0002', '100');
verif(r.donnees.tables.Echeances.filter(e => e.inscriptionId === r.id).map(e => e.montant).sort().join('/') === '33.33/33.33/33.34', 'montant dû 100 € → 33,33 / 33,33 / 33,34 €');
erreur(() => appel('inscrireActivite', idAct, 'ADH-0003'), /complète/, 'nombre maximum de participants contrôlé');

console.log('\n4. « Payé » → recette automatique (une seule), décocher → supprimée');
let budget = () => { const dd = appel('chargerTout'); return { rec: somme(dd.tables.Recettes.filter(x => x.date.startsWith(String(an)))), dep: somme(dd.tables.Depenses.filter(x => x.date.startsWith(String(an)) && x.budgete === 'Budgété')) }; };
const b0 = budget();
r = appel('payerEcheance', cases[0].id, auj, 'Chèque');
let rec = r.donnees.tables.Recettes.find(x => x.id === r.id);
verif(/Recette REC-\d{4}-\d{4} créée automatiquement/.test(r.message) && rec.origine === 'Automatique' && rec.echeanceId === cases[0].id && rec.montant === 10
  && rec.adherentId === 'ADH-0001' && rec.activiteId === idAct && rec.categorie === '2. Sorties et spectacles' && rec.modePaiement === 'Chèque', r.message);
erreur(() => appel('payerEcheance', cases[0].id, auj), /déjà payée/, 'deuxième « Payé » refusé : aucune double recette');
verif(appel('chargerTout').tables.Recettes.filter(x => x.echeanceId === cases[0].id).length === 1, 'une seule recette pour l\'échéance');
erreur(() => appel('payerEcheance', cases[1].id, '2099-01-01'), /futur/, 'date de paiement future refusée');
const idRec = r.id;
r = appel('annulerPaiement', cases[0].id);
verif(!r.donnees.tables.Recettes.some(x => x.id === idRec) && !r.donnees.tables.Echeances.find(e => e.id === cases[0].id).paye, 'décocher « Payé » : ' + r.message);
erreur(() => appel('supprimer', 'Recettes', R.find(x => x.origine === 'Automatique').id), /créée automatiquement/, 'recette automatique non supprimable à la main');

console.log('\n5. Payer les 3 échéances, rembourser la 3e');
cases.forEach(e => appel('payerEcheance', e.id, auj));
const b1 = budget();
verif(Math.abs(b1.rec - b0.rec - 30) < 0.01, 'recettes de l\'année +30 € (3 × 10 €)');
r = appel('rembourserEcheance', cases[2].id, auj);
let dep = r.donnees.tables.Recettes.find(x => x.id === r.id);
verif(/déduit des recettes : recette négative REC-\d{4}-\d{4}/.test(r.message) && dep.origine === 'Remboursement' && dep.echeanceId === cases[2].id && dep.montant === -10, r.message);
verif(Math.abs(budget().rec - b1.rec + 10) < 0.01 && Math.abs(budget().dep - b1.dep) < 0.01, 'recettes −10 €, dépenses inchangées (le remboursement est déduit des recettes)');
erreur(() => appel('rembourserEcheance', cases[2].id, auj), /déjà remboursée/, 'double remboursement refusé');
erreur(() => appel('annulerPaiement', cases[2].id), /annulez d'abord le remboursement/, 'décocher une échéance remboursée refusé');
erreur(() => appel('supprimer', 'Recettes', dep.id), /créée automatiquement/, 'recette de remboursement non supprimable à la main');
erreur(() => appel('enregistrer', 'Recettes', { date: auj, libelle: 'Négatif', montant: -5, categorie: '8. Subvention et Adhésions' }), /positif/, 'montant négatif refusé en saisie manuelle');
r = appel('annulerRemboursement', cases[2].id);
verif(!r.donnees.tables.Recettes.some(x => x.id === dep.id), 'annuler le remboursement : ' + r.message);
appel('rembourserEcheance', cases[2].id, auj);

console.log('\n6. Désinscription d\'une activité');
const ins2 = appel('chargerTout').tables.Inscriptions.find(i => i.activiteId === idAct && i.adherentId === 'ADH-0002');
const c2 = appel('chargerTout').tables.Echeances.filter(e => e.inscriptionId === ins2.id);
appel('payerEcheance', c2[0].id, auj);
r = appel('desinscrireActivite', ins2.id);
const restants = r.donnees.tables.Echeances.filter(e => e.inscriptionId === ins2.id);
verif(restants.length === 1 && restants[0].paye && /2 échéance\(s\) non payée\(s\) supprimée\(s\)/.test(r.message) && /Rembourser/.test(r.message), r.message);
verif(r.donnees.tables.Inscriptions.find(i => i.id === ins2.id).statut === 'Désinscrit', 'statut « Désinscrit »');
r = appel('inscrireActivite', idAct, 'ADH-0003');
verif(/inscrit/.test(r.message), 'une place s\'est libérée : nouvelle inscription possible');
erreur(() => appel('supprimer', 'Activites', idAct), /encore utilisé/, 'activité avec inscriptions : suppression refusée');

console.log('\n7. Mobil-home : aides plafonnées à 2 × 60 € par titulaire et par an');
const tit = appel('chargerTout').tables.Adherents.find(a => a.type === 'Titulaire' && !a.desinscrit && !a.deces && !M.some(m => m.adherentId === a.id));
const sym = appel('chargerTout').tables.Adherents.find(a => a.type === 'Sympathisant' && !a.desinscrit && !a.deces);
const sem = k => (an + 1) + '-' + String(5 + k).padStart(2, '0') + '-' + String(k + 1).padStart(2, '0');
r = appel('enregistrerLocation', { adherentId: tit.id, campingId: 'PRE-005', semaine: sem(1), coutLocation: 420 });
const mh1 = r.donnees.tables.MobilHome.find(m => m.id === r.id);
const dep1 = r.donnees.tables.Depenses.find(x => x.id === mh1.depenseId), rec1 = r.donnees.tables.Recettes.find(x => x.id === mh1.recetteId);
verif(mh1.aideAsso === 60 && mh1.montantPayeAdherent === 360 && mh1.annee === an + 1 && /aide de 60 €/.test(r.message), '1re semaine : ' + r.message);
verif(dep1.montant === 420 && dep1.prestataireId === 'PRE-005' && dep1.origine === 'Automatique' && rec1.montant === 360 && rec1.adherentId === tit.id && rec1.origine === 'Automatique',
  'dépense 420 € au camping et recette 360 € (part adhérent) créées automatiquement');
r = appel('enregistrerLocation', { adherentId: tit.id, campingId: 'PRE-013', semaine: sem(2), coutLocation: 380 });
verif(r.donnees.tables.MobilHome.find(m => m.id === r.id).aideAsso === 60, '2e semaine : aide de 60 €');
r = appel('enregistrerLocation', { adherentId: tit.id, campingId: 'PRE-005', semaine: sem(3), coutLocation: 450 });
const mh3 = r.id;
verif(r.donnees.tables.MobilHome.find(m => m.id === mh3).aideAsso === 0 && /plafond de 2 aides atteint/.test(r.message), '3e semaine : ' + r.message);
r = appel('enregistrerLocation', { adherentId: sym.id, campingId: 'PRE-005', semaine: sem(1), coutLocation: 400 });
verif(r.donnees.tables.MobilHome.find(m => m.id === r.id).aideAsso === 0 && /réservée aux titulaires/.test(r.message), 'sympathisant : ' + r.message);
r = appel('supprimerLocation', mh1.id);
let l3 = r.donnees.tables.MobilHome.find(m => m.id === mh3);
verif(!r.donnees.tables.Depenses.some(x => x.id === mh1.depenseId) && !r.donnees.tables.Recettes.some(x => x.id === mh1.recetteId), 'suppression : la location et ses 2 lignes comptables disparaissent');
verif(l3.aideAsso === 60 && r.donnees.tables.Recettes.find(x => x.id === l3.recetteId).montant === 390, 'aides recalculées : la 3e semaine récupère l\'aide (recette ramenée à 390 €)');
r = appel('enregistrerLocation', Object.assign({}, l3, { coutLocation: 470, campingId: 'PRE-013' }));
l3 = r.donnees.tables.MobilHome.find(m => m.id === mh3);
const d3 = r.donnees.tables.Depenses.find(x => x.id === l3.depenseId);
verif(d3.montant === 470 && d3.prestataireId === 'PRE-013' && r.donnees.tables.Recettes.find(x => x.id === l3.recetteId).montant === 410, 'modification : dépense et recette mises à jour (mêmes ID)');
const tousAides = {};
r.donnees.tables.MobilHome.forEach(m => { const k = m.adherentId + '|' + m.annee; tousAides[k] = (tousAides[k] || 0) + (m.aideAsso > 0 ? 1 : 0); });
verif(Object.values(tousAides).every(n => n <= 2), 'contrôle global : personne n\'a plus de 2 aides dans une année');
const parCamping = {};
r.donnees.tables.MobilHome.filter(m => m.annee === an + 1).forEach(m => { parCamping[m.campingId] = (parCamping[m.campingId] || 0) + 1; });
verif(parCamping['PRE-005'] === 1 && parCamping['PRE-013'] === 2, 'semaines vendues par camping : Pins Bleus 1, La Clairière 2');
erreur(() => appel('enregistrerLocation', { adherentId: tit.id, semaine: sem(4), coutLocation: 300 }), /camping/, 'camping obligatoire');
erreur(() => appel('enregistrerLocation', { adherentId: archive.id, campingId: 'PRE-005', semaine: sem(4), coutLocation: 300 }), /n'est pas adhérent/, 'non-adhérent à la date refusé');

console.log('\n8. Fiche d\'inscription (Google Doc + PDF)');
r = appel('genererFicheInscription', idAct);
const docs = G('FauxGAS.documents');
const doc = Object.values(docs)[0];
const tableau = doc.tableaux[1];
verif(/générée/.test(r.message) && r.urlDoc && r.urlPdf, r.message);
verif(doc.paragraphes[0].texte === 'Sortie test 3 fois' && doc.paragraphes[0].titre === 'HEADING1' && doc.images === 1 && doc.paysage, 'titre = nom de l\'activité, logo, page en paysage');
const infos = doc.tableaux[0].map(l => l[0]);
verif(['Descriptif', 'Date(s)', 'Lieu', 'Organisateur', 'Nombre maximum de participants', 'Budget prévu', 'Participation demandée par personne', 'Somme subventionnée par l\'association par personne'].every(x => infos.includes(x)),
  'en-tête : descriptif, dates, lieu, organisateur, maximum, budget, participation demandée et subventionnée');
verif(tableau[0].join('|') === 'N°|Nom|Prénom|E-mail|Téléphone|Payé 1|Date 1|Payé 2|Date 2|Payé 3|Date 3', 'colonnes : N°, Nom, Prénom, E-mail, Téléphone + Payé/Date par échéance');
verif(tableau.length === 3 && tableau[1][1] === 'BERNARD' && tableau[1][5] === '☑', 'une ligne par place (maximum 2), inscrits pré-remplis, ☑ = payé');
const fichiers = Object.values(G('FauxGAS.fichiers')).filter(f => f.parents[0] === G('FauxGAS.proprietes').ID_FICHES);
verif(fichiers.some(f => /\.pdf$/.test(f.getName())) && fichiers.some(f => f.mime === 'application/vnd.google-apps.document'), 'Google Doc et PDF rangés dans Fiches_inscription');

console.log('\n9. Recette avec mode de paiement, justificatif et commentaire');
r = appel('enregistrer', 'Recettes', { date: auj, libelle: 'Don', montant: 20, categorie: '8. Subvention et Adhésions', sousCategorie: '8.1 Subvention', modePaiement: 'Espèces', justificatif: 'Reçu n° 12', commentaire: 'Remis à la galette' });
rec = r.donnees.tables.Recettes.find(x => x.id === r.id);
verif(rec.modePaiement === 'Espèces' && rec.justificatif === 'Reçu n° 12' && rec.commentaire === 'Remis à la galette', 'nouveaux champs enregistrés');
erreur(() => appel('enregistrer', 'Depenses', { date: auj, libelle: 'X', montant: 5, categorie: '7. Fonctionnement association', modePaiement: 'Troc' }), /non autorisée/, 'mode de paiement hors liste refusé');

console.log('\n10. Réinitialisation des données d\'entraînement');
const avant = appel('chargerTout');
r = appel('reinitialiserDonnees');
d = r.donnees;
verif(/réinitialisées/.test(r.message) && /Sauvegarde_Brunants_/.test(r.message), r.message);
verif(d.tables.Activites.length === 15 && d.tables.Echeances.length === E.length && d.tables.Recettes.length === R.length && d.tables.MobilHome.length === M.length && d.avertissements.length === 0,
  'jeu fictif rechargé à l\'identique (' + d.tables.Recettes.length + ' recettes, ' + d.tables.Echeances.length + ' échéances)');
verif(d.tables.Prestataires.filter(p => p.id === 'PRE-000').length === 1 && d.parametres.EMAIL_TEST === avant.parametres.EMAIL_TEST, 'paramètres conservés, « Autre » présent une seule fois');
verif(d.journal[0].action === 'Réinitialisation', 'réinitialisation journalisée');
appel('enregistrerParametres', { MODE_ENTRAINEMENT: false });
erreur(() => appel('reinitialiserDonnees'), /mode entraînement/, 'mode réel : réinitialisation impossible');

console.log('\n11. Mise à jour d\'une installation du lot 3 (setup puis réinitialisation)');
{
  const c3 = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Buffer });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faux_gas.js'), 'utf8'), c3);
  vm.runInContext('FauxGAS.installer(globalThis)', c3);
  const charger = (dossier) => ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(dossier, f), 'utf8'), c3, { filename: f }));
  charger(path.join(__dirname, 'reference_lot3'));
  vm.runInContext('setup()', c3);
  const a3 = JSON.parse(JSON.stringify(c3.chargerTout()));
  charger(path.join(__dirname, '..', 'apps_script'));
  vm.runInContext('setup()', c3);
  const a4 = JSON.parse(JSON.stringify(c3.chargerTout()));
  verif(a4.tables.Adherents.length === a3.tables.Adherents.length && a4.tables.Recettes.length >= a3.tables.Recettes.length,
    'setup du lot 4 sur un classeur du lot 3 : données conservées (' + a4.tables.Recettes.length + ' recettes)');
  verif(a4.tables.Prestataires.some(p => p.raisonSociale === 'Camping La Clairière') || a4.tables.Prestataires.length === a3.tables.Prestataires.length,
    'prestataires lus sans erreur (' + a4.tables.Prestataires.length + ')');
  const r4 = JSON.parse(JSON.stringify(c3.reinitialiserDonnees()));
  const t4 = r4.donnees.tables;
  verif(t4.Echeances.length === E.length && t4.Recettes.length === R.length && t4.MobilHome.length === M.length && t4.MobilHome.every(m => m.campingId) &&
        t4.Prestataires.length === d.tables.Prestataires.length && r4.donnees.avertissements.length === 0,
    'après « Réinitialiser » : même jeu qu\'une installation neuve (' + t4.Echeances.length + ' échéances, ' + t4.MobilHome.length + ' locations avec camping), aucun avertissement');
  const colsA = vm.runInContext("classeur_().getSheetByName('Adherents').getRange(1, 1, 1, classeur_().getSheetByName('Adherents').getLastColumn()).getValues()[0]", c3);
  verif(colsA.indexOf('Souhaite recevoir le Maillon papier') >= 0 && colsA.indexOf('Souhaite recevoir le Maillon') < 0 &&
        ['Année entrée JMB', 'Date sortie JMB', 'Recevoir toutes les communications par mail'].every(x => colsA.indexOf(x) >= 0),
    'onglet Adherents : colonne Maillon renommée « … papier », colonnes JMB et « tout par mail » ajoutées');
  verif(a4.tables.Adherents.filter(a => a.recoitMaillon).length === a3.tables.Adherents.filter(a => a.recoitMaillon).length && t4.Adherents.some(a => a.anneeEntreeJMB) && t4.Adherents.some(a => a.toutParMail),
    'valeurs du Maillon conservées après renommage ; champs JMB et « tout par mail » remplis par le jeu fictif');
  const cols = vm.runInContext("classeur_().getSheetByName('Recettes').getRange(1, 1, 1, classeur_().getSheetByName('Recettes').getLastColumn()).getValues()[0]", c3);
  verif(["Mode d'encaissement", 'Justificatif', 'Commentaire'].every(x => cols.some(c => String(c).indexOf(x) === 0)), 'onglet Recettes : colonnes Mode d\'encaissement, Justificatif, Commentaire ajoutées');
}

console.log('\n' + ok + ' vérification(s) réussie(s), ' + ko + ' échec(s).');
process.exit(ko ? 1 : 0);
