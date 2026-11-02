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

/* =====================================================================
 *  ASSISTANT D'IMPORT (lot 6) — Adhérents, Activités, Prestataires, Catégories
 *  Le navigateur lit le fichier (CSV ou XLSX), propose la correspondance des
 *  colonnes, puis envoie les lignes au format { clé du champ : valeur texte }.
 *  Ici : contrôle (verifierImport), puis import (importerDonnees) en trois modes :
 *   - « test »      : dans une COPIE du classeur (le classeur de l'outil n'est pas modifié) ;
 *   - « ajouter »   : les lignes valides sont ajoutées aux données existantes ;
 *   - « remplacer » : la table (et ce qui en dépend) est vidée puis remplacée.
 *  Avant « ajouter » et « remplacer », une sauvegarde complète est faite.
 * ===================================================================== */

var TABLES_IMPORT = ['Adherents', 'Activites', 'Prestataires', 'Categories'];

/** Ce qui est vidé en plus de la table, en mode « remplacer » (pour ne laisser aucune référence cassée). */
var DEPENDANCES_IMPORT = {
  Adherents: 'les inscriptions, les échéances, les locations de mobil-home et les recettes / dépenses automatiques qui en découlent ; l\'adhérent des recettes manuelles et l\'organisateur des activités sont effacés',
  Activites: 'les inscriptions, les échéances et les recettes automatiques de paiement ou de remboursement ; l\'activité liée des recettes et dépenses manuelles est effacée',
  Prestataires: 'rien d\'autre (« Autre » est conservé) ; le prestataire des dépenses et le camping des locations sont effacés s\'ils ne figurent plus dans la liste',
  Categories: 'rien d\'autre ; les recettes, dépenses et activités gardent leur catégorie (signalée si elle n\'existe plus)'
};

/** Champs proposés dans la correspondance des colonnes (sans les champs calculés). */
function champsImport(table) {
  if (TABLES_IMPORT.indexOf(table) < 0) throw new Error('Import impossible pour la table « ' + table + ' ».');
  return SCHEMA[table].champs.filter(function (c) { return c.type !== 'calcule'; }).map(function (c) {
    return { cle: c.cle, titre: c.titre, type: c.type, requis: !!c.requis, valeurs: c.valeurs || null };
  });
}

/** Informations pour l'écran de l'assistant : champs de chaque table et dépendances du mode « remplacer ». */
function infosImport() {
  var t = {};
  TABLES_IMPORT.forEach(function (n) { t[n] = { libelle: SCHEMA[n].libelle, champs: champsImport(n), dependances: DEPENDANCES_IMPORT[n] }; });
  return t;
}

/** Nettoyage d'une ligne reçue : textes, zéros initiaux perdus par Excel (06700, 06…), cases oui/non « x » ou « 1 ». */
function normaliserLigneImport_(table, brut) {
  var o = {};
  SCHEMA[table].champs.forEach(function (ch) {
    if (!(ch.cle in brut) || ch.type === 'calcule') return;
    var v = brut[ch.cle] === null || brut[ch.cle] === undefined ? '' : String(brut[ch.cle]).trim();
    if (ch.type === 'cp' && /^\d{4}$/.test(v)) v = '0' + v;
    if (ch.type === 'tel' && /^\d{9}$/.test(v)) v = '0' + v;
    if (ch.type === 'oui_non') {
      var t = sansAccents_(v).toLowerCase();
      if (t === 'x' || t === '1') v = 'Oui';
      else if (t === '0') v = 'Non';
      if (v === '') { o[ch.cle] = undefined; return; }   // vide : valeur par défaut du champ
    }
    if (v === '' && ch.type !== 'oui_non' && (ch.defaut !== undefined || ch.defautParam)) { o[ch.cle] = undefined; return; }   // ex. Type vide → Titulaire
    if (ch.type === 'nombre' || ch.type === 'montant') v = v.replace(/\s/g, '');
    if (ch.type === 'liste' && v && ch.valeurs) {   // « transport » → « Transport », « Mme. » → « Mme »
      var cle = function (x) { return sansAccents_(x).toLowerCase().replace(/[^a-z0-9]/g, ''); };
      var proche = ch.valeurs.filter(function (x) { return cle(x) === cle(v); })[0];
      if (proche) v = proche;
    }
    o[ch.cle] = v;
  });
  if (o.nom && table === 'Adherents') o.nom = o.nom.toUpperCase();
  return o;
}

/** Libellé court d'une ligne, pour le rapport. */
function resumeLigneImport_(table, o) {
  if (table === 'Adherents') return [o.nom, o.prenom].filter(Boolean).join(' ');
  if (table === 'Activites') return (o.nom || '') + (o.dateDebut ? ' (' + isoVersFr_(o.dateDebut) + ')' : '');
  if (table === 'Prestataires') return o.raisonSociale || '';
  return (o.categorie || '') + (o.sousCategorie ? ' / ' + o.sousCategorie : '');
}

/**
 * Contrôle des lignes, sans rien écrire. Renvoie pour chaque ligne :
 * statut « Valide », « À corriger » (importée, avec remarque) ou « Rejetée » (non importée, avec motif).
 */
function analyserImport_(ss, ctx, table, lignes, mode, decalage) {
  decalage = Number(decalage) || 0;   // n° de la ligne des en-têtes : les lignes sont numérotées comme dans le fichier
  var existantsBase = {};
  ['Categories', 'Adherents', 'Prestataires', 'Activites'].forEach(function (t) { existantsBase[t] = lireTable_(ss, t, [], ctx); });
  var garder = mode === 'ajouter';
  var entrees = lignes.map(function (brut, i) {
    var n = normaliserEntree_(table, normaliserLigneImport_(table, brut || {}), ctx);
    var o = n.obj;
    var idFichier = o.id;
    o.id = '#' + (i + 1);   // identifiant provisoire : sert à repérer les doublons à l'intérieur du fichier
    calculerChamps_(table, o, ctx);
    return { n: i + 1 + decalage, rang: i + 1, obj: o, idFichier: idFichier, erreurs: n.erreurs.slice(), remarques: [] };
  });
  var duFichier = entrees.map(function (e) { return e.obj; });
  // références (conjoint, organisateur) : vers les ID du fichier, ou vers les données existantes en mode « ajouter »
  var idsFichier = {};
  entrees.forEach(function (e) { if (e.idFichier) idsFichier[e.idFichier] = e.obj.id; });
  var existants = {};
  Object.keys(existantsBase).forEach(function (t) {
    existants[t] = t === table ? (garder ? existantsBase[t].concat(duFichier) : duFichier) : existantsBase[t];
  });
  if (table === 'Categories' && !garder) existants.Categories = duFichier;
  entrees.forEach(function (e) {
    var o = e.obj;
    SCHEMA[table].champs.forEach(function (ch) {
      if (ch.type === 'ref' && ch.table === table && o[ch.cle] && idsFichier[o[ch.cle]]) o[ch.cle] = idsFichier[o[ch.cle]];
    });
    // doublons à l'intérieur du fichier : seule la seconde occurrence est rejetée
    e.erreurs = e.erreurs.concat(reglesMetier_(table, o, existants, ctx, 'Import'), validerObjet_(table, o, existants)).filter(function (m) {
      var k = /#(\d+)\b/.exec(m);
      return !(k && /doublon|existe déjà/i.test(m) && Number(k[1]) > e.rang);
    }).map(function (m) { return m.replace(/#(\d+)\b/g, function (x, k) { return 'ligne ' + (Number(k) + decalage) + ' du fichier'; }); });
    if (table === 'Prestataires' && e.idFichier === ID_PRESTATAIRE_AUTRE) e.erreurs = ['« Autre » (' + ID_PRESTATAIRE_AUTRE + ') existe déjà dans l\'outil : ligne ignorée.'];
    e.remarques = e.remarques.concat(controlesLecture_(table, o));
    if (e.idFichier && !new RegExp('^' + SCHEMA[table].id.prefixe + '-').test(e.idFichier)) e.remarques.push('ID « ' + e.idFichier + ' » non reconnu : un nouvel ID sera attribué');
  });
  // conjoints : lien réciproque attendu
  if (table === 'Adherents') {
    var parId = {};
    entrees.forEach(function (e) { parId[e.obj.id] = e.obj; });
    entrees.forEach(function (e) {
      var c = e.obj.rattacheA && parId[e.obj.rattacheA];
      if (c && c.rattacheA !== e.obj.id) e.remarques.push('Rattachement non réciproque (le conjoint n\'est pas rattaché en retour)');
    });
  }
  entrees.forEach(function (e) {
    e.statut = e.erreurs.length ? 'Rejetée' : (e.remarques.length ? 'À corriger' : 'Valide');
    e.resume = resumeLigneImport_(table, e.obj);
  });
  return entrees;
}

function statsImport_(entrees) {
  var s = { lues: entrees.length, valides: 0, aCorriger: 0, rejetees: 0 };
  entrees.forEach(function (e) { if (e.statut === 'Valide') s.valides++; else if (e.statut === 'À corriger') s.aCorriger++; else s.rejetees++; });
  return s;
}

/** Contrôle avant import (aucune écriture). */
function verifierImport(table, lignes, mode, decalage) {
  champsImport(table);
  var ss = classeur_();
  var ctx = contexte_(ss);
  var entrees = analyserImport_(ss, ctx, table, lignes || [], mode, decalage);
  return {
    stats: statsImport_(entrees),
    lignes: entrees.map(function (e) { return { n: e.n, statut: e.statut, resume: e.resume, motifs: e.erreurs.concat(e.remarques) }; })
  };
}

/** Vide une table en gardant éventuellement certaines lignes (sur les valeurs brutes : rien n'est perdu de ce qu'on garde). */
function filtrerOnglet_(ss, table, garder, modifier) {
  var f = ss.getSheetByName(table);
  if (!f || f.getLastRow() < 2) return 0;
  var valeurs = f.getDataRange().getValues();
  var entetes = valeurs[0];
  var carte = carteColonnes_(entetes, SCHEMA[table]);
  var cell = function (ligne, cle) { return carte[cle] >= 0 ? String(ligne[carte[cle]] === null ? '' : ligne[carte[cle]]).trim() : ''; };
  var gardees = valeurs.slice(1).filter(function (l) { return !l.every(estVide_) && garder(l, cell); });
  if (modifier) gardees.forEach(function (l) { modifier(l, cell, carte); });
  f.getRange(2, 1, valeurs.length - 1, entetes.length).clearContent();
  if (gardees.length) f.getRange(2, 1, gardees.length, entetes.length).setValues(gardees);
  return valeurs.length - 1 - gardees.length;
}

/** Mode « remplacer » : vide la table et ce qui en dépend. Renvoie le résumé des suppressions. */
function viderPourRemplacement_(ss, table, nouveauxIds) {
  var r = [];
  var auto = function (l, cell) { var o = cell(l, 'origine'); return !o || o === 'Saisie manuelle'; };
  var effacer = function (cle, garderSi) {
    return function (l, cell, carte) { if (carte[cle] >= 0 && cell(l, cle) && !(garderSi && garderSi(cell(l, cle)))) l[carte[cle]] = ''; };
  };
  if (table === 'Adherents') {
    ['Inscriptions', 'Echeances', 'MobilHome'].forEach(function (t) { var n = filtrerOnglet_(ss, t, function () { return false; }); if (n) r.push(n + ' ligne(s) ' + t); });
    var n1 = filtrerOnglet_(ss, 'Recettes', auto, effacer('adherentId', function (id) { return nouveauxIds[id]; }));
    var n2 = filtrerOnglet_(ss, 'Depenses', auto);
    if (n1 + n2) r.push((n1 + n2) + ' recette(s) / dépense(s) automatique(s)');
    filtrerOnglet_(ss, 'Activites', function () { return true; }, effacer('organisateur', function (id) { return nouveauxIds[id]; }));
  } else if (table === 'Activites') {
    ['Inscriptions', 'Echeances'].forEach(function (t) { var n = filtrerOnglet_(ss, t, function () { return false; }); if (n) r.push(n + ' ligne(s) ' + t); });
    var garderRec = function (l, cell) { return !/^ECH-/.test(cell(l, 'echeanceId')); };
    var garderDep = function (l, cell) { return cell(l, 'origine') !== 'Remboursement'; };
    var n3 = filtrerOnglet_(ss, 'Recettes', garderRec, effacer('activiteId', function (id) { return nouveauxIds[id]; }));
    var n4 = filtrerOnglet_(ss, 'Depenses', garderDep, effacer('activiteId', function (id) { return nouveauxIds[id]; }));
    if (n3 + n4) r.push((n3 + n4) + ' recette(s) / dépense(s) de paiement ou de remboursement');
  } else if (table === 'Prestataires') {
    var garde = function (id) { return id === ID_PRESTATAIRE_AUTRE || nouveauxIds[id]; };
    filtrerOnglet_(ss, 'Depenses', function () { return true; }, effacer('prestataireId', garde));
    filtrerOnglet_(ss, 'MobilHome', function () { return true; }, effacer('campingId', garde));
  }
  var n = filtrerOnglet_(ss, table, table === 'Prestataires' ? function (l, cell) { return cell(l, 'id') === ID_PRESTATAIRE_AUTRE; } : function () { return false; });
  r.unshift(n + ' ligne(s) ' + table + ' remplacée(s)');
  return r;
}

/**
 * Écrit les objets validés : l'ID du fichier est gardé s'il a le bon format et n'est pas déjà pris,
 * sinon un nouvel ID est attribué (les conjoints / organisateurs du fichier suivent).
 */
function ecrireImport_(ss, ctx, table, objets) {
  if (!objets.length) return [];
  var sch = SCHEMA[table];
  var feuille = ss.getSheetByName(table);
  var entetes = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
  var carte = carteColonnes_(entetes, sch);
  var pris = {};
  lireTable_(ss, table, [], ctx).forEach(function (x) { pris[x.id] = true; });
  var motif = new RegExp('^' + sch.id.prefixe + '-' + (sch.id.champAnnee ? '\\d{4}-' : '') + '\\d{' + sch.id.chiffres + ',}$');
  var compteurs = {}, correspondance = {};
  objets.forEach(function (e) {
    var o = e.obj, ancien = o.id;
    var id = e.idFichier && motif.test(e.idFichier) && !pris[e.idFichier] ? e.idFichier : '';
    if (id) pris[id] = true;
    o.id = id;
    correspondance[ancien] = o;
  });
  objets.forEach(function (e) {
    var o = e.obj;
    if (o.id) return;
    var base = baseId_(table, o);
    if (!(base in compteurs)) {
      compteurs[base] = numeroMax_(feuille, table, base);
      Object.keys(pris).forEach(function (id) { if (id.indexOf(base) === 0) compteurs[base] = Math.max(compteurs[base], Number(id.slice(base.length)) || 0); });
    }
    do { o.id = formaterId_(table, base, ++compteurs[base]); } while (pris[o.id]);
    pris[o.id] = true;
  });
  // références internes au fichier (ID provisoires « #n ») → ID définitifs
  objets.forEach(function (e) {
    sch.champs.forEach(function (ch) {
      if (ch.type === 'ref' && ch.table === table && /^#\d+$/.test(String(e.obj[ch.cle] || ''))) e.obj[ch.cle] = correspondance[e.obj[ch.cle]] ? correspondance[e.obj[ch.cle]].id : '';
    });
  });
  var lignes = objets.map(function (e) {
    var ligne = entetes.map(function () { return ''; });
    sch.champs.forEach(function (ch) { if (carte[ch.cle] >= 0) ligne[carte[ch.cle]] = versCellule_(e.obj[ch.cle], ch); });
    return ligne;
  });
  feuille.getRange(Math.max(feuille.getLastRow(), 1) + 1, 1, lignes.length, entetes.length).setValues(lignes);
  return objets.map(function (e) { return e.obj.id; });
}

/** Copie de test du classeur (dossier Outil_Brunants/Tests_import). */
function creerCopieTest_(ss, ctx) {
  var racine = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ID_DOSSIER'));
  var dossierTests = sousDossier_(racine, DOSSIER_TESTS_IMPORT);
  var horodatage = Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd_HH\'h\'mm');
  var copie = DriveApp.getFileById(ss.getId()).makeCopy(PREFIXE_COPIE_TEST + '_' + horodatage, dossierTests);
  var test = SpreadsheetApp.openById(copie.getId());
  if (test.getId() === ss.getId()) throw new Error('Sécurité : la copie a le même identifiant que l\'original, import annulé.');
  return test;
}

/** Import : mode « test » (copie), « ajouter » ou « remplacer ». */
function importerDonnees(table, lignes, mode, decalage) {
  champsImport(table);
  if (['test', 'ajouter', 'remplacer'].indexOf(mode) < 0) throw new Error('Mode d\'import inconnu.');
  var res = avecVerrou_(function () {
    var ss = classeur_();
    if (estCopieTest_(ss)) throw new Error('Ce classeur est une copie de test : importez depuis l\'outil principal.');
    var ctx = contexte_(ss);
    var entrees = analyserImport_(ss, ctx, table, lignes || [], mode === 'ajouter' ? 'ajouter' : 'remplacer', decalage);
    var bonnes = entrees.filter(function (e) { return e.statut !== 'Rejetée'; });
    if (!bonnes.length) throw new Error('Aucune ligne importable : corrigez le fichier (voir le contrôle).');
    var cible = ss, sauvegarde = null, details = [];
    if (mode === 'test') cible = creerCopieTest_(ss, ctx);
    else sauvegarde = effectuerSauvegarde_('Avant import ' + table + ' (' + mode + ')');
    var ctxCible = mode === 'test' ? contexte_(cible) : ctx;
    // un conjoint / organisateur rejeté ne laisse pas de lien vers une fiche absente
    var gardes = {};
    bonnes.forEach(function (e) { gardes[e.obj.id] = true; });
    bonnes.forEach(function (e) {
      SCHEMA[table].champs.forEach(function (ch) {
        if (ch.type === 'ref' && ch.table === table && /^#\d+$/.test(String(e.obj[ch.cle] || '')) && !gardes[e.obj[ch.cle]]) {
          e.obj[ch.cle] = ''; e.remarques.push('Lien vers une ligne rejetée retiré');
        }
      });
    });
    if (mode !== 'ajouter') {
      var futurs = {};
      bonnes.forEach(function (e) { if (e.idFichier) futurs[e.idFichier] = true; });
      details = viderPourRemplacement_(cible, table, futurs);
      if (table === 'Prestataires') assurerPrestataireAutre_(cible, ctxCible, []);
    }
    var ids = ecrireImport_(cible, ctxCible, table, bonnes);
    var stats = statsImport_(entrees);
    stats.importees = ids.length;
    var resume = ids.length + ' ligne(s) importée(s) dans ' + table + ' (' + stats.rejetees + ' rejetée(s), ' + stats.aCorriger + ' à corriger)';
    if (mode === 'test') {
      ecrireRapportAssistant_(cible, table, entrees, stats, details, ctx);
      journaliser_(cible, 'Test d\'import', table, '', resume);
      journaliser_(ss, 'Test d\'import', table, '', resume + ' dans la copie « ' + cible.getName() + ' ». Le classeur de l\'outil n\'a pas été modifié.');
    } else {
      journaliser_(ss, 'Import', table, '', resume + ' — mode « ' + mode + ' »' + (details.length ? ' — ' + details.join(', ') : '') + ' — sauvegarde préalable « ' + sauvegarde.nom + ' »');
    }
    return {
      mode: mode, stats: stats, url: mode === 'test' ? cible.getUrl() : '', nom: mode === 'test' ? cible.getName() : '',
      message: (mode === 'test' ? 'Test terminé dans la copie « ' + cible.getName() + ' » : ' : 'Import terminé : ') + resume + '.' +
        (details.length ? '\n' + (mode === 'test' ? 'Dans la copie : ' : '') + details.join(', ') + '.' : '') +
        (sauvegarde ? '\nSauvegarde faite juste avant : « ' + sauvegarde.nom + ' ».' : '\nLe classeur de l\'outil n\'a pas été modifié.')
    };
  });
  return reponse_(res.message, '', { mode: res.mode, stats: res.stats, url: res.url, nom: res.nom });
}

/** Onglet « Rapport_import » de la copie de test (assistant). */
function ecrireRapportAssistant_(test, table, entrees, stats, details, ctx) {
  var f = test.getSheetByName('Rapport_import') || test.insertSheet('Rapport_import', 0);
  f.clear();
  var entete = [
    ['Test d\'import — table ' + table + ' — ' + Utilities.formatDate(new Date(), ctx.tz, 'dd/MM/yyyy HH:mm'), '', '', ''],
    ['Copie de test : le classeur Brunants_Donnees de l\'outil n\'a pas été modifié. ' + (details.length ? 'Dans cette copie : ' + details.join(', ') + '.' : ''), '', '', ''],
    ['Lignes lues', stats.lues, 'Importées', stats.importees],
    ['Valides', stats.valides, 'À corriger', stats.aCorriger],
    ['Rejetées', stats.rejetees, '', ''],
    ['', '', '', ''],
    ['Ligne du fichier', 'Résultat', 'Ligne', 'Motifs']
  ];
  var lignes = entrees.slice().sort(function (a, b) {
    var r = { 'Rejetée': 0, 'À corriger': 1, 'Valide': 2 };
    return r[a.statut] - r[b.statut] || a.n - b.n;
  }).map(function (e) { return [e.n, e.statut, e.resume, e.erreurs.concat(e.remarques).join(' · ')]; });
  f.getRange(1, 1, entete.length, 4).setValues(entete);
  if (lignes.length) f.getRange(entete.length + 1, 1, lignes.length, 4).setValues(lignes);
  try {
    f.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    f.getRange(entete.length, 1, 1, 4).setFontWeight('bold').setBackground('#1A5276').setFontColor('#FFFFFF');
    f.setFrozenRows(entete.length);
    if (lignes.length) f.getRange(entete.length, 1, lignes.length + 1, 4).createFilter();
    f.setColumnWidth(4, 560);
  } catch (e) { /* mise en forme facultative */ }
}
