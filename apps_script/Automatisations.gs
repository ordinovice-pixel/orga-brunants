/**
 * =====================================================================
 *  Automatisations.gs — Sauvegardes, déclencheurs et e-mails
 * =====================================================================
 *  Lot 1 :
 *   - sauvegarde automatique le 1er de chaque mois (copie du classeur + .xlsx)
 *   - bouton « Sauvegarder maintenant »
 *   - envoi d'e-mails avec redirection en mode entraînement + contrôle du quota
 *  Lot 4 :
 *   - activités : enregistrement + notification par mail
 *   - inscription → cases de paiement (échéances)
 *   - « Payé » → recette automatique ; décocher → recette supprimée
 *   - « Rembourser » → dépense automatique
 *   - mobil-home : location → dépense (camping) + recette (part adhérent),
 *     aides plafonnées à 2 × 60 € par titulaire et par an
 *   - fiche d'inscription (Google Doc + PDF)
 *   - réinitialisation des données d'entraînement
 * =====================================================================
 */

var PREFIXE_SAUVEGARDE = 'Sauvegarde_Brunants_';
var TAILLE_LOT_EMAILS = 50;   // destinataires par message (en copie cachée)

/* =====================================================================
 *  SAUVEGARDES
 * ===================================================================== */

/** (Ré)installe le déclencheur mensuel. Appelé par setup(). */
function installerDeclencheurs_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sauvegardeMensuelle') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sauvegardeMensuelle').timeBased().onMonthDay(1).atHour(2).create();
}

/** Lancée automatiquement le 1er de chaque mois, la nuit. */
function sauvegardeMensuelle() {
  avecVerrou_(function () { return effectuerSauvegarde_('Automatique (mensuelle)'); });
}

/** Bouton « Sauvegarder maintenant » de l'interface. */
function sauvegarderMaintenant() {
  var res = avecVerrou_(function () { return effectuerSauvegarde_('Manuelle (outil)'); });
  return reponse_(res.message, res.nom);
}

function dossierSauvegardes_() {
  var props = PropertiesService.getScriptProperties();
  var d = dossierMemorise_(props, 'ID_SAUVEGARDES');
  if (d) return d;
  var racine = dossierMemorise_(props, 'ID_DOSSIER') || sousDossier_(DriveApp.getRootFolder(), NOM_DOSSIER);
  d = sousDossier_(racine, NOM_DOSSIER_SAUVEGARDES);
  props.setProperty('ID_SAUVEGARDES', d.getId());
  return d;
}

/**
 * Copie complète du classeur + export .xlsx dans Outil_Brunants/Sauvegardes/,
 * puis ne garde que les N dernières sauvegardes (paramètre NB_SAUVEGARDES).
 */
function effectuerSauvegarde_(origine) {
  var ss = classeur_();
  var ctx = contexte_(ss);
  var dossier = dossierSauvegardes_();
  SpreadsheetApp.flush();

  var maintenant = new Date();
  var nom = PREFIXE_SAUVEGARDE + Utilities.formatDate(maintenant, ctx.tz, 'yyyy-MM-dd');
  if (dossier.getFilesByName(nom).hasNext()) {   // deuxième sauvegarde le même jour
    nom += '_' + Utilities.formatDate(maintenant, ctx.tz, "HH'h'mm");
    var base = nom;
    for (var n = 2; dossier.getFilesByName(nom).hasNext(); n++) nom = base + '_' + n;   // même minute
  }

  // 1. Copie complète (Google Sheets) — c'est elle qui sert à restaurer
  DriveApp.getFileById(ss.getId()).makeCopy(nom, dossier);

  // 2. Export .xlsx (pour le NAS ou une clé USB)
  var xlsxOk = false;
  var detail = '';
  try {
    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    var rep = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (rep.getResponseCode() === 200) {
      dossier.createFile(rep.getBlob().setName(nom + '.xlsx'));
      xlsxOk = true;
    } else {
      detail = 'réponse ' + rep.getResponseCode();
    }
  } catch (e) {
    detail = e.message;
  }

  // 3. Rotation : on ne garde que les N plus récentes
  var purge = purgerSauvegardes_(dossier, Number(ctx.params.NB_SAUVEGARDES) || 24);

  var resume = origine + ' — copie « ' + nom + ' »' + (xlsxOk ? ' + export .xlsx' : ' (export .xlsx impossible : ' + detail + ')');
  if (purge.supprimees) resume += ' ; ' + purge.supprimees + ' ancienne(s) sauvegarde(s) mise(s) à la corbeille';
  if (purge.echecs) resume += ' ; ' + purge.echecs + ' ancienne(s) sauvegarde(s) non supprimée(s) (droits insuffisants, elle sera supprimée par la sauvegarde mensuelle)';
  journaliser_(ss, 'Sauvegarde', 'Classeur', nom, resume);
  PropertiesService.getScriptProperties().setProperty('DERNIERE_SAUVEGARDE',
    Utilities.formatDate(maintenant, ctx.tz, 'yyyy-MM-dd HH:mm') + '|' + nom + '|' + (xlsxOk ? 'xlsx' : 'sans xlsx'));

  return {
    nom: nom,
    xlsxOk: xlsxOk,
    message: 'Sauvegarde « ' + nom + ' » créée dans Outil_Brunants/Sauvegardes' +
      (xlsxOk ? ' (copie du classeur + fichier .xlsx).' : '. Attention : l\'export .xlsx a échoué (' + detail + ').')
  };
}

/** Met à la corbeille les sauvegardes au-delà des « nb » plus récentes (copie + .xlsx associé). */
function purgerSauvegardes_(dossier, nb) {
  var copies = [];
  var xlsx = {};
  var it = dossier.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var n = f.getName();
    if (n.indexOf(PREFIXE_SAUVEGARDE) !== 0 || f.isTrashed()) continue;
    if (/\.xlsx$/i.test(n)) {
      var base = n.replace(/\.xlsx$/i, '');
      (xlsx[base] = xlsx[base] || []).push(f);
    } else {
      copies.push(f);
    }
  }
  copies.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  var supprimees = 0;
  var echecs = 0;
  copies.slice(nb).forEach(function (f) {
    try {
      (xlsx[f.getName()] || []).forEach(function (x) { x.setTrashed(true); });
      f.setTrashed(true);
      supprimees++;
    } catch (e) {
      echecs++;
    }
  });
  return { supprimees: supprimees, echecs: echecs };
}

/* ---------------------------------------------------------------------
 *  Liste, vérification et restauration des sauvegardes (lot 6)
 * ------------------------------------------------------------------- */

/** Sauvegardes (copies Google Sheets) du dossier Outil_Brunants/Sauvegardes, de la plus récente à la plus ancienne. */
function sauvegardesDisponibles_() {
  var dossier = dossierSauvegardes_();
  var copies = [], xlsx = {};
  var it = dossier.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var n = f.getName();
    if (n.indexOf(PREFIXE_SAUVEGARDE) !== 0 || f.isTrashed()) continue;
    if (/\.xlsx$/i.test(n)) xlsx[n.replace(/\.xlsx$/i, '')] = f;
    else copies.push(f);
  }
  copies.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  return copies.map(function (f) { return { fichier: f, xlsx: xlsx[f.getName()] || null }; });
}

/** Bouton « Afficher les sauvegardes ». */
function listerSauvegardes() {
  var tz = contexte_(classeur_()).tz;
  return {
    sauvegardes: sauvegardesDisponibles_().map(function (s) {
      return {
        id: s.fichier.getId(), nom: s.fichier.getName(), url: s.fichier.getUrl(),
        date: Utilities.formatDate(s.fichier.getDateCreated(), tz, 'yyyy-MM-dd HH:mm'),
        urlXlsx: s.xlsx ? s.xlsx.getUrl() : ''
      };
    })
  };
}

/** Ouvre une sauvegarde, uniquement si elle figure dans le dossier Sauvegardes (jamais un fichier quelconque). */
function ouvrirSauvegarde_(id) {
  var s = sauvegardesDisponibles_().filter(function (x) { return x.fichier.getId() === id; })[0];
  if (!s) throw new Error('Sauvegarde introuvable dans Outil_Brunants/Sauvegardes (supprimée ou déplacée ?). Cliquez sur « Afficher les sauvegardes ».');
  if (id === classeur_().getId()) throw new Error('Sécurité : ce fichier est le classeur de l\'outil lui-même.');
  return { nom: s.fichier.getName(), classeur: SpreadsheetApp.openById(id) };
}

/** Lignes non vides d'un onglet (hors en-têtes) ; null si l'onglet n'existe pas. */
function lignesOnglet_(ss, table) {
  var f = ss.getSheetByName(table);
  if (!f) return null;
  if (f.getLastRow() < 2) return { entetes: f.getLastColumn() ? f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0] : [], lignes: [] };
  var v = f.getDataRange().getValues();
  return { entetes: v[0], lignes: v.slice(1).filter(function (l) { return !l.every(estVide_); }) };
}

/** Bouton « Vérifier » : la sauvegarde s'ouvre-t-elle, et que contient-elle par rapport au classeur actuel ? */
function verifierSauvegarde(id) {
  var s = ouvrirSauvegarde_(id);
  var ss = classeur_();
  var manquants = [], total = 0;
  var tables = TABLES_DONNEES.map(function (t) {
    var b = lignesOnglet_(s.classeur, t), a = lignesOnglet_(ss, t);
    if (!b) manquants.push(t); else total += b.lignes.length;
    return { table: t, sauvegarde: b ? b.lignes.length : null, actuel: a ? a.lignes.length : 0 };
  });
  return {
    tables: tables, manquants: manquants,
    message: manquants.length
      ? 'Sauvegarde incomplète : onglet(s) ' + manquants.join(', ') + ' absent(s). Elle ne peut pas servir à une restauration.'
      : 'Sauvegarde lisible : ' + TABLES_DONNEES.length + ' onglets de données, ' + total + ' ligne(s) au total. Elle peut servir à une restauration.'
  };
}

/**
 * Bouton « Restaurer » : recopie les onglets de données de la sauvegarde dans le classeur de l'outil
 * (même adresse, mêmes droits). Les colonnes sont reprises par leur titre (une sauvegarde d'une version
 * précédente se restaure : les colonnes ajoutées depuis restent vides). Paramètres et journal conservés.
 * Une sauvegarde de l'état actuel est faite juste avant.
 */
function restaurerSauvegarde(id) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    if (estCopieTest_(ss)) throw new Error('Ce classeur est une copie de test : restaurez depuis l\'outil principal.');
    var s = ouvrirSauvegarde_(id);
    // 1. Lecture complète de la sauvegarde AVANT la sauvegarde de sécurité (la rotation pourrait la mettre à la corbeille)
    var source = {}, manquants = [];
    TABLES_DONNEES.forEach(function (t) { source[t] = lignesOnglet_(s.classeur, t); if (!source[t]) manquants.push(t); });
    if (manquants.length) throw new Error('Sauvegarde incomplète (onglet(s) ' + manquants.join(', ') + ' absent(s)) : restauration annulée, rien n\'a été modifié.');
    // 2. Sauvegarde de l'état actuel
    var securite = effectuerSauvegarde_('Avant restauration de « ' + s.nom + ' »');
    // 3. Recopie, colonne par colonne, d'après les titres
    var bilan = [];
    TABLES_DONNEES.forEach(function (t) {
      var f = ss.getSheetByName(t);
      var src = source[t];
      var entetes = f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0];
      var carteDest = carteColonnes_(entetes, SCHEMA[t]), carteSrc = carteColonnes_(src.entetes, SCHEMA[t]);
      var normesSrc = src.entetes.map(normaliserEntete_);
      var depuis = entetes.map(function (h, j) {
        var cle = Object.keys(carteDest).filter(function (k) { return carteDest[k] === j; })[0];
        if (cle) return carteSrc[cle];
        return normesSrc.indexOf(normaliserEntete_(h));   // colonne ajoutée à la main : reprise si même titre
      });
      var lignes = src.lignes.map(function (l) { return depuis.map(function (k) { return k >= 0 && l[k] !== undefined ? l[k] : ''; }); });
      if (f.getLastRow() > 1) f.getRange(2, 1, f.getLastRow() - 1, entetes.length).clearContent();
      if (lignes.length) f.getRange(2, 1, lignes.length, entetes.length).setValues(lignes);
      bilan.push(lignes.length + ' ' + t);
    });
    SpreadsheetApp.flush();
    journaliser_(ss, 'Restauration', 'Classeur', s.nom, 'Données restaurées depuis « ' + s.nom + ' » (' + bilan.join(', ') + ') — sauvegarde préalable « ' + securite.nom + ' »');
    return { message: 'Restauration terminée depuis « ' + s.nom + ' ».\n' + bilan.join(', ') + '.\nL\'état d\'avant est conservé dans « ' + securite.nom + ' ».' };
  });
  return reponse_(res.message);
}

/* =====================================================================
 *  E-MAILS
 * ===================================================================== */

/**
 * Envoie un e-mail en respectant le mode entraînement et le quota quotidien.
 *  - Mode entraînement : UN seul message, envoyé à l'e-mail de test, qui liste
 *    les destinataires réels. Aucun adhérent ne reçoit rien.
 *  - Mode réel : destinataires en copie cachée, par paquets de 50.
 * Renvoie { envoyes, message }.
 */
function envoyerMail_(destinataires, sujet, corpsHtml, ss) {
  ss = ss || classeur_();
  var p = contexte_(ss).params;
  var uniques = [];
  (destinataires || []).forEach(function (d) {
    d = String(d || '').trim();
    if (d && EMAIL_RE_.test(d) && uniques.indexOf(d) < 0) uniques.push(d);
  });
  if (!uniques.length) return { envoyes: 0, message: 'Aucun destinataire avec une adresse e-mail valide.' };

  var quota = MailApp.getRemainingDailyQuota();
  if (p.MODE_ENTRAINEMENT) {
    if (!p.EMAIL_TEST) throw new Error('Mode entraînement : renseignez l\'e-mail de test dans Administration > Paramètres.');
    if (quota < 1) throw new Error('Quota d\'envoi d\'e-mails atteint pour aujourd\'hui. Réessayez demain.');
    var bandeau = '<div style="font-family:Calibri,Arial;font-size:14px;border:2px solid #F39C12;background:#FEF5E7;padding:10px;margin-bottom:14px">' +
      '<strong>MODE ENTRAÎNEMENT</strong> — ce message aurait été envoyé à ' + uniques.length + ' destinataire(s) :<br>' +
      uniques.map(echapperHtml_).join(', ') + '</div>';
    MailApp.sendEmail({ to: p.EMAIL_TEST, subject: '[ENTRAÎNEMENT] ' + sujet, htmlBody: bandeau + corpsHtml, name: 'Les Brunants' });
    journaliser_(ss, 'E-mail', '', '', 'Mode entraînement : « ' + sujet + ' » redirigé vers ' + p.EMAIL_TEST + ' (' + uniques.length + ' destinataire(s) prévus)');
    return { envoyes: 1, message: 'Mode entraînement : le message a été envoyé uniquement à ' + p.EMAIL_TEST + ' (au lieu de ' + uniques.length + ' destinataire(s)).' };
  }

  if (quota < uniques.length) {
    throw new Error('Quota d\'envoi d\'e-mails insuffisant : il reste ' + quota + ' envoi(s) possible(s) aujourd\'hui pour ' +
      uniques.length + ' destinataire(s). Réessayez demain ou réduisez la liste.');
  }
  var expediteur = Session.getEffectiveUser().getEmail();
  for (var i = 0; i < uniques.length; i += TAILLE_LOT_EMAILS) {
    MailApp.sendEmail({ to: expediteur, bcc: uniques.slice(i, i + TAILLE_LOT_EMAILS).join(','),
                        subject: sujet, htmlBody: corpsHtml, name: 'Les Brunants' });
  }
  journaliser_(ss, 'E-mail', '', '', '« ' + sujet + ' » envoyé à ' + uniques.length + ' destinataire(s)');
  return { envoyes: uniques.length, message: 'E-mail envoyé à ' + uniques.length + ' destinataire(s).' };
}

/** Bouton « Envoyer un e-mail de test » (Administration). */
function envoyerMailTest() {
  var ss = classeur_();
  var p = contexte_(ss).params;
  var destinataires = p.MODE_ENTRAINEMENT
    ? ['adherent.fictif.1@exemple.fr', 'adherent.fictif.2@exemple.fr', 'adherent.fictif.3@exemple.fr']
    : [emailUtilisateur_()];
  var res = envoyerMail_(destinataires, 'Test de l\'outil de gestion',
    '<p style="font-family:Calibri,Arial;font-size:15px">Bonjour,<br><br>Ceci est un message de test envoyé depuis ' +
    'l\'outil de gestion des Brunants.<br><br>Le bureau</p>', ss);
  return reponse_(res.message);
}


/* =====================================================================
 *  ACTIVITÉS : enregistrement et notification
 * ===================================================================== */

/** Création ou modification d'une activité depuis la fiche. Notification envoyée à la création si la case est cochée. */
function enregistrerActivite(obj) {
  obj = obj || {};
  var appliquer = obj.appliquerEcheances === true;
  delete obj.appliquerEcheances;
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var r = ecrireEnregistrement_(ss, ctx, 'Activites', obj, 'Saisie');
    if (appliquer && !r.creation) {
      var n = appliquerDatesEcheances_(ss, ctx, r.obj);
      r.message += '\n' + (n ? n + ' échéance(s) non payée(s) des inscrits recalée(s) sur les nouvelles dates.' : 'Aucune échéance non payée à recaler.');
    }
    return r;
  });
  var message = res.message;
  if (res.creation && res.obj.notification) {
    try {
      message += '\n' + notifierActivite_(res.id).message;
    } catch (e) {
      message += '\nNotification non envoyée : ' + e.message;
    }
  }
  return reponse_(message, res.id);
}

/** Bouton « Envoyer la notification » (renvoi manuel). */
function notifierActivite(id) {
  var r = notifierActivite_(id);
  return reponse_(r.message, id);
}

/**
 * Envoie l'annonce d'une activité aux adhérents concernés :
 * adhérents actifs, avec une adresse e-mail, sans « Ne plus rien envoyer ».
 * Si une liste de diffusion est paramétrée, un seul message part vers elle.
 */
function notifierActivite_(id) {
  var ss = classeur_();
  var ctx = contexte_(ss);
  var act = lireEnregistrement_(ss, ctx, 'Activites', id);
  var auj = aujourdhuiIso_(ctx);
  var destinataires = ctx.params.EMAIL_LISTE ? [ctx.params.EMAIL_LISTE] :
    lireTable_(ss, 'Adherents', [], ctx).filter(function (a) {
      return !a.desinscrit && !a.deces && !a.neRienEnvoyer && a.email && (!a.dateFin || a.dateFin >= auj);
    }).map(function (a) { return a.email; });
  var lignes = [
    ['Dates', isoVersFr_(act.dateDebut) + (act.dateFin ? ' au ' + isoVersFr_(act.dateFin) : '')],
    ['Lieu', act.lieu || '—'],
    ['Prix par personne', act.prixParPersonne === '' ? '—' : (Number(act.prixParPersonne) ? act.prixParPersonne + ' €' : 'gratuit')],
    ['Paiement', Number(act.nbEcheances) > 1 ? 'en ' + act.nbEcheances + ' fois' : 'en une fois'],
    ['Nombre de places', act.maxParticipants || '—']
  ];
  var corps = '<div style="font-family:Calibri,Arial;font-size:15px;color:#1C2833">' +
    '<h2 style="color:#1A5276;margin:0 0 8px">' + echapperHtml_(act.nom) + '</h2>' +
    (act.descriptif ? '<p>' + echapperHtml_(act.descriptif) + '</p>' : '') +
    '<table style="border-collapse:collapse">' + lignes.map(function (l) {
      return '<tr><td style="padding:3px 12px 3px 0;color:#5D6D7E">' + l[0] + '</td><td style="padding:3px 0"><b>' + echapperHtml_(String(l[1])) + '</b></td></tr>';
    }).join('') + '</table>' +
    '<p>Pour vous inscrire, contactez l\'organisateur ou un membre du bureau.</p><p>Le bureau des Brunants</p></div>';
  var r = envoyerMail_(destinataires, 'Nouvelle activité : ' + act.nom, corps, ss);
  return { message: 'Notification : ' + r.message };
}

/* =====================================================================
 *  INSCRIPTIONS ET ÉCHÉANCES
 * ===================================================================== */

function ajouterJours_(iso, jours) {
  var d = isoVersDate_(iso);
  d.setDate(d.getDate() + Math.round(jours));
  return Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM-dd');
}

/**
 * Cases de paiement d'une inscription : le montant dû est partagé en N échéances
 * (la dernière absorbe les centimes), réparties entre la date d'inscription et la veille de l'activité.
 */
function planifierEcheances_(inscription, act) {
  var n = Math.max(1, Math.min(12, Number(act.nbEcheances) || 1));
  var total = Math.round(Number(inscription.montantDu || 0) * 100);
  if (total <= 0) return [];
  var base = Math.floor(total / n);
  var debut = inscription.dateInscription;
  var finPlan = act.dateDebut ? ajouterJours_(act.dateDebut, -1) : debut;
  var ecart = finPlan > debut ? (isoVersDate_(finPlan) - isoVersDate_(debut)) / 86400000 : 0;
  var choisies = datesEcheancesActivite_(act);   // dates définies dans la fiche activité (peuvent dépasser la date de l'activité)
  var cases = [];
  for (var k = 0; k < n; k++) {
    cases.push({
      inscriptionId: inscription.id, numero: k + 1,
      montant: (k === n - 1 ? total - base * (n - 1) : base) / 100,
      datePrevue: choisies[k] || (n > 1 ? ajouterJours_(debut, ecart * k / (n - 1)) : debut),
      paye: false, rembourse: false
    });
  }
  return cases;
}

/** Dates d'échéances saisies dans la fiche activité → tableau d'ISO (case vide = échelonnement automatique). */
function datesEcheancesActivite_(act) {
  return String(act.datesEcheances || '').split(/[;,]/).map(function (t) { return texteVersIso_(t.trim()) || ''; });
}

/** Applique les dates de la fiche activité aux échéances NON payées des inscrits actuels. Renvoie le nombre d'échéances modifiées. */
function appliquerDatesEcheances_(ss, ctx, act) {
  var dates = datesEcheancesActivite_(act);
  if (!dates.some(function (d) { return d; })) return 0;
  var inscrits = {};
  lireTable_(ss, 'Inscriptions', [], ctx).forEach(function (i) { if (i.activiteId === act.id && i.statut === 'Inscrit') inscrits[i.id] = true; });
  var feuille = ss.getSheetByName('Echeances');
  var valeurs = feuille.getDataRange().getValues();
  var carte = carteColonnes_(valeurs[0], SCHEMA.Echeances);
  var chDate = SCHEMA.Echeances.champs.filter(function (c) { return c.cle === 'datePrevue'; })[0];
  var n = 0;
  lireTable_(ss, 'Echeances', [], ctx).forEach(function (e) {
    var d = dates[Number(e.numero) - 1];
    if (!inscrits[e.inscriptionId] || e.paye || !d || d === e.datePrevue) return;
    feuille.getRange(e._ligne, carte.datePrevue + 1).setValue(versCellule_(d, chDate));
    n++;
  });
  if (n) journaliser_(ss, 'Automatisation', 'Echeances', act.id, n + ' échéance(s) non payée(s) recalée(s) sur les dates de la fiche « ' + act.nom + ' »');
  return n;
}

/** Modifier la date prévue d'une échéance non payée (paiements possibles après la date de l'activité). */
function modifierEcheance(echeanceId, datePrevue) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var c = contexteEcheance_(ss, ctx, echeanceId);
    if (c.e.paye) throw new Error('Cette échéance est déjà payée : sa date prévue ne se modifie plus.');
    var d = texteVersIso_(datePrevue || '');
    if (!d) throw new Error('Date prévue invalide.');
    c.e.datePrevue = d;
    ecrireEnregistrement_(ss, ctx, 'Echeances', c.e, 'Date prévue modifiée', 'Modification');
    return { id: c.e.id, message: 'Échéance ' + c.e.numero + ' (' + nomComplet_(c.adh) + ') : date prévue le ' + isoVersFr_(d) + '.' };
  });
  return reponse_(res.message, res.id);
}

/** Inscrire un adhérent à une activité : crée l'inscription et autant de cases de paiement que d'échéances. */
function inscrireActivite(activiteId, adherentId, montantDu) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var act = lireEnregistrement_(ss, ctx, 'Activites', activiteId);
    var adh = lireEnregistrement_(ss, ctx, 'Adherents', adherentId);
    if (act.statut === 'Annulé') throw new Error('L\'activité « ' + act.nom + ' » est annulée : inscription impossible.');
    if (adh.desinscrit || adh.deces) throw new Error(adh.nom + ' ' + adh.prenom + ' n\'est plus adhérent (fiche archivée) : réinscrivez-le d\'abord dans la rubrique Adhérents.');
    var inscriptions = lireTable_(ss, 'Inscriptions', [], ctx).filter(function (i) { return i.activiteId === act.id && i.statut === 'Inscrit'; });
    if (inscriptions.some(function (i) { return i.adherentId === adh.id; })) throw new Error(adh.nom + ' ' + adh.prenom + ' est déjà inscrit(e) à « ' + act.nom + ' ».');
    if (act.maxParticipants && inscriptions.length >= Number(act.maxParticipants)) {
      throw new Error('Activité complète : ' + inscriptions.length + ' inscrit(s) pour ' + act.maxParticipants + ' place(s) au maximum.');
    }
    var du = (montantDu === '' || montantDu === null || montantDu === undefined) ? Number(act.prixParPersonne || 0) : texteVersNombre_(String(montantDu));
    if (isNaN(du) || du < 0) throw new Error('Montant dû invalide.');
    var ins = ecrireEnregistrement_(ss, ctx, 'Inscriptions', {
      activiteId: act.id, adherentId: adh.id, dateInscription: aujourdhuiIso_(ctx), statut: 'Inscrit', montantDu: du
    }, 'Inscription à ' + act.nom, 'Création').obj;
    var cases = ajouterEnBloc_(ss, ctx, 'Echeances', planifierEcheances_(ins, act),
      planifierEcheances_(ins, act).length + ' case(s) de paiement créée(s) pour ' + ins.id + ' (' + nomComplet_(adh) + ' — ' + act.nom + ')');
    return { id: ins.id, message: nomComplet_(adh) + ' inscrit(e) à « ' + act.nom + ' » (' + ins.id + ') : ' +
      (cases.length ? cases.length + ' case(s) de paiement créée(s).' : 'activité gratuite, aucun paiement.') };
  });
  return reponse_(res.message, res.id);
}

/** Désinscrire d'une activité : les échéances non payées sont supprimées, les échéances payées restent (à rembourser). */
function desinscrireActivite(inscriptionId) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var ins = lireEnregistrement_(ss, ctx, 'Inscriptions', inscriptionId);
    if (ins.statut === 'Désinscrit') throw new Error('Cette inscription est déjà annulée.');
    var cases = lireTable_(ss, 'Echeances', [], ctx).filter(function (e) { return e.inscriptionId === ins.id; });
    var aSupprimer = cases.filter(function (e) { return !e.paye; }).map(function (e) { return e.id; });
    var payees = cases.filter(function (e) { return e.paye && !e.rembourse; });
    ins.statut = 'Désinscrit';
    ecrireEnregistrement_(ss, ctx, 'Inscriptions', ins, 'Désinscription de l\'activité', 'Modification');
    supprimerParIds_(ss, 'Echeances', aSupprimer);
    if (aSupprimer.length) journaliser_(ss, 'Automatisation', 'Echeances', aSupprimer.join(', '), aSupprimer.length + ' échéance(s) non payée(s) supprimée(s) (désinscription ' + ins.id + ')');
    var adh = lireTable_(ss, 'Adherents', [], ctx).filter(function (a) { return a.id === ins.adherentId; })[0] || {};
    return { id: ins.id, message: nomComplet_(adh) + ' désinscrit(e) de l\'activité (' + ins.id + ').' +
      (aSupprimer.length ? ' ' + aSupprimer.length + ' échéance(s) non payée(s) supprimée(s).' : '') +
      (payees.length ? ' ' + payees.length + ' échéance(s) déjà payée(s) : utilisez « Rembourser » si nécessaire.' : '') };
  });
  return reponse_(res.message, res.id);
}

/** Contexte d'une échéance : échéance, inscription, activité, adhérent, nombre d'échéances. */
function contexteEcheance_(ss, ctx, echeanceId) {
  var e = lireEnregistrement_(ss, ctx, 'Echeances', echeanceId);
  var ins = lireEnregistrement_(ss, ctx, 'Inscriptions', e.inscriptionId);
  var act = lireEnregistrement_(ss, ctx, 'Activites', ins.activiteId);
  var adh = lireEnregistrement_(ss, ctx, 'Adherents', ins.adherentId);
  var n = lireTable_(ss, 'Echeances', [], ctx).filter(function (x) { return x.inscriptionId === ins.id; }).length;
  return { e: e, ins: ins, act: act, adh: adh, libelle: 'échéance ' + e.numero + '/' + Math.max(n, e.numero) + ' — ' + act.nom + ' — ' + nomComplet_(adh) };
}

/** Cocher « Payé » : crée automatiquement la recette (une seule, jamais deux). */
function payerEcheance(echeanceId, datePaiement, modePaiement) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var c = contexteEcheance_(ss, ctx, echeanceId);
    if (c.e.paye || c.e.recetteId) throw new Error('Cette échéance est déjà payée (recette ' + (c.e.recetteId || '—') + ') : aucune double saisie.');
    var date = texteVersIso_(datePaiement || '') || aujourdhuiIso_(ctx);
    if (date > aujourdhuiIso_(ctx)) throw new Error('La date de paiement ne peut pas être dans le futur.');
    var cats = lireTable_(ss, 'Categories', [], ctx);
    var rec = ecrireEnregistrement_(ss, ctx, 'Recettes', {
      date: date, libelle: 'Paiement ' + c.libelle, montant: c.e.montant, categorie: c.act.categorie,
      sousCategorie: sousCategoriePour_(cats, 'Recettes', c.act.categorie, c.act.sousCategorie),
      activiteId: c.act.id, adherentId: c.adh.id, budgete: 'Budgété', origine: 'Automatique', echeanceId: c.e.id,
      modePaiement: LISTES.MODE_PAIEMENT.indexOf(modePaiement) >= 0 ? modePaiement : ''
    }, 'Paiement ' + c.e.id, 'Automatisation');
    c.e.paye = true; c.e.datePaiement = date; c.e.recetteId = rec.id;
    ecrireEnregistrement_(ss, ctx, 'Echeances', c.e, 'Payé', 'Modification');
    return { id: rec.id, message: 'Recette ' + rec.id + ' créée automatiquement : ' + c.e.montant + ' € (' + c.libelle + ').' };
  });
  return reponse_(res.message, res.id);
}

/** Décocher « Payé » : la recette générée est supprimée (impossible si l'échéance a été remboursée). */
function annulerPaiement(echeanceId) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var c = contexteEcheance_(ss, ctx, echeanceId);
    if (!c.e.paye) throw new Error('Cette échéance n\'est pas payée.');
    if (c.e.rembourse) throw new Error('Cette échéance a été remboursée : annulez d\'abord le remboursement.');
    var n = c.e.recetteId ? supprimerParIds_(ss, 'Recettes', [c.e.recetteId]) : 0;
    if (n) journaliser_(ss, 'Automatisation', 'Recettes', c.e.recetteId, 'Recette supprimée (paiement annulé : ' + c.libelle + ')');
    var ancienne = c.e.recetteId;
    c.e.paye = false; c.e.datePaiement = ''; c.e.recetteId = '';
    ecrireEnregistrement_(ss, ctx, 'Echeances', c.e, 'Paiement annulé', 'Modification');
    return { id: c.e.id, message: 'Paiement annulé : recette ' + (ancienne || '—') + ' supprimée.' };
  });
  return reponse_(res.message, res.id);
}

/**
 * « Rembourser » une échéance payée : le remboursement est DÉDUIT DES RECETTES
 * (décision du bureau, 19/10/2026) : une recette négative, origine « Remboursement »,
 * liée à l'échéance. La recette du paiement reste visible ; le net des deux vaut 0.
 */
function rembourserEcheance(echeanceId, date) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var c = contexteEcheance_(ss, ctx, echeanceId);
    if (!c.e.paye) throw new Error('Seule une échéance payée peut être remboursée.');
    if (c.e.rembourse || c.e.remboursementId || c.e.depenseId) throw new Error('Cette échéance est déjà remboursée (' + (c.e.remboursementId || c.e.depenseId || '—') + ').');
    var d = texteVersIso_(date || '') || aujourdhuiIso_(ctx);
    if (d > aujourdhuiIso_(ctx)) throw new Error('La date du remboursement ne peut pas être dans le futur.');
    var cats = lireTable_(ss, 'Categories', [], ctx);
    var rec = ecrireEnregistrement_(ss, ctx, 'Recettes', {
      date: d, libelle: 'Remboursement ' + c.libelle, montant: -Math.abs(Number(c.e.montant)), categorie: c.act.categorie,
      sousCategorie: sousCategoriePour_(cats, 'Recettes', c.act.categorie, c.act.sousCategorie),
      activiteId: c.act.id, adherentId: c.adh.id, budgete: 'Budgété', origine: 'Remboursement', echeanceId: c.e.id
    }, 'Remboursement ' + c.e.id, 'Automatisation');
    c.e.rembourse = true; c.e.remboursementId = rec.id;
    ecrireEnregistrement_(ss, ctx, 'Echeances', c.e, 'Remboursé', 'Modification');
    return { id: rec.id, message: 'Remboursement de ' + c.e.montant + ' € déduit des recettes : recette négative ' + rec.id + ' (' + c.libelle + ').' };
  });
  return reponse_(res.message, res.id);
}

/** Annuler un remboursement saisi par erreur : la recette négative (ou l'ancienne dépense) est supprimée. */
function annulerRemboursement(echeanceId) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var c = contexteEcheance_(ss, ctx, echeanceId);
    if (!c.e.rembourse) throw new Error('Cette échéance n\'a pas été remboursée.');
    var supprime = '';
    if (c.e.remboursementId) {
      supprimerParIds_(ss, 'Recettes', [c.e.remboursementId]);
      journaliser_(ss, 'Automatisation', 'Recettes', c.e.remboursementId, 'Recette de remboursement supprimée (remboursement annulé : ' + c.libelle + ')');
      supprime = 'recette ' + c.e.remboursementId;
    }
    if (c.e.depenseId) {   // remboursement enregistré avant le lot 5 (dépense)
      supprimerParIds_(ss, 'Depenses', [c.e.depenseId]);
      journaliser_(ss, 'Automatisation', 'Depenses', c.e.depenseId, 'Dépense supprimée (remboursement annulé : ' + c.libelle + ')');
      supprime = 'dépense ' + c.e.depenseId;
    }
    c.e.rembourse = false; c.e.depenseId = ''; c.e.remboursementId = '';
    ecrireEnregistrement_(ss, ctx, 'Echeances', c.e, 'Remboursement annulé', 'Modification');
    return { id: c.e.id, message: 'Remboursement annulé' + (supprime ? ' : ' + supprime + ' supprimée.' : '.') };
  });
  return reponse_(res.message, res.id);
}

/* =====================================================================
 *  MOBIL-HOME : locations, aides plafonnées, recettes et dépenses automatiques
 * ===================================================================== */

/**
 * Attribue les aides d'un adhérent pour une année : seuls les titulaires y ont droit,
 * dans la limite de NB_AIDES_MOBILHOME aides de AIDE_MOBILHOME € (les premières semaines de l'année).
 * Met à jour les locations et les recettes « part adhérent » qui changent.
 */
function recalculerAides_(ss, ctx, adherentId, annee) {
  var adh = lireTable_(ss, 'Adherents', [], ctx).filter(function (a) { return a.id === adherentId; })[0];
  var titulaire = adh && adh.type === 'Titulaire';
  var plafond = Number(ctx.params.NB_AIDES_MOBILHOME) || 0;
  var montantAide = Number(ctx.params.AIDE_MOBILHOME) || 0;
  var locations = lireTable_(ss, 'MobilHome', [], ctx).filter(function (m) { return m.adherentId === adherentId && Number(m.annee) === Number(annee); })
    .sort(function (a, b) { return String(a.semaine).localeCompare(String(b.semaine)) || a.id.localeCompare(b.id); });
  var recettes = null;
  locations.forEach(function (m, k) {
    var aide = titulaire && k < plafond ? Math.min(montantAide, Number(m.coutLocation || 0)) : 0;
    var paye = Math.round((Number(m.coutLocation || 0) - aide) * 100) / 100;
    if (Number(m.aideAsso || 0) === aide && Number(m.montantPayeAdherent || 0) === paye) return;
    m.aideAsso = aide; m.montantPayeAdherent = paye;
    delete m._ligne;
    if (m.recetteId) {
      recettes = recettes || lireTable_(ss, 'Recettes', [], ctx);
      var r = recettes.filter(function (x) { return x.id === m.recetteId; })[0];
      if (r && paye > 0) { r.montant = paye; delete r._ligne; ecrireEnregistrement_(ss, ctx, 'Recettes', r, 'Aide mobil-home recalculée', 'Automatisation'); }
      else if (r && paye <= 0) { supprimerParIds_(ss, 'Recettes', [r.id]); m.recetteId = ''; }
    }
    ecrireEnregistrement_(ss, ctx, 'MobilHome', m, 'Aide recalculée (' + aide + ' €)', 'Automatisation');
  });
}

/**
 * Enregistre une location (création ou modification) :
 *  - année = année de la semaine ; aide calculée automatiquement (titulaires, 2 × 60 € par an au plus) ;
 *  - dépense automatique « location payée au camping » et recette automatique « part de l'adhérent ».
 */
function enregistrerLocation(obj) {
  obj = obj || {};
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var semaine = texteVersIso_(obj.semaine || '');
    if (!semaine) throw new Error('« Semaine (date de début) » est obligatoire.');
    if (!obj.campingId) throw new Error('Choisissez le camping.');
    var cout = typeof obj.coutLocation === 'number' ? obj.coutLocation : texteVersNombre_(String(obj.coutLocation || ''));
    if (isNaN(cout) || cout <= 0) throw new Error('« Coût de la location » doit être un montant supérieur à 0.');
    var adh = lireEnregistrement_(ss, ctx, 'Adherents', String(obj.adherentId || ''));
    var camping = lireEnregistrement_(ss, ctx, 'Prestataires', String(obj.campingId));
    var fin = adh.dateFin || (adh.deces ? adh.dateDeces : '');
    if (adh.dateInscription > semaine || (fin && fin < semaine)) throw new Error(nomComplet_(adh) + ' n\'est pas adhérent(e) à la date de cette semaine.');
    var ancien = obj.id ? lireEnregistrement_(ss, ctx, 'MobilHome', obj.id) : null;
    var annee = Number(semaine.slice(0, 4));
    var loc = {
      id: obj.id || '', adherentId: adh.id, annee: annee, semaine: semaine, coutLocation: cout, campingId: camping.id,
      aideAsso: ancien ? ancien.aideAsso : 0, montantPayeAdherent: ancien ? ancien.montantPayeAdherent : cout,
      depenseId: ancien ? ancien.depenseId : '', recetteId: ancien ? ancien.recetteId : ''
    };
    var ecrit = ecrireEnregistrement_(ss, ctx, 'MobilHome', loc, ancien ? 'Modification de location' : 'Nouvelle location', ancien ? 'Modification' : 'Création');
    loc.id = ecrit.id;
    // aides de l'adhérent (et de l'ancien adhérent / ancienne année si la location a changé)
    recalculerAides_(ss, ctx, adh.id, annee);
    if (ancien && (ancien.adherentId !== adh.id || Number(ancien.annee) !== annee)) recalculerAides_(ss, ctx, ancien.adherentId, ancien.annee);
    loc = lireEnregistrement_(ss, ctx, 'MobilHome', loc.id);
    var cats = lireTable_(ss, 'Categories', [], ctx);
    var libelle = 'semaine du ' + isoVersFr_(semaine) + ' — ' + camping.raisonSociale + ' — ' + nomComplet_(adh);
    var auj = aujourdhuiIso_(ctx);
    // date des lignes comptables : celle saisie, sinon celle déjà enregistrée, sinon le jour de la saisie
    var dateLignes = texteVersIso_(String(obj.dateLignes || '')) || '';
    if (dateLignes && dateLignes > auj) throw new Error('La date de paiement ne peut pas être dans le futur.');
    // dépense : location payée au camping
    var depExist = loc.depenseId ? lireTable_(ss, 'Depenses', [], ctx).filter(function (d) { return d.id === loc.depenseId; })[0] : null;
    var dep = ecrireEnregistrement_(ss, ctx, 'Depenses', {
      id: depExist ? depExist.id : '', date: dateLignes || (depExist ? depExist.date : auj), libelle: 'Location mobil-home ' + libelle, montant: cout,
      categorie: CAT_MOBILHOME, sousCategorie: sousCategoriePour_(cats, 'Depenses', CAT_MOBILHOME, SOUSCAT_MOBILHOME),
      prestataireId: camping.id, budgete: 'Budgété', origine: 'Automatique', sourceId: loc.id
    }, 'Mobil-home ' + loc.id, 'Automatisation');
    // recette : part payée par l'adhérent
    var recExist = loc.recetteId ? lireTable_(ss, 'Recettes', [], ctx).filter(function (r) { return r.id === loc.recetteId; })[0] : null;
    var recId = '';
    if (Number(loc.montantPayeAdherent) > 0) {
      recId = ecrireEnregistrement_(ss, ctx, 'Recettes', {
        id: recExist ? recExist.id : '', date: dateLignes || (recExist ? recExist.date : auj), libelle: 'Mobil-home ' + libelle + ' (part adhérent)',
        montant: loc.montantPayeAdherent, categorie: CAT_MOBILHOME, sousCategorie: sousCategoriePour_(cats, 'Recettes', CAT_MOBILHOME, SOUSCAT_MOBILHOME),
        adherentId: adh.id, budgete: 'Budgété', origine: 'Automatique', echeanceId: loc.id
      }, 'Mobil-home ' + loc.id, 'Automatisation').id;
    } else if (recExist) {
      supprimerParIds_(ss, 'Recettes', [recExist.id]);
    }
    loc.depenseId = dep.id; loc.recetteId = recId;
    delete loc._ligne;
    ecrireEnregistrement_(ss, ctx, 'MobilHome', loc, 'Liens recette / dépense', 'Automatisation');
    var aide = Number(loc.aideAsso);
    var raison = aide > 0 ? 'aide de ' + aide + ' €' :
      (adh.type !== 'Titulaire' ? 'pas d\'aide (réservée aux titulaires)' : 'pas d\'aide (plafond de ' + ctx.params.NB_AIDES_MOBILHOME + ' aides atteint en ' + annee + ')');
    return { id: loc.id, message: 'Location ' + loc.id + (ancien ? ' modifiée' : ' enregistrée') + ' (' + raison + ') : dépense ' + dep.id +
      (recId ? ' et recette ' + recId : '') + ' créées automatiquement.' };
  });
  return reponse_(res.message, res.id);
}

/** Supprime une location et ses recette / dépense automatiques ; les aides de l'adhérent sont recalculées. */
function supprimerLocation(id) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var loc = lireEnregistrement_(ss, ctx, 'MobilHome', id);
    if (loc.recetteId) supprimerParIds_(ss, 'Recettes', [loc.recetteId]);
    if (loc.depenseId) supprimerParIds_(ss, 'Depenses', [loc.depenseId]);
    supprimerParIds_(ss, 'MobilHome', [loc.id]);
    journaliser_(ss, 'Suppression', 'MobilHome', loc.id, 'Location supprimée avec ' + [loc.recetteId, loc.depenseId].filter(Boolean).join(' et '));
    recalculerAides_(ss, ctx, loc.adherentId, loc.annee);
    return { id: loc.id, message: 'Location ' + loc.id + ' supprimée, ainsi que ' + ([loc.recetteId, loc.depenseId].filter(Boolean).join(' et ') || 'aucune ligne comptable') + '.' };
  });
  return reponse_(res.message, res.id);
}

/* =====================================================================
 *  FICHE D'INSCRIPTION (Google Doc + PDF dans Outil_Brunants/Fiches_inscription)
 * ===================================================================== */

function dossierFiches_() {
  var props = PropertiesService.getScriptProperties();
  var d = dossierMemorise_(props, 'ID_FICHES');
  if (d) return d;
  var racine = dossierMemorise_(props, 'ID_DOSSIER') || sousDossier_(DriveApp.getRootFolder(), NOM_DOSSIER);
  d = sousDossier_(racine, NOM_DOSSIER_FICHES);
  props.setProperty('ID_FICHES', d.getId());
  return d;
}

function genererFicheInscription(activiteId) {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var act = lireEnregistrement_(ss, ctx, 'Activites', activiteId);
    var adherents = {};
    lireTable_(ss, 'Adherents', [], ctx).forEach(function (a) { adherents[a.id] = a; });
    var inscriptions = lireTable_(ss, 'Inscriptions', [], ctx).filter(function (i) { return i.activiteId === act.id && i.statut === 'Inscrit'; })
      .sort(function (a, b) { var x = adherents[a.adherentId] || {}, y = adherents[b.adherentId] || {}; return nomComplet_(x).localeCompare(nomComplet_(y)); });
    var echeances = lireTable_(ss, 'Echeances', [], ctx);
    var n = Math.max(1, Number(act.nbEcheances) || 1);
    var org = act.organisateur ? adherents[act.organisateur] : null;
    var nom = 'Fiche_inscription_' + act.id + '_' + act.nom.replace(/[\\\/:*?"<>|]+/g, ' ').trim();

    var doc = DocumentApp.create(nom);
    var body = doc.getBody();
    body.setPageWidth(842).setPageHeight(595);   // A4 paysage : le tableau des paiements est large
    body.setMarginTop(36).setMarginBottom(36).setMarginLeft(36).setMarginRight(36);
    try {
      var uri = HtmlService.createHtmlOutputFromFile('Logo').getContent();
      var blob = Utilities.newBlob(Utilities.base64Decode(uri.split(',')[1]), 'image/png', 'logo.png');
      body.appendImage(blob).setWidth(70).setHeight(70);
    } catch (e) { /* le logo est facultatif */ }
    body.appendParagraph(act.nom).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    var prix = Number(act.prixParPersonne || 0), part = Number(act.participationEuro || 0);
    var infos = [
      ['Descriptif', act.descriptif || '—'],
      ['Date(s)', isoVersFr_(act.dateDebut) + (act.dateFin ? ' au ' + isoVersFr_(act.dateFin) : '')],
      ['Lieu', act.lieu || '—'],
      ['Organisateur', org ? nomComplet_(org) + (org.mobile || org.telFixe ? ' — ' + (org.mobile || org.telFixe) : '') : '—'],
      ['Nombre maximum de participants', String(act.maxParticipants || '—')],
      ['Budget prévu', act.budgetPrevu === '' ? '—' : act.budgetPrevu + ' €'],
      ['Participation demandée par personne', prix ? prix + ' €' + (n > 1 ? ' (en ' + n + ' fois)' : '') : 'gratuit'],
      ['Somme subventionnée par l\'association par personne', part + ' €']
    ];
    var tInfos = body.appendTable(infos);
    tInfos.setBorderWidth(0);
    for (var r = 0; r < infos.length; r++) tInfos.getRow(r).getCell(0).editAsText().setBold(true);
    body.appendParagraph('');

    var entetes = ['N°', 'Nom', 'Prénom', 'E-mail', 'Téléphone'];
    for (var k = 1; k <= n; k++) entetes.push(n > 1 ? 'Payé ' + k : 'Payé', n > 1 ? 'Date ' + k : 'Date de paiement');
    var lignes = [entetes];
    var nbLignes = Math.max(Number(act.maxParticipants) || 0, inscriptions.length);
    for (var i = 0; i < nbLignes; i++) {
      var ins = inscriptions[i];
      var a = ins ? adherents[ins.adherentId] || {} : null;
      var l = [String(i + 1), a ? a.nom : '', a ? a.prenom : '', a ? a.email || '' : '', a ? a.mobile || a.telFixe || '' : ''];
      for (var j = 1; j <= n; j++) {
        var e = ins ? echeances.filter(function (x) { return x.inscriptionId === ins.id && Number(x.numero) === j; })[0] : null;
        l.push(e && e.paye ? '☑' : '☐', e && e.paye ? isoVersFr_(e.datePaiement) : '');
      }
      lignes.push(l);
    }
    var t = body.appendTable(lignes);
    var entete = t.getRow(0);
    for (var c = 0; c < entetes.length; c++) {
      entete.getCell(c).setBackgroundColor('#1A5276').editAsText().setBold(true).setForegroundColor('#FFFFFF');
    }
    body.appendParagraph('Fiche générée le ' + isoVersFr_(aujourdhuiIso_(ctx)) + ' — ' + inscriptions.length + ' inscrit(s) à cette date. ☑ = payé.')
      .editAsText().setItalic(true).setFontSize(9);
    var idDoc = doc.getId(), urlDoc = doc.getUrl();   // lus avant la fermeture du document
    doc.saveAndClose();

    var dossier = dossierFiches_();
    var fichier = DriveApp.getFileById(idDoc);
    fichier.moveTo(dossier);
    var pdf = dossier.createFile(fichier.getAs(MimeType.PDF)).setName(nom + '.pdf');
    journaliser_(ss, 'Automatisation', 'Activites', act.id, 'Fiche d\'inscription générée (' + inscriptions.length + ' inscrit(s), ' + nbLignes + ' ligne(s))');
    return { id: act.id, urlDoc: urlDoc, urlPdf: pdf.getUrl(),
             message: 'Fiche d\'inscription « ' + act.nom + ' » générée dans Outil_Brunants/Fiches_inscription (Google Doc + PDF).' };
  });
  return reponse_(res.message, res.id, { urlDoc: res.urlDoc, urlPdf: res.urlPdf });
}

/* =====================================================================
 *  RÉINITIALISATION DES DONNÉES D'ENTRAÎNEMENT
 * ===================================================================== */

/**
 * Vide toutes les tables de données et recharge le jeu fictif.
 * Uniquement en mode entraînement ; une sauvegarde est faite juste avant.
 * Les paramètres et le journal sont conservés.
 */
function reinitialiserDonnees() {
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    if (!ctx.params.MODE_ENTRAINEMENT) throw new Error('La réinitialisation n\'est possible qu\'en mode entraînement (Administration > Paramètres).');
    var sauvegarde = effectuerSauvegarde_('Avant réinitialisation');
    var reels = adherentsReels_(ss, ctx);
    TABLES_DONNEES.forEach(function (t) {
      if (reels && t === 'Adherents') return;   // les vrais adhérents (et leurs fiches complétées) ne sont jamais effacés
      var f = ss.getSheetByName(t);
      if (f && f.getLastRow() > 1) f.getRange(2, 1, f.getLastRow() - 1, Math.max(f.getLastColumn(), 1)).clearContent();
    });
    var rapport = [];
    chargerDonneesDeDepart_(ss, ctx, rapport);
    journaliser_(ss, 'Réinitialisation', 'Classeur', '', 'Données d\'entraînement rechargées (' + rapport.length + ' opération(s)) — sauvegarde préalable « ' + sauvegarde.nom + ' »');
    return { message: 'Données d\'entraînement réinitialisées. Une sauvegarde a été faite juste avant (« ' + sauvegarde.nom + ' »).' +
      (reels ? '\nVos ' + reels.nb + ' adhérents réels ont été conservés tels quels.' : '') };
  });
  return reponse_(res.message);
}
