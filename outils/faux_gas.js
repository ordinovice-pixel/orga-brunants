/**
 * faux_gas.js — Simulateur minimal des services Google Apps Script
 * (SpreadsheetApp, DriveApp, PropertiesService, LockService, MailApp…)
 *
 * Sert à DEUX choses :
 *   1. tester le code serveur (.gs) sans Google (Node.js) ;
 *   2. faire tourner l'aperçu local de l'interface dans un navigateur.
 * Les données vivent en mémoire. Ce fichier n'est PAS à copier dans Apps Script.
 */
(function (racine) {
  'use strict';

  var seq = 1;
  function nouvelId(p) { return p + '-' + (seq++).toString(36) + Math.random().toString(36).slice(2, 10); }
  function nonVide(v) { return !(v === '' || v === null || v === undefined); }

  /** Objet qui accepte n'importe quelle méthode et se renvoie lui-même (mises en forme, validations…). */
  function avecRepli(obj) {
    var p = new Proxy(obj, {
      get: function (cible, prop) {
        if (prop in cible) {
          var v = cible[prop];
          return typeof v === 'function' ? v.bind(cible) : v;
        }
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
        return function () { return p; };
      }
    });
    return p;
  }

  function constructeurValidation() {
    var b = avecRepli({ build: function () { return { regle: true }; } });
    return b;
  }

  /* ---------------- Feuilles ---------------- */
  function Feuille(nom) { this.nom = nom; this.d = []; this.maxRows = 1000; this.fmt = {}; }
  Feuille.prototype.getName = function () { return this.nom; };
  Feuille.prototype.setName = function (n) { this.nom = n; return this; };
  Feuille.prototype.getLastRow = function () {
    for (var r = this.d.length - 1; r >= 0; r--) if ((this.d[r] || []).some(nonVide)) return r + 1;
    return 0;
  };
  Feuille.prototype.getLastColumn = function () {
    var m = 0;
    this.d.forEach(function (l) { if (!l) return; for (var c = l.length - 1; c >= 0; c--) if (nonVide(l[c])) { m = Math.max(m, c + 1); break; } });
    return m;
  };
  Feuille.prototype.getMaxRows = function () { return Math.max(this.maxRows, this.d.length); };
  Feuille.prototype.getMaxColumns = function () { return 26; };
  Feuille.prototype.insertRowsAfter = function (apres, n) { this.maxRows += n; return this; };
  Feuille.prototype.getProtections = function () { return []; };
  Feuille.prototype.appendRow = function (v) { this.d[this.getLastRow()] = stockerLigne(this, v, 0); return this; };
  Feuille.prototype.deleteRow = function (r) { this.d.splice(r - 1, 1); return this; };
  Feuille.prototype.deleteRows = function (r, n) { this.d.splice(r - 1, n); return this; };
  Feuille.prototype.getDataRange = function () {
    return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  };
  Feuille.prototype.getRange = function (r, c, nr, nc) {
    if (typeof r !== 'number') throw new Error('faux_gas : notation A1 non gérée');
    if (r < 1 || c < 1) throw new Error('faux_gas : coordonnées invalides ' + r + ',' + c);
    return plage(this, r, c, nr || 1, nc || 1);
  };

  /** Imite les conversions de Google Sheets à l'écriture d'un texte (sauf colonne au format texte « @ »). */
  function stockerValeur(f, col, v) {
    if (typeof v !== 'string' || f.fmt[col] === '@') return v;
    if (/^-?\d+([.,]\d+)?$/.test(v.trim())) return Number(v.trim().replace(',', '.'));
    var m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return v;
  }
  function stockerLigne(f, vals, c0) { return vals.map(function (v, j) { return stockerValeur(f, c0 + j, v); }); }

  function plage(f, r, c, nr, nc) {
    var o = {
      getValues: function () {
        var out = [];
        for (var i = 0; i < nr; i++) {
          var ligne = [];
          for (var j = 0; j < nc; j++) {
            var v = (f.d[r - 1 + i] || [])[c - 1 + j];
            ligne.push(v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v));
          }
          out.push(ligne);
        }
        return out;
      },
      getValue: function () { return o.getValues()[0][0]; },
      setValues: function (vals) {
        if (vals.length !== nr || vals.some(function (l) { return l.length !== nc; })) {
          throw new Error('faux_gas : dimensions incorrectes (' + vals.length + 'x' + (vals[0] || []).length + ' pour ' + nr + 'x' + nc + ')');
        }
        for (var i = 0; i < nr; i++) {
          var li = r - 1 + i;
          f.d[li] = f.d[li] || [];
          for (var j = 0; j < nc; j++) f.d[li][c - 1 + j] = stockerValeur(f, c - 1 + j, vals[i][j]);
        }
        return px;
      },
      setValue: function (v) { return o.setValues([[v]]); },
      clearContent: function () {
        for (var i = 0; i < nr; i++) { var l = f.d[r - 1 + i]; if (l) for (var j = 0; j < nc; j++) l[c - 1 + j] = ''; }
        return px;
      },
      setNumberFormat: function (fmt) { if (r <= 2) for (var j = 0; j < nc; j++) f.fmt[c - 1 + j] = fmt; return px; },
      protect: function () { return avecRepli({}); },
      getRow: function () { return r; },
      getNumRows: function () { return nr; }
    };
    var px = avecRepli(o);
    return px;
  }

  /* ---------------- Drive ---------------- */
  var fichiers = {};
  var dossiers = {};
  var horloge = Date.now();
  function dateCreation() { horloge += 1000; return new Date(horloge); }

  function iterateur(liste) { var i = 0; return { hasNext: function () { return i < liste.length; }, next: function () { return liste[i++]; } }; }

  function Dossier(nom, parentId) { this.id = nouvelId('dossier'); this.nom = nom; this.parentId = parentId; this.corbeille = false; dossiers[this.id] = this; }
  Dossier.prototype.getId = function () { return this.id; };
  Dossier.prototype.getName = function () { return this.nom; };
  Dossier.prototype.isTrashed = function () { return this.corbeille; };
  Dossier.prototype.setTrashed = function (b) { this.corbeille = b; return this; };
  Dossier.prototype.createFolder = function (n) { return new Dossier(n, this.id); };
  Dossier.prototype.getParents = function () { return iterateur(this.parentId ? [dossiers[this.parentId]] : []); };
  Dossier.prototype.getFoldersByName = function (n) {
    var self = this;
    return iterateur(Object.keys(dossiers).map(function (k) { return dossiers[k]; })
      .filter(function (d) { return d.parentId === self.id && d.nom === n && !d.corbeille; }));
  };
  Dossier.prototype.fichiers = function () {
    var self = this;
    return Object.keys(fichiers).map(function (k) { return fichiers[k]; })
      .filter(function (f) { return f.parents.indexOf(self.id) >= 0 && !f.corbeille; });
  };
  Dossier.prototype.getFiles = function () { return iterateur(this.fichiers()); };
  Dossier.prototype.getFilesByName = function (n) { return iterateur(this.fichiers().filter(function (f) { return f.nom === n; })); };
  Dossier.prototype.createFile = function (blob) { return new Fichier(blob.getName(), blob.mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', [this.id], null); };

  function Fichier(nom, mime, parents, classeur) {
    this.id = classeur ? classeur.id : nouvelId('fichier');
    this.nom = nom; this.mime = mime; this.parents = parents.slice(); this.corbeille = false;
    this.cree = dateCreation(); this.classeur = classeur;
    fichiers[this.id] = this;
  }
  Fichier.prototype.getId = function () { return this.id; };
  Fichier.prototype.getLastUpdated = function () { return new Date(this.cree.getTime()); };
  Fichier.prototype.getBlob = function () {
    var self = this;
    return { getDataAsString: function () { return self.contenu || ''; }, getName: function () { return self.nom; } };
  };
  Fichier.prototype.getUrl = function () { return 'https://drive.google.com/file/d/' + this.id + '/view'; };
  Fichier.prototype.getAs = function (mime) {
    var self = this;
    var b = { nom: self.getName(), mime: mime, setName: function (n) { b.nom = n; return b; }, getName: function () { return b.nom; } };
    return b;
  };
  Fichier.prototype.setName = function (n) { this.nom = n; return this; };
  Fichier.prototype.getName = function () { return this.classeur ? this.classeur.nom : this.nom; };
  Fichier.prototype.getMimeType = function () { return this.mime; };
  Fichier.prototype.getDateCreated = function () { return new Date(this.cree.getTime()); };
  Fichier.prototype.isTrashed = function () { return this.corbeille; };
  Fichier.prototype.setTrashed = function (b) {
    if (FauxGAS.refuserSuppression) throw new Error('Accès refusé (simulation : fichier appartenant à un autre compte)');
    this.corbeille = b; return this;
  };
  Fichier.prototype.getParents = function () { return iterateur(this.parents.map(function (id) { return dossiers[id]; })); };
  Fichier.prototype.moveTo = function (d) { this.parents = [d.getId()]; return this; };
  Fichier.prototype.makeCopy = function (nom, dossier) {
    var copie = this.classeur ? this.classeur.cloner(nom) : null;
    return new Fichier(nom, this.mime, [dossier.getId()], copie);
  };

  /* ---------------- Classeurs ---------------- */
  var classeurs = {};
  function Classeur(nom) {
    this.id = nouvelId('classeur'); this.nom = nom; this.tz = 'Europe/Paris';
    this.feuilles = [new Feuille('Feuille 1')];
    classeurs[this.id] = this;
  }
  Classeur.prototype.getId = function () { return this.id; };
  Classeur.prototype.getName = function () { return this.nom; };
  Classeur.prototype.rename = function (n) { this.nom = n; return this; };
  Classeur.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/' + this.id + '/edit'; };
  Classeur.prototype.getSpreadsheetTimeZone = function () { return this.tz; };
  Classeur.prototype.setSpreadsheetTimeZone = function (tz) { this.tz = tz; return this; };
  Classeur.prototype.setSpreadsheetLocale = function () { return this; };
  Classeur.prototype.toast = function () { return this; };
  Classeur.prototype.getSheets = function () { return this.feuilles.map(function (f) { return avecRepli(f); }); };
  Classeur.prototype.getSheetByName = function (n) {
    var f = this.feuilles.filter(function (x) { return x.nom === n; })[0];
    return f ? avecRepli(f) : null;
  };
  Classeur.prototype.insertSheet = function (n, index) {
    if (this.feuilles.some(function (x) { return x.nom === n; })) throw new Error('faux_gas : onglet déjà existant ' + n);
    var f = new Feuille(n);
    if (index === undefined) this.feuilles.push(f); else this.feuilles.splice(index, 0, f);
    return avecRepli(f);
  };
  Classeur.prototype.deleteSheet = function (f) {
    this.feuilles = this.feuilles.filter(function (x) { return x.nom !== f.getName(); });
  };
  Classeur.prototype.cloner = function (nom) {
    var c = new Classeur(nom);
    c.feuilles = this.feuilles.map(function (f) {
      var n = new Feuille(f.nom);
      n.d = f.d.map(function (l) { return (l || []).map(function (v) { return v instanceof Date ? new Date(v.getTime()) : v; }); });
      n.fmt = JSON.parse(JSON.stringify(f.fmt));
      return n;
    });
    return c;
  };
  /** Accès direct aux données brutes d'un onglet (pour simuler une saisie à la main). */
  Classeur.prototype.brut = function (nom) { return this.feuilles.filter(function (x) { return x.nom === nom; })[0]; };

  /* ---------------- Dates ---------------- */
  function formatDate(d, tz, fmt) {
    var s = '';
    for (var i = 0; i < fmt.length;) {
      if (fmt[i] === "'") { var j = fmt.indexOf("'", i + 1); s += fmt.slice(i + 1, j); i = j + 1; continue; }
      var t = fmt.slice(i, i + 4);
      if (t === 'yyyy') { s += d.getFullYear(); i += 4; continue; }
      t = fmt.slice(i, i + 2);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      if (t === 'MM') { s += p(d.getMonth() + 1); i += 2; continue; }
      if (t === 'dd') { s += p(d.getDate()); i += 2; continue; }
      if (t === 'HH') { s += p(d.getHours()); i += 2; continue; }
      if (t === 'mm') { s += p(d.getMinutes()); i += 2; continue; }
      if (t === 'ss') { s += p(d.getSeconds()); i += 2; continue; }
      s += fmt[i]; i++;
    }
    return s;
  }

  /** Utilities.parseCsv : guillemets doublés, séparateur au choix. */
  function parseCsv(texte, sep) {
    sep = sep || ',';
    var lignes = [], ligne = [], champ = '', guil = false;
    for (var i = 0; i < texte.length; i++) {
      var c = texte[i];
      if (guil) {
        if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
        else if (c === '"') guil = false;
        else champ += c;
      } else if (c === '"') guil = true;
      else if (c === sep) { ligne.push(champ); champ = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texte[i + 1] === '\n') i++;
        ligne.push(champ); lignes.push(ligne); ligne = []; champ = '';
      } else champ += c;
    }
    if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
    return lignes;
  }

  /* ---------------- Installation ---------------- */
  var FauxGAS = {
    utilisateur: 'tresoriere.test@exemple.fr',
    quota: 100,
    mails: [],
    declencheurs: [],
    proprietes: {},
    refuserAcces: false,
    refuserSuppression: false,
    racineDrive: null,
    classeurLie: null,
    fichiers: fichiers,
    dossiers: dossiers,
    classeurs: classeurs,
    documents: {},
    fichiersHtml: {},
    /** Dépose un fichier texte (ex. CSV) dans un dossier du faux Drive. */
    deposerFichier: function (nom, texte, dossierId, mime) {
      var f = new Fichier(nom, mime || 'text/csv', [dossierId || FauxGAS.racineDrive.id], null);
      f.contenu = texte;
      return f;
    },

    installer: function (g) {
      FauxGAS.racineDrive = new Dossier('Mon Drive', null);
      var ss = new Classeur('Classeur sans titre');
      new Fichier(ss.nom, 'application/vnd.google-apps.spreadsheet', [FauxGAS.racineDrive.id], ss);
      FauxGAS.classeurLie = ss;

      g.SpreadsheetApp = {
        getActiveSpreadsheet: function () { return avecRepli(FauxGAS.classeurLie); },
        openById: function (id) {
          if (FauxGAS.refuserAcces) throw new Error('You do not have permission to access the requested document.');
          var c = classeurs[id];
          if (!c) throw new Error('Document introuvable ' + id);
          return avecRepli(c);
        },
        flush: function () {},
        newDataValidation: constructeurValidation,
        ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' },
        getUi: function () { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); }
      };
      g.DriveApp = {
        getRootFolder: function () { return FauxGAS.racineDrive; },
        getFolderById: function (id) { if (!dossiers[id]) throw new Error('Dossier introuvable'); return dossiers[id]; },
        getFileById: function (id) { if (!fichiers[id]) throw new Error('Fichier introuvable'); return fichiers[id]; },
        searchFiles: function (q) {
          var m = String(q).match(/title contains '([^']*)'/);
          return iterateur(Object.keys(fichiers).map(function (k) { return fichiers[k]; })
            .filter(function (f) { return !f.corbeille && (!m || f.getName().indexOf(m[1]) >= 0); }));
        }
      };
      g.PropertiesService = {
        getScriptProperties: function () {
          var s = FauxGAS.proprietes;
          return {
            getProperty: function (k) { return s.hasOwnProperty(k) ? s[k] : null; },
            setProperty: function (k, v) { s[k] = String(v); return this; },
            setProperties: function (o) { for (var k in o) s[k] = String(o[k]); return this; },
            getProperties: function () { return JSON.parse(JSON.stringify(s)); },
            deleteProperty: function (k) { delete s[k]; return this; }
          };
        }
      };
      g.LockService = { getScriptLock: function () { return { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {}, hasLock: function () { return true; } }; } };
      g.Session = {
        getActiveUser: function () { return { getEmail: function () { return FauxGAS.utilisateur; } }; },
        getEffectiveUser: function () { return { getEmail: function () { return FauxGAS.utilisateur; } }; },
        getScriptTimeZone: function () { return 'Europe/Paris'; }
      };
      g.Utilities = { formatDate: formatDate, sleep: function () {}, parseCsv: parseCsv };
      g.ScriptApp = {
        getProjectTriggers: function () {
          return FauxGAS.declencheurs.map(function (t) { return { getHandlerFunction: function () { return t.fn; }, _t: t }; });
        },
        deleteTrigger: function (t) { FauxGAS.declencheurs = FauxGAS.declencheurs.filter(function (x) { return x !== t._t; }); },
        newTrigger: function (fn) {
          var regle = { fn: fn };
          var b = avecRepli({ create: function () { FauxGAS.declencheurs.push(regle); return regle; } });
          return b;
        },
        getOAuthToken: function () { return 'jeton-fictif'; },
        getService: function () { return { getUrl: function () { return ''; } }; }
      };
      g.UrlFetchApp = {
        fetch: function () {
          return { getResponseCode: function () { return 200; },
                   getBlob: function () { var b = { nom: '', setName: function (n) { b.nom = n; return b; }, getName: function () { return b.nom; } }; return b; } };
        }
      };
      g.MailApp = {
        getRemainingDailyQuota: function () { return FauxGAS.quota; },
        sendEmail: function (o) { FauxGAS.mails.push(o); FauxGAS.quota -= String(o.to || '').split(',').length + (o.bcc ? o.bcc.split(',').length : 0); }
      };
      g.Logger = { log: function () { if (FauxGAS.bavard) console.log.apply(console, arguments); } };
      g.MimeType = { PDF: 'application/pdf', GOOGLE_DOCS: 'application/vnd.google-apps.document' };
      g.HtmlService = {
        createHtmlOutputFromFile: function (nom) {
          return { getContent: function () { return FauxGAS.fichiersHtml[nom] || 'data:image/png;base64,iVBORw0KGgo='; } };
        }
      };
      g.Utilities.base64Decode = function (b64) {
        if (typeof Buffer !== 'undefined') return Array.prototype.slice.call(Buffer.from(b64, 'base64'));
        var t = atob(b64), o = [];
        for (var i = 0; i < t.length; i++) o.push(t.charCodeAt(i));
        return o;
      };
      g.Utilities.newBlob = function (octets, mime, nom) {
        var b = { octets: octets, mime: mime, nom: nom, setName: function (n) { b.nom = n; return b; }, getName: function () { return b.nom; } };
        return b;
      };
      /* Google Docs simulé : on enregistre paragraphes, images et tableaux pour les vérifier */
      g.DocumentApp = {
        ParagraphHeading: { HEADING1: 'HEADING1', HEADING2: 'HEADING2', NORMAL: 'NORMAL' },
        create: function (nom) {
          var doc = { nom: nom, paragraphes: [], tableaux: [], images: 0, paysage: false, ferme: false };
          var fichier = new Fichier(nom, 'application/vnd.google-apps.document', [FauxGAS.racineDrive.id], null);
          FauxGAS.documents[fichier.id] = doc;
          function texte() { return avecRepli({}); }
          var corps = avecRepli({
            setPageWidth: function (w) { doc.paysage = w > 700; return corps; },
            appendImage: function () { doc.images++; return avecRepli({}); },
            appendParagraph: function (t) {
              var para = { texte: t, titre: null };
              doc.paragraphes.push(para);
              var px = avecRepli({ setHeading: function (h) { para.titre = h; return px; }, editAsText: texte });
              return px;
            },
            appendTable: function (cellules) {
              var copie = cellules.map(function (l) { return l.slice(); });
              doc.tableaux.push(copie);
              var cellule = avecRepli({ editAsText: texte });
              var ligne = avecRepli({ getCell: function () { return cellule; } });
              return avecRepli({ getRow: function () { return ligne; } });
            }
          });
          return avecRepli({
            getBody: function () { return corps; },
            getId: function () { return fichier.id; },
            getUrl: function () { return 'https://docs.google.com/document/d/' + fichier.id + '/edit'; },
            saveAndClose: function () { doc.ferme = true; }
          });
        }
      };
      return FauxGAS;
    }
  };

  racine.FauxGAS = FauxGAS;
  if (typeof module !== 'undefined' && module.exports) module.exports = FauxGAS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
