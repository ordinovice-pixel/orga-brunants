/**
 * =====================================================================
 *  Import.gs — Test d'import des vraies données (« dry run »)
 * =====================================================================
 *  Principe (demande de Jeff du 18/10/2026) : AUCUNE écriture dans le
 *  classeur de l'outil. On fabrique une COPIE de Brunants_Donnees
 *  (dossier Outil_Brunants/Tests_import), on y vide les données fictives,
 *  on y importe les adhérents du fichier préparé
 *  « Import_Adherents_Brunants.csv », puis on ajoute un onglet
 *  « Rapport_import » : lignes importées, refusées, à vérifier.
 *
 *  Le fichier CSV est produit à partir du fichier réel
 *  « base de données Brunants MAJ 2025-06-16-copie » (onglet « Base de
 *  données ») : une ligne par personne, colonnes = en-têtes de l'onglet
 *  Adherents, + « Statut ancien fichier » et « À vérifier (import) ».
 *  Il peut être déposé tel quel dans le dossier Outil_Brunants du Drive,
 *  ou converti en Google Sheets : les deux formes sont lues.
 * =====================================================================
 */

var PREFIXE_FICHIER_IMPORT = 'Import_Adherents_Brunants';
var PREFIXE_COPIE_TEST = 'Brunants_Donnees_TEST_IMPORT';
var DOSSIER_TESTS_IMPORT = 'Tests_import';
/** Tables vidées dans la copie de test (on ne garde que Categories, Parametres et Journal). */
var TABLES_VIDEES_TEST = ['Adherents', 'Activites', 'Inscriptions', 'Echeances', 'Recettes', 'Depenses', 'Budgets', 'Prestataires', 'MobilHome'];

/** Vrai si le classeur est une copie de test d'import (l'outil ne doit pas y travailler). */
function estCopieTest_(ss) {
  return !!ss && String(ss.getName()).indexOf(PREFIXE_COPIE_TEST) === 0;
}

/** Fichier d'import le plus récent : d'abord dans Outil_Brunants, sinon n'importe où dans le Drive. */
function trouverFichierImport_() {
  var candidats = [];
  var props = PropertiesService.getScriptProperties();
  var idDossier = props.getProperty('ID_DOSSIER');
  if (idDossier) {
    try {
      var it = DriveApp.getFolderById(idDossier).getFiles();
      while (it.hasNext()) {
        var f = it.next();
        if (String(f.getName()).indexOf(PREFIXE_FICHIER_IMPORT) === 0 && !f.isTrashed()) candidats.push(f);
      }
    } catch (e) { /* dossier introuvable : recherche dans tout le Drive */ }
  }
  if (!candidats.length && DriveApp.searchFiles) {
    var it2 = DriveApp.searchFiles("title contains '" + PREFIXE_FICHIER_IMPORT + "' and trashed = false");
    while (it2.hasNext()) candidats.push(it2.next());
  }
  if (!candidats.length) {
    throw new Error('Fichier « ' + PREFIXE_FICHIER_IMPORT + '.csv » introuvable. Déposez-le dans le dossier Outil_Brunants de votre Google Drive, puis recommencez.');
  }
  candidats.sort(function (a, b) { return b.getLastUpdated().getTime() - a.getLastUpdated().getTime(); });
  return candidats[0];
}

/** Lit le fichier d'import (CSV « ; » en UTF-8, ou Google Sheets) → tableau de lignes (1re ligne = en-têtes). */
function lireFichierImport_(fichier) {
  if (fichier.getMimeType() === 'application/vnd.google-apps.spreadsheet') {
    // CSV converti en Google Sheets (ou ouvert puis enregistré) : on lit les vraies valeurs, pas l'affichage
    var classeurImport = SpreadsheetApp.openById(fichier.getId());
    var tz = classeurImport.getSpreadsheetTimeZone();
    var valeurs = classeurImport.getSheets()[0].getDataRange().getValues();
    var entetes = valeurs[0].map(String);
    var colonnesDates = SCHEMA.Adherents.champs.filter(function (c) { return c.type === 'date'; })
      .map(function (c) { return entetes.map(normaliserEntete_).indexOf(normaliserEntete_(c.titre)); })
      .filter(function (i) { return i >= 0; });
    // dates lues « à l'américaine » (mois/jour) : les jours > 12 restent alors du texte à côté de vraies dates
    var douteuses = 0, vraies = 0;
    valeurs.slice(1).forEach(function (l) {
      colonnesDates.forEach(function (i) {
        if (Object.prototype.toString.call(l[i]) === '[object Date]') vraies++;
        else if (/^(1[3-9]|2\d|3[01])\/\d{1,2}\/\d{4}$/.test(String(l[i]).trim())) douteuses++;
      });
    });
    if (vraies && douteuses) {
      throw new Error('Le fichier d\'import a été converti en Google Sheets avec des dates au format américain (mois/jour) : ' + douteuses +
        ' date(s) sont restées en texte. Supprimez cette version du Drive et déposez le fichier .csv d\'origine sans l\'ouvrir ni le convertir.');
    }
    return valeurs.map(function (l, n) {
      return l.map(function (v) {
        if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'dd/MM/yyyy');
        return v === null || v === undefined ? '' : String(v);
      });
    });
  }
  var texte = fichier.getBlob().getDataAsString('UTF-8').replace(/^﻿/, '');
  var sep = texte.split('\n')[0].indexOf(';') >= 0 ? ';' : ',';
  return Utilities.parseCsv(texte, sep);
}

/** Lignes du fichier → objets { cle: valeur } de la table Adherents + colonnes d'information. */
function objetsDepuisLignes_(lignes) {
  if (!lignes.length) throw new Error('Le fichier d\'import est vide.');
  var entetes = lignes[0].map(function (h) { return String(h); });
  var carte = carteColonnes_(entetes, SCHEMA.Adherents);
  var manquantes = SCHEMA.Adherents.champs.filter(function (c) { return c.requis && carte[c.cle] < 0; }).map(function (c) { return c.titre; });
  if (manquantes.length) throw new Error('Colonnes obligatoires absentes du fichier d\'import : ' + manquantes.join(', ') + '.');
  var iStatut = entetes.map(normaliserEntete_).indexOf(normaliserEntete_('Statut ancien fichier'));
  var iVerif = entetes.map(normaliserEntete_).indexOf(normaliserEntete_('À vérifier (import)'));
  var objets = [];
  for (var l = 1; l < lignes.length; l++) {
    var ligne = lignes[l];
    if (ligne.every(function (v) { return estVide_(v); })) continue;
    var brut = {};
    SCHEMA.Adherents.champs.forEach(function (ch) {
      if (carte[ch.cle] < 0 || ch.type === 'calcule') return;
      var v = String(ligne[carte[ch.cle]] === null || ligne[carte[ch.cle]] === undefined ? '' : ligne[carte[ch.cle]]).trim();
      // fichier ouvert dans Excel ou Sheets avant le dépôt : zéro initial perdu (06700 → 6700)
      if (ch.type === 'cp' && /^\d{4}$/.test(v)) v = '0' + v;
      if (ch.type === 'tel' && /^\d{9}$/.test(v)) v = '0' + v;
      brut[ch.cle] = v;
    });
    objets.push({ brut: brut, ligneFichier: l + 1,
                  statut: iStatut >= 0 ? String(ligne[iStatut] || '') : '',
                  aVerifier: iVerif >= 0 ? String(ligne[iVerif] || '') : '' });
  }
  return objets;
}

/**
 * Test d'import des adhérents dans une COPIE de Brunants_Donnees.
 * Appelé depuis Administration → « Tester l'import des adhérents ».
 * Renvoie le lien de la copie et les chiffres du test.
 */
function testerImportAdherents() {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    if (estCopieTest_(ss)) throw new Error('Ce classeur est déjà une copie de test : lancez le test depuis l\'outil principal.');
    var ctx = contexte_(ss);
    var fichier = trouverFichierImport_();
    var entrees = objetsDepuisLignes_(lireFichierImport_(fichier));

    // 1. Normalisation et contrôles, comme une saisie dans l'outil
    var objets = entrees.map(function (e) {
      var n = normaliserEntree_('Adherents', e.brut, ctx);
      e.obj = n.obj; e.erreurs = n.erreurs.slice();
      return e;
    });
    var existants = { Adherents: objets.map(function (e) { return e.obj; }) };
    var idsVus = {};
    objets.forEach(function (e) {
      var o = e.obj;
      if (!o.id) e.erreurs.push('ID absent.');
      else if (idsVus[o.id]) e.erreurs.push('ID ' + o.id + ' en double dans le fichier.');
      idsVus[o.id] = true;
      e.erreurs = e.erreurs.concat(reglesMetier_('Adherents', o, existants, ctx, 'Saisie'), validerObjet_('Adherents', o, existants));
    });
    // conjoint réciproque
    var parId = {};
    objets.forEach(function (e) { parId[e.obj.id] = e.obj; });
    objets.forEach(function (e) {
      var c = e.obj.rattacheA && parId[e.obj.rattacheA];
      if (c && c.rattacheA !== e.obj.id) {   // non bloquant : signalé dans le rapport
        e.aVerifier = (e.aVerifier ? e.aVerifier + ' · ' : '') + 'Rattachement non réciproque : ' + c.id + ' n\'est pas rattaché(e) à ' + e.obj.id;
      }
    });
    var bons = objets.filter(function (e) { return !e.erreurs.length; });
    var refuses = objets.filter(function (e) { return e.erreurs.length; });
    // un conjoint refusé ne doit pas laisser de lien vers une fiche absente
    var idsBons = {};
    bons.forEach(function (e) { idsBons[e.obj.id] = true; });
    bons.forEach(function (e) {
      if (e.obj.rattacheA && !idsBons[e.obj.rattacheA]) {
        e.aVerifier = (e.aVerifier ? e.aVerifier + ' · ' : '') + 'Conjoint ' + e.obj.rattacheA + ' refusé : lien retiré';
        e.obj.rattacheA = '';
      }
    });

    // 2. Copie du classeur (l'original n'est jamais modifié)
    var racine = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ID_DOSSIER'));
    var dossierTests = sousDossier_(racine, DOSSIER_TESTS_IMPORT);
    var horodatage = Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd_HH\'h\'mm');
    var copie = DriveApp.getFileById(ss.getId()).makeCopy(PREFIXE_COPIE_TEST + '_' + horodatage, dossierTests);
    var test = SpreadsheetApp.openById(copie.getId());
    if (test.getId() === ss.getId()) throw new Error('Sécurité : la copie a le même identifiant que l\'original, import annulé.');

    // 3. Vider les données fictives de la copie, puis importer
    TABLES_VIDEES_TEST.forEach(function (t) {
      var f = test.getSheetByName(t);
      if (f && f.getLastRow() > 1) f.getRange(2, 1, f.getLastRow() - 1, Math.max(f.getLastColumn(), 1)).clearContent();
    });
    var ctxTest = contexte_(test);
    assurerPrestataireAutre_(test, ctxTest, []);
    ecrireLignesDeDepart_(test, ctxTest, 'Adherents', bons.map(function (e) { return e.obj; }));

    // 4. Relecture par l'outil, comme à l'ouverture : avertissements éventuels
    var avert = [];
    var relus = lireTable_(test, 'Adherents', avert, ctxTest);
    verifierReferences_({ Adherents: relus }, avert);
    var avertParId = {};
    var ignores = {};
    avert.forEach(function (a) {
      if (!a.id) return;
      (avertParId[a.id] = avertParId[a.id] || []).push((a.niveau === 'Ignorée' ? 'Ignorée à la relecture : ' : 'À vérifier : ') + a.motif);
      if (a.niveau === 'Ignorée') ignores[a.id] = true;
    });
    objets.forEach(function (e) { if (ignores[e.obj.id]) e.erreurs.push('Ligne ignorée par l\'outil à la relecture.'); });

    // 5. Onglet « Rapport_import »
    var stats = { lus: objets.length, importes: relus.length, refuses: objets.length - relus.length, avertis: Object.keys(avertParId).length,
                  actifs: 0, titulaires: 0, sympathisants: 0, deces: 0, anciens: 0, couples: 0, aVerifier: 0 };
    relus.forEach(function (a) {
      if (a.deces) stats.deces++;
      else if (a.desinscrit) stats.anciens++;
      else { stats.actifs++; if (a.type === 'Titulaire') stats.titulaires++; else stats.sympathisants++; }
      if (a.rattacheA) stats.couples++;
    });
    stats.couples = Math.round(stats.couples / 2);
    bons.forEach(function (e) { if (e.aVerifier) stats.aVerifier++; });
    ecrireRapportImport_(test, fichier, stats, objets, avertParId, ctx);
    journaliser_(test, 'Test d\'import', 'Adherents', '', stats.importes + ' adhérent(s) importé(s) depuis « ' + fichier.getName() + ' »');
    journaliser_(ss, 'Test d\'import', 'Adherents', '', 'Copie de test « ' + test.getName() + ' » : ' + stats.importes + ' importé(s), ' +
      stats.refuses + ' refusé(s). Le classeur de l\'outil n\'a pas été modifié.');
    return {
      url: test.getUrl(), nom: test.getName(), stats: stats,
      message: 'Test d\'import terminé : ' + stats.importes + ' fiche(s) importée(s) sur ' + stats.lus + ', ' + stats.refuses + ' refusée(s), ' +
        stats.aVerifier + ' à vérifier. Résultat dans la copie « ' + test.getName() + ' » (onglet Rapport_import). Brunants_Donnees n\'a pas été modifié.'
    };
  });
  return reponse_(res.message, '', { url: res.url, nom: res.nom, stats: res.stats });
}

/** Écrit l'onglet « Rapport_import » en tête de la copie de test. */
function ecrireRapportImport_(test, fichier, stats, objets, avertParId, ctx) {
  var f = test.getSheetByName('Rapport_import') || test.insertSheet('Rapport_import', 0);
  f.clear();
  var resume = [
    ['Test d\'import des adhérents — ' + Utilities.formatDate(new Date(), ctx.tz, 'dd/MM/yyyy HH:mm'), '', '', '', '', '', '', ''],
    ['Fichier importé : ' + fichier.getName() + ' · copie de test : le classeur Brunants_Donnees de l\'outil n\'a pas été modifié.', '', '', '', '', '', '', ''],
    ['Lignes lues', stats.lus, 'Importées', stats.importes, 'Refusées', stats.refuses, 'À vérifier', stats.aVerifier],
    ['Actifs', stats.actifs, 'dont titulaires', stats.titulaires, 'dont sympathisants', stats.sympathisants, 'Couples reliés', stats.couples],
    ['Décédés (archives)', stats.deces, 'Anciens adhérents (archives)', stats.anciens, 'Avertissements à la relecture', stats.avertis, '', ''],
    ['', '', '', '', '', '', '', '']
  ];
  var entetes = ['Résultat', 'ID', 'Nom', 'Prénom', 'Statut ancien fichier', 'Type', 'Conjoint (ID)', 'Refus, avertissements et points à vérifier'];
  var lignes = objets.map(function (e) {
    var o = e.obj;
    var resultat = e.erreurs.length ? 'Refusée' : ((avertParId[o.id] || e.aVerifier) ? 'Importée — à vérifier' : 'Importée');
    var notes = e.erreurs.concat((avertParId[o.id] || []).filter(function (m) { return e.erreurs.indexOf(m) < 0; })).concat(e.aVerifier ? [e.aVerifier] : []);
    return [resultat, o.id, o.nom, o.prenom, e.statut, o.type, o.rattacheA || '', notes.join(' · ')];
  });
  lignes.sort(function (a, b) {
    var rang = { 'Refusée': 0, 'Importée — à vérifier': 1, 'Importée': 2 };
    return rang[a[0]] - rang[b[0]] || String(a[2]).localeCompare(String(b[2]));
  });
  f.getRange(1, 1, resume.length, 8).setValues(resume);
  f.getRange(resume.length + 1, 1, 1, 8).setValues([entetes]);
  if (lignes.length) f.getRange(resume.length + 2, 1, lignes.length, 8).setValues(lignes);
  try {
    f.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    f.getRange(resume.length + 1, 1, 1, 8).setFontWeight('bold').setBackground('#1A5276').setFontColor('#FFFFFF');
    f.setFrozenRows(resume.length + 1);
    if (lignes.length) f.getRange(resume.length + 1, 1, lignes.length + 1, 8).createFilter();
    f.setColumnWidth(8, 520);
  } catch (e) { /* mise en forme facultative */ }
}
