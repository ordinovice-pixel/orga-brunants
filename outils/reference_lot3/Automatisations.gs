/**
 * =====================================================================
 *  Automatisations.gs — Sauvegardes, déclencheurs et e-mails
 * =====================================================================
 *  Lot 1 :
 *   - sauvegarde automatique le 1er de chaque mois (copie du classeur + .xlsx)
 *   - bouton « Sauvegarder maintenant »
 *   - envoi d'e-mails avec redirection en mode entraînement + contrôle du quota
 *  Lot 4 : paiement → recette, remboursement → dépense, notifications d'activité.
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
  var purge = purgerSauvegardes_(dossier, Number(ctx.params.NB_SAUVEGARDES) || 12);

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
