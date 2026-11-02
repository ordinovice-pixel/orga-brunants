/**
 * =====================================================================
 *  Code.gs — Point d'entrée de l'outil de gestion « Les Brunants »
 * =====================================================================
 *  - doGet()   : affiche l'application web (une seule page à onglets)
 *  - include() : assemble les fichiers HTML (styles, logo, scripts par rubrique)
 *  - setup()   : installe OU répare le classeur. Peut être relancé sans risque :
 *                il ne duplique jamais les données et ne supprime rien.
 *  - onOpen()  : ajoute le menu « Brunants » dans le classeur Google Sheets
 * =====================================================================
 */

var NOM_CLASSEUR = 'Brunants_Donnees';
var NOM_DOSSIER = 'Outil_Brunants';
var NOM_DOSSIER_SAUVEGARDES = 'Sauvegardes';
var NOM_DOSSIER_FICHES = 'Fiches_inscription';
var NB_LIGNES_PREPAREES = 1000;   // lignes formatées à l'avance dans chaque onglet

/* =====================================================================
 *  APPLICATION WEB
 * ===================================================================== */

function doGet(e) {
  try {
    classeur_();   // vérifie que la personne connectée a bien accès au classeur
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Calibri,Arial,sans-serif;font-size:16px;max-width:560px;margin:60px auto;' +
      'padding:24px;border-left:4px solid #C0392B;background:#FDEDEC;color:#1C2833">' +
      '<h2 style="color:#1A5276;margin-top:0">Les Brunants — Outil de gestion</h2>' +
      '<p>' + echapperHtml_(err.message) + '</p></div>')
      .setTitle('Les Brunants — accès refusé');
  }
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Les Brunants — Outil de gestion')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Insère le contenu d'un fichier HTML du projet (utilisé dans Index.html). */
function include(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}

function echapperHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* =====================================================================
 *  MENU DANS LE CLASSEUR
 * ===================================================================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Brunants')
    .addItem("Ouvrir l'outil de gestion", 'menuOuvrirOutil')
    .addItem('Sauvegarder maintenant', 'menuSauvegarder')
    .addSeparator()
    .addItem('Installer / réparer (setup)', 'menuSetup')
    .addToUi();
}

function menuOuvrirOutil() {
  var ui = SpreadsheetApp.getUi();
  var url = ScriptApp.getService().getUrl();
  if (!url) {
    ui.alert("L'application web n'est pas encore déployée.\nDans l'éditeur Apps Script : Déployer > Nouveau déploiement > Application Web.");
    return;
  }
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:Calibri,Arial;font-size:15px"><a href="' + url + '" target="_blank">' +
    'Ouvrir l\'outil de gestion Les Brunants</a></p>').setWidth(360).setHeight(90);
  ui.showModalDialog(html, 'Outil de gestion');
}

/** Menu du classeur : ici la personne regarde le classeur, l'alerte est donc visible. */
function menuSetup() {
  SpreadsheetApp.getUi().alert(setup());
}

function menuSauvegarder() {
  var res = avecVerrou_(function () { return effectuerSauvegarde_('Manuelle (menu du classeur)'); });
  SpreadsheetApp.getUi().alert(res.message);
}

/* =====================================================================
 *  INSTALLATION / RÉPARATION
 * ===================================================================== */

/**
 * À lancer depuis l'éditeur Apps Script (bouton ▶ Exécuter, fonction « setup »).
 *  1. renomme le classeur en Brunants_Donnees et le range dans Outil_Brunants/
 *  2. crée les sous-dossiers Sauvegardes/ et Fiches_inscription/
 *  3. crée les onglets manquants, les en-têtes, les listes déroulantes et les formats
 *  4. charge les données de départ dans les onglets encore vides (jamais de doublon)
 *  5. installe la sauvegarde automatique du 1er de chaque mois
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var idConnu = PropertiesService.getScriptProperties().getProperty('ID_CLASSEUR');
    if (idConnu) ss = SpreadsheetApp.openById(idConnu);
  }
  if (!ss) throw new Error('Ouvrez l\'éditeur depuis le classeur (Extensions > Apps Script) puis relancez setup().');
  var rapport = [];

  // 1. Classeur : nom, fuseau horaire, paramètres régionaux français
  if (ss.getName() !== NOM_CLASSEUR) { ss.rename(NOM_CLASSEUR); rapport.push('Classeur renommé « ' + NOM_CLASSEUR + ' ».'); }
  ss.setSpreadsheetTimeZone('Europe/Paris');
  try { ss.setSpreadsheetLocale('fr_FR'); } catch (e) { /* sans gravité */ }

  // 2. Dossiers sur le Drive
  var props = PropertiesService.getScriptProperties();
  var fichier = DriveApp.getFileById(ss.getId());
  // Outil_Brunants est créé LÀ OÙ SE TROUVE LE CLASSEUR (ex. dans le dossier « Brunants »),
  // pas à la racine du Drive. Si le classeur est déjà dans Outil_Brunants, on garde ce dossier.
  var parentActuel = premierParent_(fichier);
  var racine = dossierMemorise_(props, 'ID_DOSSIER') ||
    (parentActuel && parentActuel.getName() === NOM_DOSSIER ? parentActuel
      : sousDossier_(parentActuel || DriveApp.getRootFolder(), NOM_DOSSIER));
  var sauvegardes = dossierMemorise_(props, 'ID_SAUVEGARDES') || sousDossier_(racine, NOM_DOSSIER_SAUVEGARDES);
  var fiches = dossierMemorise_(props, 'ID_FICHES') || sousDossier_(racine, NOM_DOSSIER_FICHES);
  if (!estDansDossier_(fichier, racine)) {
    fichier.moveTo(racine);
    rapport.push('Classeur rangé dans le dossier « ' + NOM_DOSSIER + ' ».');
  }
  rapport.push('Emplacement sur le Drive : ' + cheminDossier_(racine) + ' (compte ' + Session.getEffectiveUser().getEmail() + ').');
  props.setProperties({
    ID_CLASSEUR: ss.getId(), ID_DOSSIER: racine.getId(),
    ID_SAUVEGARDES: sauvegardes.getId(), ID_FICHES: fiches.getId()
  });

  // 3. Onglets : d'abord tous les en-têtes, ensuite la mise en forme
  //    (les listes déroulantes de catégories pointent vers l'onglet Categories)
  var position = 0;
  TABLES_DONNEES.forEach(function (nom) {
    var res = preparerEntetes_(ss, nom, SCHEMA[nom].champs.map(function (c) { return c.titre; }), position++);
    if (res) rapport.push(res);
  });
  var resP = preparerEntetes_(ss, 'Parametres', TITRES_PARAMETRES, position++);
  if (resP) rapport.push(resP);
  var resJ = preparerEntetes_(ss, 'Journal', TITRES_JOURNAL, position++);
  if (resJ) rapport.push(resJ);
  TABLES_DONNEES.forEach(function (nom) { mettreEnFormeTable_(ss, nom); });
  preparerParametres_(ss, rapport);
  mettreEnFormeJournal_(ss);
  supprimerFeuillesParDefaut_(ss);

  // 4. Données de départ (seulement dans les onglets vides)
  var ctx = contexte_(ss);
  chargerDonneesDeDepart_(ss, ctx, rapport);

  // 5. Sauvegarde automatique mensuelle
  installerDeclencheurs_();
  rapport.push('Sauvegarde automatique programmée le 1er de chaque mois vers 2 h.');

  journaliser_(ss, 'Installation', 'Classeur', '', 'setup() — ' + rapport.length + ' opération(s)');
  var texte = 'Installation terminée.\n- ' + rapport.join('\n- ');
  Logger.log(texte);
  // Pas de fenêtre bloquante ici : lancé depuis l'éditeur, une alerte attendrait un clic
  // dans l'onglet du classeur et ferait expirer l'exécution (6 min). Simple bulle non bloquante.
  try { ss.toast('Installation terminée — détail dans le journal d\'exécution.', 'Brunants', 10); } catch (e) { /* sans gravité */ }
  return texte;
}

function dossierMemorise_(props, cle) {
  var id = props.getProperty(cle);
  if (!id) return null;
  try {
    var d = DriveApp.getFolderById(id);
    return d.isTrashed() ? null : d;
  } catch (e) {
    return null;
  }
}

function sousDossier_(parent, nom) {
  var it = parent.getFoldersByName(nom);
  while (it.hasNext()) {
    var d = it.next();
    if (!d.isTrashed()) return d;
  }
  return parent.createFolder(nom);
}

function premierParent_(fichier) {
  var parents = fichier.getParents();
  return parents.hasNext() ? parents.next() : null;
}

/** Chemin lisible d'un dossier, ex. « Mon Drive / Brunants / Outil_Brunants ». */
function cheminDossier_(dossier) {
  var noms = [];
  var d = dossier;
  for (var i = 0; d && i < 10; i++) {
    noms.unshift(d.getName());
    var p = d.getParents();
    d = p.hasNext() ? p.next() : null;
  }
  return noms.join(' / ');
}

function estDansDossier_(fichier, dossier) {
  var parents = fichier.getParents();
  while (parents.hasNext()) if (parents.next().getId() === dossier.getId()) return true;
  return false;
}

/**
 * Crée l'onglet s'il manque, écrit les en-têtes s'il est vide,
 * ou ajoute en fin de ligne 1 les colonnes manquantes (sans toucher aux autres).
 */
function preparerEntetes_(ss, nom, titres, position) {
  var feuille = ss.getSheetByName(nom);
  var message = '';
  if (!feuille) {
    feuille = ss.insertSheet(nom, Math.min(position, ss.getSheets().length));
    message = 'Onglet « ' + nom + ' » créé.';
  }
  var nbCol = feuille.getLastColumn();
  var entetes = nbCol ? feuille.getRange(1, 1, 1, nbCol).getValues()[0] : [];
  if (entetes.every(estVide_)) {
    feuille.getRange(1, 1, 1, titres.length).setValues([titres]);
    return message;
  }
  var normes = entetes.map(normaliserEntete_);
  var manquants = titres.filter(function (t) { return normes.indexOf(normaliserEntete_(t)) < 0; });
  if (SCHEMA[nom]) {   // une colonne retrouvée par sa clé technique n'est pas « manquante »
    var carte = carteColonnes_(entetes, SCHEMA[nom]);
    manquants = SCHEMA[nom].champs.filter(function (c) { return carte[c.cle] < 0; }).map(function (c) { return c.titre; });
  }
  if (manquants.length) {
    feuille.getRange(1, entetes.length + 1, 1, manquants.length).setValues([manquants]);
    message += (message ? ' ' : '') + 'Onglet « ' + nom + ' » : colonne(s) ajoutée(s) : ' + manquants.join(', ') + '.';
  }
  return message;
}

/** Style commun de la ligne d'en-têtes. */
function styliserEntetes_(feuille, nbCol) {
  feuille.setFrozenRows(1);
  feuille.getRange(1, 1, 1, nbCol)
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1A5276')
    .setWrap(true).setVerticalAlignment('middle');
  feuille.setRowHeight(1, 36);
  // Protection « avertissement seulement » : Sheets prévient avant de modifier un en-tête
  feuille.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === 'En-têtes Brunants') p.remove();
  });
  feuille.getRange(1, 1, 1, nbCol).protect().setDescription('En-têtes Brunants').setWarningOnly(true);
}

function assurerLignes_(feuille) {
  var max = feuille.getMaxRows();
  if (max < NB_LIGNES_PREPAREES) feuille.insertRowsAfter(max, NB_LIGNES_PREPAREES - max);
}

/** Formats (dates, euros, texte) et listes déroulantes de chaque colonne. */
function mettreEnFormeTable_(ss, nom) {
  var sch = SCHEMA[nom];
  var feuille = ss.getSheetByName(nom);
  var entetes = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
  var carte = carteColonnes_(entetes, sch);
  assurerLignes_(feuille);
  styliserEntetes_(feuille, entetes.length);
  var nbLignes = feuille.getMaxRows() - 1;
  var feuilleCat = ss.getSheetByName('Categories');
  var colCat = feuilleCat ? carteColonnes_(feuilleCat.getRange(1, 1, 1, feuilleCat.getLastColumn()).getValues()[0], SCHEMA.Categories).categorie + 1 : 0;

  sch.champs.forEach(function (ch) {
    var i = carte[ch.cle];
    if (i < 0) return;
    var plage = feuille.getRange(2, i + 1, nbLignes, 1);
    var regle = null;
    var largeur = 150;
    switch (ch.type) {
      case 'id': plage.setNumberFormat('@'); largeur = 120; break;
      case 'date':
        plage.setNumberFormat('dd/MM/yyyy');
        regle = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true)
          .setHelpText('Date au format JJ/MM/AAAA').build();
        largeur = 115; break;
      case 'montant': plage.setNumberFormat('#,##0.00 "€"'); largeur = 120; break;
      case 'nombre': plage.setNumberFormat('0.##'); largeur = 110; break;
      case 'oui_non':
        regle = SpreadsheetApp.newDataValidation().requireValueInList(['Oui', 'Non'], true).setAllowInvalid(true).build();
        largeur = 110; break;
      case 'liste':
      case 'calcule':
        plage.setNumberFormat('@');
        regle = SpreadsheetApp.newDataValidation().requireValueInList(ch.valeurs, true).setAllowInvalid(true).build();
        break;
      case 'categorie':
        plage.setNumberFormat('@');
        if (colCat > 0) {
          regle = SpreadsheetApp.newDataValidation()
            .requireValueInRange(feuilleCat.getRange(2, colCat, feuilleCat.getMaxRows() - 1, 1), true)
            .setAllowInvalid(true).build();
        }
        largeur = 180; break;
      case 'cp': plage.setNumberFormat('@'); largeur = 95; break;
      case 'tel': plage.setNumberFormat('@'); largeur = 125; break;
      case 'texte': plage.setNumberFormat('@'); largeur = ch.cle === 'commentaire' || ch.cle === 'descriptif' ? 260 : 160; break;
      default: plage.setNumberFormat('@');
    }
    if (regle) plage.setDataValidation(regle);
    feuille.setColumnWidth(i + 1, largeur);
  });
  if (carte.region >= 0) {   // colonne calculée : grisée pour signaler qu'on n'y touche pas
    feuille.getRange(2, carte.region + 1, nbLignes, 1).setBackground('#F2F3F4').setFontColor('#5D6D7E');
  }
}

/** Onglet Parametres : ajoute les paramètres manquants (ne modifie jamais une valeur existante). */
function preparerParametres_(ss, rapport) {
  var feuille = ss.getSheetByName('Parametres');
  styliserEntetes_(feuille, TITRES_PARAMETRES.length);
  var existants = {};
  if (feuille.getLastRow() >= 2) {
    feuille.getRange(2, 1, feuille.getLastRow() - 1, 1).getValues().forEach(function (l) { existants[String(l[0]).trim()] = true; });
  }
  var ajouts = [];
  PARAMETRES_DEF.forEach(function (p) {
    if (existants[p.cle]) return;
    var valeur = p.defaut;
    if (p.cle === 'EMAIL_TEST') valeur = Session.getEffectiveUser().getEmail() || '';
    if (p.type === 'oui_non') valeur = valeur ? 'Oui' : 'Non';
    ajouts.push([p.cle, p.libelle, valeur, p.description]);
  });
  if (ajouts.length) {
    feuille.getRange(feuille.getLastRow() + 1, 1, ajouts.length, 4).setValues(ajouts);
    rapport.push('Paramètres : ' + ajouts.length + ' paramètre(s) ajouté(s).');
  }
  var n = Math.max(feuille.getLastRow() - 1, 1);
  feuille.getRange(2, 1, n, 2).setBackground('#F2F3F4').setFontColor('#5D6D7E');
  feuille.getRange(2, 3, n, 1).setNumberFormat('@').setFontWeight('bold');
  feuille.getRange(2, 4, n, 1).setWrap(true).setFontColor('#5D6D7E');
  feuille.setColumnWidth(1, 170); feuille.setColumnWidth(2, 300);
  feuille.setColumnWidth(3, 240); feuille.setColumnWidth(4, 520);
}

function mettreEnFormeJournal_(ss) {
  var feuille = ss.getSheetByName('Journal');
  styliserEntetes_(feuille, TITRES_JOURNAL.length);
  feuille.getRange(2, 1, Math.max(feuille.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  [150, 220, 120, 120, 130, 520].forEach(function (l, i) { feuille.setColumnWidth(i + 1, l); });
}

/** Supprime l'onglet vierge créé par Google (« Feuille 1 »), s'il est vide. */
function supprimerFeuillesParDefaut_(ss) {
  var gardes = TABLES_DONNEES.concat(['Parametres', 'Journal']);
  ss.getSheets().forEach(function (f) {
    if (gardes.indexOf(f.getName()) < 0 && /^(feuille|sheet)\s*\d+$/i.test(f.getName()) && f.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(f);
    }
  });
}

/**
 * Écrit en une fois des lignes de départ dans un onglet VIDE (aucune ligne de données).
 * Les ID manquants sont générés. Renvoie le nombre de lignes écrites.
 */
function ecrireLignesDeDepart_(ss, ctx, table, objets) {
  var feuille = ss.getSheetByName(table);
  if (!objets.length) return 0;
  var sch = SCHEMA[table];
  var entetes = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
  var carte = carteColonnes_(entetes, sch);
  var compteurs = {};
  var lignes = objets.map(function (brut) {
    var obj = normaliserEntree_(table, brut, ctx).obj;
    calculerChamps_(table, obj, ctx);
    if (!obj.id) {   // génération locale (onglet vide au départ)
      var def = sch.id;
      var base = def.prefixe + '-' + (def.champAnnee ? String(obj[def.champAnnee]).slice(0, 4) + '-' : '');
      compteurs[base] = (compteurs[base] || 0) + 1;
      var num = String(compteurs[base]);
      while (num.length < def.chiffres) num = '0' + num;
      obj.id = base + num;
    }
    var ligne = entetes.map(function () { return ''; });
    sch.champs.forEach(function (ch) { if (carte[ch.cle] >= 0) ligne[carte[ch.cle]] = versCellule_(obj[ch.cle], ch); });
    return ligne;
  });
  feuille.getRange(feuille.getLastRow() + 1, 1, lignes.length, entetes.length).setValues(lignes);
  return lignes.length;
}

/** Charge le jeu de départ dans les onglets encore vides (voir DonneesFictives.gs). */
function chargerDonneesDeDepart_(ss, ctx, rapport) {
  var jeu = jeuDeDepart_();
  migrerBudgetsFictifsLot1_(ss, ctx, jeu.Budgets, rapport);
  Object.keys(jeu).forEach(function (table) {
    if (!ongletSansDonnees_(ss, ctx, table)) {
      rapport.push(table + ' : déjà rempli, aucune donnée ajoutée.');
      return;
    }
    var lignes = jeu[table];
    if (table === 'Prestataires') lignes = lignes.filter(function (p) { return p.id !== ID_PRESTATAIRE_AUTRE; });
    var n = ecrireLignesDeDepart_(ss, ctx, table, lignes);
    if (n) rapport.push(table + ' : ' + n + ' ligne(s) de départ chargée(s).');
  });
  assurerPrestataireAutre_(ss, ctx, rapport);
}

/**
 * Un onglet est « sans données » s'il n'a que sa ligne d'en-têtes.
 * Exception : Prestataires est considéré vide s'il ne contient que l'entrée permanente « Autre ».
 */
function ongletSansDonnees_(ss, ctx, table) {
  var feuille = ss.getSheetByName(table);
  if (feuille.getLastRow() <= 1) return true;
  if (table !== 'Prestataires') return false;
  var lignes = lireTable_(ss, table, [], ctx);
  return feuille.getLastRow() === 2 && lignes.length === 1 && lignes[0].id === ID_PRESTATAIRE_AUTRE;
}

/**
 * Les budgets fictifs du lot 1 étaient trop faibles pour le jeu de dépenses du lot 3.
 * S'ils n'ont PAS été modifiés à la main (16 lignes identiques aux valeurs d'origine),
 * on les remplace par les nouveaux montants. Sinon on n'y touche pas.
 */
var BUDGETS_FICTIFS_LOT1_ = {
  2025: [5700, 3300, 2400, 2300, 1900, 1400, 2000, 500],
  2026: [6000, 3500, 2500, 2400, 2000, 1500, 2100, 500]
};
function migrerBudgetsFictifsLot1_(ss, ctx, nouveaux, rapport) {
  var actuels = lireTable_(ss, 'Budgets', [], ctx);
  if (actuels.length !== 16) return;
  var identiques = actuels.every(function (b) {
    var i = CATEGORIES_BUDGET.indexOf(b.categorie);
    var ref = BUDGETS_FICTIFS_LOT1_[b.annee];
    return i >= 0 && ref && Number(b.montant) === ref[i];
  });
  if (!identiques) return;
  var feuille = ss.getSheetByName('Budgets');
  var valeurs = feuille.getDataRange().getValues();
  var carte = carteColonnes_(valeurs[0], SCHEMA.Budgets);
  for (var r = 1; r < valeurs.length; r++) {
    var annee = Number(valeurs[r][carte.annee]), cat = String(valeurs[r][carte.categorie]);
    var nv = nouveaux.filter(function (b) { return b.annee === annee && b.categorie === cat; })[0];
    if (nv) feuille.getRange(r + 1, carte.montant + 1).setValue(nv.montant);
  }
  rapport.push('Budgets : montants fictifs du lot 1 remplacés par ceux du lot 3 (cohérents avec les dépenses d\'entraînement).');
}

/** L'entrée « Autre » des prestataires doit toujours exister. */
function assurerPrestataireAutre_(ss, ctx, rapport) {
  var presents = lireTable_(ss, 'Prestataires', [], ctx);
  if (presents.some(function (p) { return p.id === ID_PRESTATAIRE_AUTRE; })) return;
  ecrireLignesDeDepart_(ss, ctx, 'Prestataires', [{
    id: ID_PRESTATAIRE_AUTRE, raisonSociale: 'Autre', activite: 'Autre',
    commentaire: 'Entrée permanente pour les entreprises non listées.'
  }]);
  rapport.push('Prestataires : entrée permanente « Autre » (' + ID_PRESTATAIRE_AUTRE + ') ajoutée.');
}
