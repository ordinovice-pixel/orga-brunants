/**
 * =====================================================================
 *  Donnees.gs — Modèle de données et accès aux feuilles Google Sheets
 * =====================================================================
 *  Outil de gestion « Les Brunants » — version opérationnelle d'entraînement
 *
 *  Ce fichier décrit TOUTES les tables (un onglet par table) et contient
 *  les fonctions qui lisent et écrivent dans le classeur Brunants_Donnees.
 *
 *  Principes :
 *   - Les colonnes sont retrouvées par leur TITRE (ligne 1), pas par leur
 *     position : on peut déplacer une colonne à la main sans rien casser.
 *   - Une ligne illisible saisie à la main est ignorée, avec un avertissement
 *     affiché dans l'outil (l'outil ne plante jamais à cause d'une ligne).
 *   - Les liens entre tables se font toujours par ID (ADH-0001, ACT-2026-001…).
 *   - Aucune formule n'est nécessaire dans les feuilles : l'application calcule.
 *   - Toute écriture passe par un verrou (LockService) pour éviter les conflits
 *     entre deux membres du bureau qui enregistrent en même temps.
 * =====================================================================
 */

var VERSION_OUTIL = 'Lot 3 — budget et prestataires (octobre 2026)';

/* ---------------------------------------------------------------------
 * Listes de valeurs autorisées (listes déroulantes)
 * ------------------------------------------------------------------- */
var LISTES = {
  CIVILITE: ['M.', 'Mme'],
  SEXE: ['H', 'F'],
  TYPE_ADH: ['Titulaire', 'Sympathisant'],
  REGION: ['Île-de-France', 'Province'],
  MOTIF_FIN: ['Déménagement', 'Non renouvellement', 'Décès', 'Santé', 'Autre'],
  STATUT_ACT: ['En préparation', 'Ouvert aux inscriptions', 'Complet', 'Terminé', 'Annulé'],
  STATUT_INS: ['Inscrit', 'Désinscrit'],
  BUDGETE: ['Budgété', 'Hors budget'],
  ORIGINE_REC: ['Saisie manuelle', 'Automatique'],
  ORIGINE_DEP: ['Saisie manuelle', 'Automatique', 'Remboursement'],
  TYPE_CAT: ['Recette', 'Dépense', 'Les deux'],
  DOMAINE_PRE: ['Transport', 'Restauration / traiteur', 'Hébergement / mobil-home', 'Animation / intervenant',
                'Fournitures / matériel', 'Assurance', 'Impression / communication', 'Autre']
};

/** Les 8 catégories budgétaires validées par le bureau. */
var CATEGORIES_BUDGET = ['Villégiatures', 'Grands Événements', 'Sorties / Visites', 'Activités / Animations',
                         'Gestion / Communication', 'Formation / Numérique', 'Social', 'Divers'];

/** ID permanent de l'entrée « Autre » des prestataires (ne peut pas être supprimée). */
var ID_PRESTATAIRE_AUTRE = 'PRE-000';

/**
 * Raccourci pour décrire un champ.
 *  type : id | texte | date | montant | nombre | oui_non | liste | email | cp | tel | ref | categorie | calcule
 *  options : requis (obligatoire à la saisie), lecture (indispensable : sinon la ligne est ignorée),
 *            valeurs (liste), table (pour ref), min / max, strict (montant > 0), defaut, defautParam
 */
function c_(cle, titre, type, options) {
  var champ = { cle: cle, titre: titre, type: type };
  if (options) for (var k in options) champ[k] = options[k];
  return champ;
}

/* ---------------------------------------------------------------------
 * Description des tables (l'ordre est celui des onglets)
 *  id.prefixe / id.champAnnee / id.chiffres : format des identifiants
 *  libelle / feminin : pour les messages (« Recette REC-2026-0042 créée »)
 * ------------------------------------------------------------------- */
var SCHEMA = {
  Adherents: {
    libelle: 'Adhérent', feminin: false,
    id: { prefixe: 'ADH', chiffres: 4 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('civilite', 'Civilité', 'liste', { valeurs: LISTES.CIVILITE }),
      c_('sexe', 'Sexe (H/F)', 'liste', { valeurs: LISTES.SEXE, requis: true }),
      c_('nom', 'Nom', 'texte', { requis: true, lecture: true }),
      c_('prenom', 'Prénom', 'texte', { requis: true }),
      c_('dateNaissance', 'Date de naissance', 'date'),
      c_('type', 'Type', 'liste', { valeurs: LISTES.TYPE_ADH, requis: true, defaut: 'Titulaire' }),
      c_('adresse', 'Adresse', 'texte'),
      c_('complementAdresse', "Complément d'adresse", 'texte'),
      c_('codePostal', 'Code postal', 'cp'),
      c_('ville', 'Ville', 'texte'),
      c_('region', 'Région (calculée)', 'calcule', { valeurs: LISTES.REGION }),
      c_('mobile', 'Mobile', 'tel'),
      c_('telFixe', 'Téléphone fixe', 'tel'),
      c_('email', 'E-mail principal', 'email'),
      c_('email2', 'E-mail secondaire', 'email'),
      c_('dateInscription', "Date d'inscription", 'date', { requis: true, lecture: true }),
      c_('cotisation', 'Cotisation (€)', 'montant', { defautParam: 'COTISATION_DEFAUT' }),
      c_('abonneFacebook', 'Abonné Facebook', 'oui_non', { defaut: false }),
      c_('recoitMaillon', 'Souhaite recevoir le Maillon', 'oui_non', { defaut: true }),
      c_('rattacheA', 'Rattaché à (ID conjoint)', 'ref', { table: 'Adherents' }),
      c_('neRienEnvoyer', 'Ne plus rien envoyer', 'oui_non', { defaut: false }),
      c_('deces', 'Décès', 'oui_non', { defaut: false }),
      c_('dateDeces', 'Date du décès', 'date'),
      c_('desinscrit', 'Désinscrit', 'oui_non', { defaut: false }),
      c_('dateFin', 'Date de fin', 'date'),
      c_('motifFin', 'Motif de fin', 'liste', { valeurs: LISTES.MOTIF_FIN }),
      c_('commentaire', 'Commentaire', 'texte')
    ]
  },

  Activites: {
    libelle: 'Activité', feminin: true,
    id: { prefixe: 'ACT', champAnnee: 'dateDebut', chiffres: 3 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('nom', 'Nom', 'texte', { requis: true, lecture: true }),
      c_('categorie', 'Catégorie', 'categorie', { requis: true }),
      c_('sousCategorie', 'Sous-catégorie', 'texte'),
      c_('organisateur', 'Organisateur (ID adhérent)', 'ref', { table: 'Adherents' }),
      c_('dateDebut', 'Date de début', 'date', { requis: true, lecture: true }),
      c_('dateFin', 'Date de fin', 'date'),
      c_('lieu', 'Lieu', 'texte'),
      c_('descriptif', 'Descriptif', 'texte'),
      c_('maxParticipants', 'Nombre maximum de participants', 'nombre', { min: 1, entier: true }),
      c_('budgetPrevu', 'Budget prévu (€)', 'montant'),
      c_('prixParPersonne', 'Prix par personne (€)', 'montant'),
      c_('coutReelParPersonne', 'Coût réel par personne (€)', 'montant'),
      c_('participationEuro', 'Participation association par personne (€)', 'montant'),
      c_('participationPct', 'Participation association par personne (%)', 'nombre', { min: 0, max: 100 }),
      c_('nbEcheances', "Nombre d'échéances", 'nombre', { min: 1, max: 12, entier: true, defaut: 1 }),
      c_('notification', 'Notification par mail', 'oui_non', { defaut: true }),
      c_('statut', 'Statut', 'liste', { valeurs: LISTES.STATUT_ACT, defaut: 'En préparation' })
    ]
  },

  Inscriptions: {
    libelle: 'Inscription', feminin: true,
    id: { prefixe: 'INS', chiffres: 5 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('activiteId', 'ID activité', 'ref', { table: 'Activites', requis: true, lecture: true }),
      c_('adherentId', 'ID adhérent', 'ref', { table: 'Adherents', requis: true, lecture: true }),
      c_('dateInscription', "Date d'inscription", 'date'),
      c_('statut', 'Statut', 'liste', { valeurs: LISTES.STATUT_INS, defaut: 'Inscrit' }),
      c_('montantDu', 'Montant dû (€)', 'montant')
    ]
  },

  Echeances: {
    libelle: 'Échéance', feminin: true,
    id: { prefixe: 'ECH', chiffres: 5 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('inscriptionId', 'ID inscription', 'ref', { table: 'Inscriptions', requis: true, lecture: true }),
      c_('numero', "Numéro d'échéance", 'nombre', { min: 1, max: 12, entier: true }),
      c_('montant', 'Montant (€)', 'montant'),
      c_('datePrevue', 'Date prévue', 'date'),
      c_('paye', 'Payé', 'oui_non', { defaut: false }),
      c_('datePaiement', 'Date de paiement', 'date'),
      c_('recetteId', 'ID recette générée', 'texte'),
      c_('rembourse', 'Remboursé', 'oui_non', { defaut: false }),
      c_('depenseId', 'ID dépense générée', 'texte')
    ]
  },

  Recettes: {
    libelle: 'Recette', feminin: true,
    id: { prefixe: 'REC', champAnnee: 'date', chiffres: 4 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('date', "Date d'encaissement", 'date', { requis: true, lecture: true }),
      c_('libelle', 'Libellé', 'texte', { requis: true }),
      c_('montant', 'Montant (€)', 'montant', { requis: true, lecture: true, strict: true }),
      c_('categorie', 'Catégorie', 'categorie', { requis: true }),
      c_('sousCategorie', 'Sous-catégorie', 'texte'),
      c_('activiteId', 'ID activité', 'ref', { table: 'Activites' }),
      c_('adherentId', 'ID adhérent', 'ref', { table: 'Adherents' }),
      c_('budgete', 'Budgété / Hors budget', 'liste', { valeurs: LISTES.BUDGETE, defaut: 'Budgété' }),
      c_('origine', 'Origine', 'liste', { valeurs: LISTES.ORIGINE_REC, defaut: 'Saisie manuelle' }),
      c_('echeanceId', "ID de l'échéance source", 'texte')
    ]
  },

  Depenses: {
    libelle: 'Dépense', feminin: true,
    id: { prefixe: 'DEP', champAnnee: 'date', chiffres: 4 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('date', 'Date de paiement', 'date', { requis: true, lecture: true }),
      c_('libelle', 'Libellé', 'texte', { requis: true }),
      c_('montant', 'Montant (€)', 'montant', { requis: true, lecture: true, strict: true }),
      c_('categorie', 'Catégorie', 'categorie', { requis: true }),
      c_('sousCategorie', 'Sous-catégorie', 'texte'),
      c_('prestataireId', 'ID prestataire', 'ref', { table: 'Prestataires' }),
      c_('activiteId', 'ID activité', 'ref', { table: 'Activites' }),
      c_('budgete', 'Budgété / Hors budget', 'liste', { valeurs: LISTES.BUDGETE, defaut: 'Budgété' }),
      c_('origine', 'Origine', 'liste', { valeurs: LISTES.ORIGINE_DEP, defaut: 'Saisie manuelle' }),
      c_('sourceId', 'ID source', 'texte')
    ]
  },

  Categories: {
    libelle: 'Catégorie', feminin: true,
    id: { prefixe: 'CAT', chiffres: 3 },
    unicite: ['categorie', 'sousCategorie'],
    champs: [
      c_('id', 'ID', 'id'),
      c_('categorie', 'Catégorie', 'texte', { requis: true, lecture: true }),
      c_('sousCategorie', 'Sous-catégorie', 'texte'),
      c_('type', 'Type', 'liste', { valeurs: LISTES.TYPE_CAT, requis: true, defaut: 'Les deux' })
    ]
  },

  Budgets: {
    libelle: 'Budget prévisionnel', feminin: false,
    id: { prefixe: 'BUD', champAnnee: 'annee', chiffres: 2 },
    unicite: ['annee', 'categorie'],
    champs: [
      c_('id', 'ID', 'id'),
      c_('annee', 'Année', 'nombre', { requis: true, lecture: true, min: 2000, max: 2100, entier: true }),
      c_('categorie', 'Catégorie', 'categorie', { requis: true, lecture: true }),
      c_('montant', 'Budget prévisionnel (€)', 'montant', { requis: true })
    ]
  },

  Prestataires: {
    libelle: 'Prestataire', feminin: false,
    id: { prefixe: 'PRE', chiffres: 3 },
    unicite: ['raisonSociale'],
    champs: [
      c_('id', 'ID', 'id'),
      c_('raisonSociale', 'Raison sociale', 'texte', { requis: true, lecture: true }),
      c_('activite', 'Activité', 'liste', { valeurs: LISTES.DOMAINE_PRE }),
      c_('adresse', 'Adresse', 'texte'),
      c_('codePostal', 'Code postal', 'cp'),
      c_('ville', 'Ville', 'texte'),
      c_('contact', 'Contact', 'texte'),
      c_('telephone', 'Téléphone', 'tel'),
      c_('email', 'E-mail', 'email'),
      c_('siteWeb', 'Site web', 'texte'),
      c_('siret', 'SIRET', 'texte'),
      c_('dateDebutRelation', 'Date de début de la relation', 'date'),
      c_('commentaire', 'Commentaire', 'texte')
    ]
  },

  MobilHome: {
    libelle: 'Location mobil-home', feminin: true,
    id: { prefixe: 'MH', chiffres: 4 },
    champs: [
      c_('id', 'ID', 'id'),
      c_('adherentId', 'ID adhérent', 'ref', { table: 'Adherents', requis: true, lecture: true }),
      c_('annee', 'Année', 'nombre', { requis: true, lecture: true, min: 2000, max: 2100, entier: true }),
      c_('semaine', 'Semaine (date de début)', 'date'),
      c_('coutLocation', 'Coût de la location (€)', 'montant'),
      c_('aideAsso', "Aide de l'association (€)", 'montant'),
      c_('montantPayeAdherent', "Montant payé par l'adhérent (€)", 'montant')
    ]
  }
};

/** Noms des onglets de données (dans l'ordre). Parametres et Journal sont gérés à part. */
var TABLES_DONNEES = Object.keys(SCHEMA);

/** Tables modifiables par la saisie générique (élargi à chaque lot). */
var TABLES_EDITABLES = ['Categories', 'Adherents', 'Recettes', 'Depenses', 'Budgets', 'Prestataires'];

/* ---------------------------------------------------------------------
 * Paramètres (onglet Parametres : Clé | Paramètre | Valeur | Description)
 * ------------------------------------------------------------------- */
var PARAMETRES_DEF = [
  { cle: 'MODE_ENTRAINEMENT', libelle: 'Mode entraînement', type: 'oui_non', defaut: true,
    description: "Oui : bandeau « MODE ENTRAÎNEMENT » visible, tous les e-mails partent vers l'e-mail de test, réinitialisation possible." },
  { cle: 'EMAIL_TEST', libelle: 'E-mail de test', type: 'email', defaut: '',
    description: "Adresse qui reçoit tous les e-mails en mode entraînement (jamais les vrais adhérents)." },
  { cle: 'AIDE_MOBILHOME', libelle: "Montant de l'aide mobil-home (€)", type: 'montant', defaut: 60,
    description: 'Aide versée par semaine de location, réservée aux titulaires.' },
  { cle: 'NB_AIDES_MOBILHOME', libelle: "Nombre d'aides mobil-home par titulaire et par an", type: 'nombre', defaut: 2,
    description: 'Plafond annuel par titulaire.' },
  { cle: 'DEPARTEMENTS_IDF', libelle: "Départements d'Île-de-France", type: 'texte', defaut: '75, 77, 78, 91, 92, 93, 94, 95',
    description: 'Sert à calculer la région (Île-de-France / Province) à partir du code postal.' },
  { cle: 'NB_SAUVEGARDES', libelle: 'Nombre de sauvegardes mensuelles conservées', type: 'nombre', defaut: 12,
    description: 'Les sauvegardes plus anciennes sont mises à la corbeille automatiquement.' },
  { cle: 'COTISATION_DEFAUT', libelle: 'Cotisation par défaut (€)', type: 'montant', defaut: 15,
    description: "Montant proposé pour un nouvel adhérent (modifiable fiche par fiche pour un don supérieur)." }
];

var TITRES_PARAMETRES = ['Clé', 'Paramètre', 'Valeur', 'Description'];
var TITRES_JOURNAL = ['Date et heure', 'Utilisateur', 'Action', 'Table', 'ID', 'Résumé'];

/* =====================================================================
 *  ACCÈS AU CLASSEUR
 * ===================================================================== */

/** Ouvre le classeur Brunants_Donnees (ID mémorisé par setup()). */
function classeur_() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_CLASSEUR');
  if (!id) {
    var actif = SpreadsheetApp.getActiveSpreadsheet();
    if (actif) return actif;
    throw new Error("L'outil n'est pas encore installé : ouvrez l'éditeur Apps Script et exécutez la fonction setup().");
  }
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Accès refusé : votre compte Google (' + emailUtilisateur_() +
      ") n'a pas accès au classeur « Brunants_Donnees ». Demandez au bureau de vous le partager.");
  }
}

/** Contexte commun : fuseau horaire, paramètres typés, départements d'Île-de-France. */
function contexte_(ss) {
  var tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Europe/Paris';
  var params = lireParametres_(ss);
  var idf = String(params.DEPARTEMENTS_IDF || '').split(/[^0-9AB]+/i).filter(function (x) { return x; })
    .map(function (x) { return x.toUpperCase(); });
  return { tz: tz, params: params, idf: idf };
}

/** Adresse e-mail de la personne connectée (ou « inconnu »). */
function emailUtilisateur_() {
  try {
    return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'utilisateur inconnu';
  } catch (e) {
    return 'utilisateur inconnu';
  }
}

/**
 * Exécute fn() sous verrou : un seul enregistrement à la fois, tous utilisateurs confondus.
 */
function avecVerrou_(fn) {
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(20000)) {
    throw new Error('Un autre membre du bureau enregistre en ce moment. Réessayez dans quelques secondes.');
  }
  try {
    var resultat = fn();
    SpreadsheetApp.flush();
    return resultat;
  } finally {
    verrou.releaseLock();
  }
}

/* =====================================================================
 *  OUTILS DE CONVERSION
 * ===================================================================== */

function estVide_(v) {
  return v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function sansAccents_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normaliserEntete_(s) {
  return sansAccents_(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Associe chaque champ du schéma à l'index de sa colonne (‑1 si absente). */
function carteColonnes_(entetes, sch) {
  var normes = entetes.map(normaliserEntete_);
  var carte = {};
  sch.champs.forEach(function (ch) {
    var i = normes.indexOf(normaliserEntete_(ch.titre));
    if (i < 0) i = normes.indexOf(normaliserEntete_(ch.cle));
    carte[ch.cle] = i;
  });
  return carte;
}

function deuxChiffres_(n) { return (n < 10 ? '0' : '') + n; }

/** Vérifie une date (a, m, j) et la renvoie au format AAAA-MM-JJ, ou '' si elle n'existe pas. */
function dateIso_(a, m, j) {
  a = Number(a); m = Number(m); j = Number(j);
  if (!a || !m || !j || m > 12 || j > 31 || a < 1900 || a > 2100) return '';
  var d = new Date(a, m - 1, j, 12);
  if (d.getFullYear() !== a || d.getMonth() !== m - 1 || d.getDate() !== j) return '';
  return a + '-' + deuxChiffres_(m) + '-' + deuxChiffres_(j);
}

/** Texte → AAAA-MM-JJ (accepte JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA et AAAA-MM-JJ). '' si illisible. */
function texteVersIso_(s) {
  s = String(s).trim();
  var m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return dateIso_(m[3], m[2], m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return dateIso_(m[1], m[2], m[3]);
  return '';
}

/** AAAA-MM-JJ → objet Date (à midi, pour éviter tout décalage de fuseau). */
function isoVersDate_(iso) {
  var p = String(iso).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}

/** Texte « 1 234,50 € » → 1234.5 ; NaN si illisible. */
function texteVersNombre_(s) {
  var t = String(s).replace(/[€\s  ]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

var VRAIS_ = ['oui', 'o', 'x', 'vrai', 'true', '1', 'yes', 'y'];
var FAUX_ = ['non', 'n', 'faux', 'false', '0', 'no'];

/**
 * Convertit une valeur lue dans une cellule selon le type du champ.
 * Renvoie { v: valeur, err: message éventuel }.
 */
function convertirLecture_(brut, ch, ctx) {
  var vide = estVide_(brut);
  switch (ch.type) {
    case 'date':
      if (vide) return { v: '' };
      if (Object.prototype.toString.call(brut) === '[object Date]') {
        if (isNaN(brut.getTime())) return { v: '', err: 'date illisible' };
        return { v: Utilities.formatDate(brut, ctx.tz, 'yyyy-MM-dd') };
      }
      var iso = texteVersIso_(brut);
      return iso ? { v: iso } : { v: '', err: 'date « ' + brut + ' » illisible (format attendu JJ/MM/AAAA)' };

    case 'montant':
    case 'nombre':
      if (vide) return { v: '' };
      var n = typeof brut === 'number' ? brut : texteVersNombre_(brut);
      return isNaN(n) ? { v: '', err: 'nombre « ' + brut + ' » illisible' } : { v: n };

    case 'oui_non':
      if (brut === true) return { v: true };
      if (brut === false) return { v: false };
      if (vide) return { v: ch.defaut === true };
      var t = sansAccents_(brut).toLowerCase().trim();
      if (VRAIS_.indexOf(t) >= 0) return { v: true };
      if (FAUX_.indexOf(t) >= 0) return { v: false };
      return { v: ch.defaut === true, err: 'valeur « ' + brut + ' » inattendue (Oui ou Non)' };

    case 'liste':
      if (vide) return { v: '' };
      var s = String(brut).trim();
      var trouve = (ch.valeurs || []).filter(function (x) { return normaliserEntete_(x) === normaliserEntete_(s); })[0];
      return trouve ? { v: trouve } : { v: s, err: 'valeur « ' + s + ' » inattendue (' + ch.valeurs.join(', ') + ')' };

    case 'cp':
      if (vide) return { v: '' };
      var cp = typeof brut === 'number' ? String(Math.round(brut)) : String(brut).trim();
      if (/^\d{4}$/.test(cp)) cp = '0' + cp;           // 1000 → 01000 (zéro perdu par Sheets)
      return /^\d{5}$/.test(cp) ? { v: cp } : { v: cp, err: 'code postal « ' + cp + ' » inattendu (5 chiffres)' };

    case 'tel':
      if (vide) return { v: '' };
      var tel = typeof brut === 'number' ? String(Math.round(brut)) : String(brut).trim();
      if (/^\d{9}$/.test(tel)) tel = '0' + tel;         // 612345678 → 0612345678
      return { v: tel };

    case 'email':
      if (vide) return { v: '' };
      var mail = String(brut).trim();
      return EMAIL_RE_.test(mail) ? { v: mail } : { v: mail, err: 'adresse e-mail « ' + mail + ' » invalide' };

    default:
      return { v: vide ? '' : String(brut).trim() };
  }
}

var EMAIL_RE_ = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valeur JavaScript → valeur à écrire dans la cellule. */
function versCellule_(v, ch) {
  switch (ch.type) {
    case 'date': return v ? isoVersDate_(v) : '';
    case 'oui_non': return v === true ? 'Oui' : 'Non';
    case 'montant':
    case 'nombre': return (v === '' || v === null || v === undefined) ? '' : Number(v);
    default: return (v === null || v === undefined) ? '' : String(v);
  }
}

/** Champs calculés par l'application (jamais saisis). */
function calculerChamps_(table, obj, ctx) {
  if (table === 'Adherents') obj.region = regionDepuisCp_(obj.codePostal, ctx);
}

function regionDepuisCp_(cp, ctx) {
  cp = String(cp || '');
  if (!/^\d{5}$/.test(cp)) return '';
  return ctx.idf.indexOf(cp.slice(0, 2)) >= 0 ? 'Île-de-France' : 'Province';
}

/* =====================================================================
 *  LECTURE
 * ===================================================================== */

/** Avertissement affiché dans l'outil. bloquant = la ligne est ignorée. */
function avertissement_(table, ligne, motif, bloquant, id) {
  return { table: table, ligne: ligne || '', id: id || '', motif: motif, niveau: bloquant ? 'Ignorée' : 'À vérifier' };
}

/**
 * Lit un onglet et renvoie un tableau d'objets { id, nom, …, _ligne }.
 * Les lignes vides sont sautées ; les lignes inexploitables sont ignorées avec un avertissement.
 */
function lireTable_(ss, nom, avertissements, ctx) {
  var sch = SCHEMA[nom];
  var feuille = ss.getSheetByName(nom);
  if (!feuille) {
    avertissements.push(avertissement_(nom, '', 'Onglet « ' + nom + ' » introuvable : relancez setup().', true));
    return [];
  }
  var valeurs = feuille.getDataRange().getValues();
  if (valeurs.length === 0 || valeurs[0].every(estVide_)) return [];
  var carte = carteColonnes_(valeurs[0], sch);
  sch.champs.forEach(function (ch) {
    if (carte[ch.cle] < 0 && ch.type !== 'calcule') {
      avertissements.push(avertissement_(nom, 1, 'Colonne « ' + ch.titre + ' » absente : relancez setup() pour la recréer.', ch.lecture || ch.type === 'id'));
    }
  });
  if (carte.id < 0) return [];

  var lignes = [];
  var vus = {};
  for (var r = 1; r < valeurs.length; r++) {
    var ligne = valeurs[r];
    if (ligne.every(estVide_)) continue;
    var obj = { _ligne: r + 1 };
    var bloquants = [];
    var remarques = [];
    sch.champs.forEach(function (ch) {
      var i = carte[ch.cle];
      var res = convertirLecture_(i >= 0 ? ligne[i] : '', ch, ctx);
      obj[ch.cle] = res.v;
      if (res.err) (ch.lecture ? bloquants : remarques).push(ch.titre + ' : ' + res.err);
      else if (ch.lecture && estVide_(res.v)) bloquants.push(ch.titre + ' manquant(e)');
    });
    if (!obj.id) bloquants.unshift('ID manquant');
    else if (vus[obj.id]) bloquants.unshift('ID ' + obj.id + ' en double (déjà utilisé ligne ' + vus[obj.id] + ')');
    if (bloquants.length) {
      avertissements.push(avertissement_(nom, r + 1, bloquants.join(' ; '), true, obj.id));
      continue;
    }
    remarques = remarques.concat(controlesLecture_(nom, obj));
    if (remarques.length) avertissements.push(avertissement_(nom, r + 1, remarques.join(' ; '), false, obj.id));
    vus[obj.id] = r + 1;
    calculerChamps_(nom, obj, ctx);
    lignes.push(obj);
  }
  return lignes;
}

/** Lit l'onglet Parametres et renvoie un objet typé { MODE_ENTRAINEMENT: true, … }. */
function lireParametres_(ss) {
  var params = {};
  PARAMETRES_DEF.forEach(function (p) { params[p.cle] = p.defaut; });
  var feuille = ss.getSheetByName('Parametres');
  if (!feuille || feuille.getLastRow() < 2) return params;
  var valeurs = feuille.getRange(1, 1, feuille.getLastRow(), Math.max(feuille.getLastColumn(), 3)).getValues();
  var entetes = valeurs[0].map(normaliserEntete_);
  var iCle = entetes.indexOf('cle'), iVal = entetes.indexOf('valeur');
  if (iCle < 0 || iVal < 0) return params;
  var defs = {};
  PARAMETRES_DEF.forEach(function (p) { defs[p.cle] = p; });
  for (var r = 1; r < valeurs.length; r++) {
    var cle = String(valeurs[r][iCle]).trim();
    var def = defs[cle];
    if (!def) continue;
    var res = convertirLecture_(valeurs[r][iVal], { type: def.type, defaut: def.defaut }, { tz: 'Europe/Paris' });
    if (res.err) continue;                                   // valeur illisible : on garde la valeur par défaut
    if (def.type === 'email' || !estVide_(res.v)) params[cle] = res.v;
  }
  return params;
}

/** Lit le journal (les plus récents d'abord). */
function lireJournal_(ss, tz, maximum) {
  var feuille = ss.getSheetByName('Journal');
  if (!feuille || feuille.getLastRow() < 2) return [];
  var n = feuille.getLastRow() - 1;
  var debut = Math.max(2, feuille.getLastRow() - maximum + 1);
  var valeurs = feuille.getRange(debut, 1, feuille.getLastRow() - debut + 1, 6).getValues();
  var sortie = [];
  for (var i = valeurs.length - 1; i >= 0; i--) {
    var v = valeurs[i];
    if (v.every(estVide_)) continue;
    var quand = Object.prototype.toString.call(v[0]) === '[object Date]' && !isNaN(v[0].getTime())
      ? Utilities.formatDate(v[0], tz, 'yyyy-MM-dd HH:mm:ss') : String(v[0]);
    sortie.push({ id: 'J' + (debut + i), date: quand, utilisateur: String(v[1]), action: String(v[2]),
                  table: String(v[3]), refId: String(v[4]), resume: String(v[5]) });
  }
  return sortie;
}

/** Ajoute une ligne au journal. */
function journaliser_(ss, action, table, id, resume) {
  var feuille = ss.getSheetByName('Journal');
  if (!feuille) return;
  feuille.appendRow([new Date(), emailUtilisateur_(), action, table || '', id || '', resume || '']);
}

/**
 * CHARGEMENT COMPLET — appelé par l'interface à l'ouverture, après « Actualiser »
 * et après chaque enregistrement (les données renvoyées sont toujours à jour).
 */
function chargerTout() {
  var ss = classeur_();
  var ctx = contexte_(ss);
  var avertissements = [];
  var tables = {};
  TABLES_DONNEES.forEach(function (t) { tables[t] = lireTable_(ss, t, avertissements, ctx); });
  verifierReferences_(tables, avertissements);
  var props = PropertiesService.getScriptProperties();
  return {
    tables: tables,
    parametres: ctx.params,
    avertissements: avertissements,
    journal: lireJournal_(ss, ctx.tz, 1000),
    schema: schemaPourInterface_(),
    utilisateur: emailUtilisateur_(),
    version: VERSION_OUTIL,
    aujourdhui: Utilities.formatDate(new Date(), ctx.tz, 'yyyy-MM-dd'),
    derniereSauvegarde: props.getProperty('DERNIERE_SAUVEGARDE') || '',
    urlClasseur: ss.getUrl()
  };
}

/** Description des tables envoyée à l'interface (pour les contrôles de saisie). */
function schemaPourInterface_() {
  var sortie = { tables: {}, listes: LISTES, categoriesBudget: CATEGORIES_BUDGET,
                 parametres: PARAMETRES_DEF, editables: TABLES_EDITABLES };
  TABLES_DONNEES.forEach(function (t) {
    sortie.tables[t] = { libelle: SCHEMA[t].libelle, feminin: SCHEMA[t].feminin, champs: SCHEMA[t].champs };
  });
  return sortie;
}

/** Réponse standard après une action : message + données fraîches. */
function reponse_(message, id, extra) {
  var r = { ok: true, message: message, id: id || '', donnees: chargerTout() };
  if (extra) for (var k in extra) r[k] = extra[k];
  return r;
}

/* =====================================================================
 *  ÉCRITURE
 * ===================================================================== */

/**
 * Nettoie et type un objet reçu de l'interface. Renvoie { obj, erreurs }.
 */
function normaliserEntree_(table, brut, ctx) {
  var sch = SCHEMA[table];
  var obj = {};
  var erreurs = [];
  sch.champs.forEach(function (ch) {
    var v = brut[ch.cle];
    if (ch.type === 'oui_non') {
      obj[ch.cle] = (v === undefined) ? (ch.defaut === true) : (v === true || VRAIS_.indexOf(sansAccents_(v).toLowerCase()) >= 0);
      return;
    }
    if (v === undefined || v === null) v = '';
    if (typeof v === 'string') v = v.trim();
    if (estVide_(v)) {
      if (ch.defautParam && ctx.params[ch.defautParam] !== undefined && brut[ch.cle] === undefined) v = ctx.params[ch.defautParam];
      else if (ch.defaut !== undefined && brut[ch.cle] === undefined) v = ch.defaut;
      else { obj[ch.cle] = ''; return; }
    }
    if (ch.type === 'montant' || ch.type === 'nombre') {
      var n = typeof v === 'number' ? v : texteVersNombre_(v);
      if (isNaN(n)) { erreurs.push('« ' + ch.titre + ' » doit être un nombre.'); obj[ch.cle] = ''; return; }
      obj[ch.cle] = n;
    } else if (ch.type === 'date') {
      var iso = texteVersIso_(v);
      if (!iso) { erreurs.push('« ' + ch.titre + ' » : date invalide.'); obj[ch.cle] = ''; return; }
      obj[ch.cle] = iso;
    } else {
      obj[ch.cle] = String(v);
    }
  });
  obj.id = String(brut.id || '').trim();
  return { obj: obj, erreurs: erreurs };
}

/**
 * Contrôles de saisie (messages en français). « existants » = données déjà lues,
 * pour vérifier les ID référencés et les doublons.
 */
function validerObjet_(table, obj, existants) {
  var sch = SCHEMA[table];
  var erreurs = [];
  sch.champs.forEach(function (ch) {
    if (ch.type === 'id' || ch.type === 'calcule' || ch.type === 'oui_non') return;
    var v = obj[ch.cle];
    if (estVide_(v)) {
      if (ch.requis) erreurs.push('« ' + ch.titre + ' » est obligatoire.');
      return;
    }
    switch (ch.type) {
      case 'email':
        if (!EMAIL_RE_.test(v)) erreurs.push('« ' + ch.titre + ' » : adresse e-mail invalide.');
        break;
      case 'cp':
        if (!/^\d{5}$/.test(v)) erreurs.push('« ' + ch.titre + ' » : 5 chiffres attendus.');
        break;
      case 'tel':
        if (!/^[0-9+ .()\-]{6,20}$/.test(v)) erreurs.push('« ' + ch.titre + ' » : numéro de téléphone invalide.');
        break;
      case 'montant':
        if (v < 0) erreurs.push('« ' + ch.titre + ' » doit être positif.');
        else if (ch.strict && v === 0) erreurs.push('« ' + ch.titre + ' » doit être supérieur à 0.');
        break;
      case 'nombre':
        if (ch.entier && Math.round(v) !== v) erreurs.push('« ' + ch.titre + ' » doit être un nombre entier.');
        if (ch.min !== undefined && v < ch.min) erreurs.push('« ' + ch.titre + ' » doit être au moins ' + ch.min + '.');
        if (ch.max !== undefined && v > ch.max) erreurs.push('« ' + ch.titre + ' » doit être au plus ' + ch.max + '.');
        break;
      case 'liste':
        if (ch.valeurs.indexOf(v) < 0) erreurs.push('« ' + ch.titre + ' » : valeur non autorisée (' + ch.valeurs.join(', ') + ').');
        break;
      case 'ref':
        var cible = (existants[ch.table] || []).some(function (x) { return x.id === v; });
        if (!cible) erreurs.push('« ' + ch.titre + ' » : aucun enregistrement avec l\'ID ' + v + '.');
        break;
      case 'categorie':
        var connue = (existants.Categories || []).some(function (x) { return x.categorie === v; });
        if (!connue) erreurs.push('« ' + ch.titre + ' » : catégorie « ' + v + ' » inconnue (voir Administration > Catégories).');
        break;
    }
  });
  if (sch.unicite) {
    var doublon = (existants[table] || []).filter(function (x) {
      return x.id !== obj.id && sch.unicite.every(function (k) {
        return normaliserEntete_(x[k]) === normaliserEntete_(obj[k]);
      });
    })[0];
    if (doublon) {
      erreurs.push('Cet enregistrement existe déjà (' + doublon.id + ' : ' +
        sch.unicite.map(function (k) { return doublon[k] || '—'; }).join(' / ') + ').');
    }
  }
  return erreurs;
}

/** Lit les tables nécessaires aux contrôles (la table elle-même + les tables référencées). */
function lireExistants_(ss, table, ctx) {
  var besoin = {};
  besoin[table] = true;
  SCHEMA[table].champs.forEach(function (ch) {
    if (ch.type === 'ref') besoin[ch.table] = true;
    if (ch.type === 'categorie') besoin.Categories = true;
  });
  var existants = {};
  var ignores = [];
  Object.keys(besoin).forEach(function (t) { existants[t] = lireTable_(ss, t, ignores, ctx); });
  return existants;
}

/**
 * Génère le prochain identifiant libre : ADH-0001, ACT-2026-001, REC-2026-0001, PRE-001…
 * On repart du plus grand numéro existant pour le même préfixe (jamais de réutilisation).
 */
function genererId_(feuille, table, obj, tz) {
  var def = SCHEMA[table].id;
  var base = def.prefixe + '-';
  if (def.champAnnee) {
    var a = obj[def.champAnnee];
    var annee = typeof a === 'number' ? a : (a ? Number(String(a).slice(0, 4)) : new Date().getFullYear());
    base += annee + '-';
  }
  var max = 0;
  var n = feuille.getLastRow();
  if (n >= 2) {
    var entetes = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
    var col = carteColonnes_(entetes, SCHEMA[table]).id + 1;
    feuille.getRange(2, col, n - 1, 1).getValues().forEach(function (l) {
      var id = String(l[0]).trim();
      if (id.indexOf(base) === 0) {
        var num = Number(id.slice(base.length));
        if (!isNaN(num) && num > max) max = num;
      }
    });
  }
  var suivant = String(max + 1);
  while (suivant.length < def.chiffres) suivant = '0' + suivant;
  return base + suivant;
}

/** Retrouve le numéro de ligne (1 = en-têtes) d'un ID ; ‑1 si absent. */
function ligneParId_(valeurs, colId, id) {
  for (var r = 1; r < valeurs.length; r++) {
    if (String(valeurs[r][colId]).trim() === id) return r + 1;
  }
  return -1;
}

/**
 * Crée (sans ID) ou modifie (avec ID) un enregistrement. Doit être appelé sous verrou.
 * Renvoie { id, creation, message }.
 */
function ecrireEnregistrement_(ss, ctx, table, brut, origineJournal, actionJournal) {
  var sch = SCHEMA[table];
  var norm = normaliserEntree_(table, brut, ctx);
  var obj = norm.obj;
  var existants = lireExistants_(ss, table, ctx);
  var erreurs = norm.erreurs.concat(reglesMetier_(table, obj, existants, ctx, origineJournal));
  erreurs = erreurs.concat(validerObjet_(table, obj, existants));
  if (erreurs.length) throw new Error(erreurs.join('\n'));
  calculerChamps_(table, obj, ctx);

  var feuille = ss.getSheetByName(table);
  var valeurs = feuille.getDataRange().getValues();
  var entetes = valeurs[0];
  var carte = carteColonnes_(entetes, sch);
  if (carte.id < 0) throw new Error('La colonne « ID » est introuvable dans l\'onglet ' + table + ' : relancez setup().');

  var creation = !obj.id;
  var numLigne;
  var ligne;
  var avant = null;   // état précédent (pour reporter un renommage de catégorie)
  if (!creation && table === 'Categories') avant = (existants.Categories || []).filter(function (c) { return c.id === obj.id; })[0] || null;
  if (creation) {
    obj.id = genererId_(feuille, table, obj, ctx.tz);
    numLigne = feuille.getLastRow() + 1;
    ligne = entetes.map(function () { return ''; });
  } else {
    numLigne = ligneParId_(valeurs, carte.id, obj.id);
    if (numLigne < 0) throw new Error(sch.libelle + ' ' + obj.id + ' introuvable : elle a peut-être été supprimée entre-temps. Cliquez sur « Actualiser ».');
    ligne = valeurs[numLigne - 1].slice();
  }
  sch.champs.forEach(function (ch) {
    var i = carte[ch.cle];
    if (i >= 0) ligne[i] = versCellule_(obj[ch.cle], ch);
  });
  feuille.getRange(numLigne, 1, 1, ligne.length).setValues([ligne]);

  var report = avant ? reporterRenommageCategorie_(ss, ctx, avant, obj) : '';
  var verbe = creation ? (sch.feminin ? 'créée' : 'créé') : (sch.feminin ? 'modifiée' : 'modifié');
  journaliser_(ss, actionJournal || (creation ? 'Création' : 'Modification'), table, obj.id,
    (origineJournal ? origineJournal + ' — ' : '') + resumeEnregistrement_(table, obj));
  return { id: obj.id, creation: creation, obj: obj, message: sch.libelle + ' ' + obj.id + ' ' + verbe + '.' + report };
}

/** Résumé lisible d'un enregistrement pour le journal. */
function resumeEnregistrement_(table, o) {
  switch (table) {
    case 'Adherents': return (o.nom || '') + ' ' + (o.prenom || '');
    case 'Activites': return (o.nom || '') + ' (' + (o.dateDebut || '') + ')';
    case 'Recettes':
    case 'Depenses': return (o.libelle || '') + ' — ' + o.montant + ' €';
    case 'Categories': return o.categorie + (o.sousCategorie ? ' / ' + o.sousCategorie : '') + ' (' + o.type + ')';
    case 'Budgets': return o.annee + ' — ' + o.categorie + ' : ' + o.montant + ' €';
    case 'Prestataires': return o.raisonSociale || '';
    default: return '';
  }
}

/**
 * Vérifie qu'un enregistrement n'est pas utilisé ailleurs avant suppression.
 * Renvoie la liste des usages (« 3 recette(s) », …).
 */
function usagesEnregistrement_(ss, ctx, table, enreg) {
  var usages = [];
  var ignores = [];
  TABLES_DONNEES.forEach(function (t) {
    var champs = SCHEMA[t].champs.filter(function (ch) {
      return (ch.type === 'ref' && ch.table === table) || (table === 'Categories' && ch.type === 'categorie');
    });
    if (!champs.length) return;
    var lignes = lireTable_(ss, t, ignores, ctx);
    var n = lignes.filter(function (l) {
      return champs.some(function (ch) {
        return ch.type === 'categorie' ? l[ch.cle] === enreg.categorie : l[ch.cle] === enreg.id;
      });
    }).length;
    if (n) usages.push(n + ' ligne(s) dans ' + t);
  });
  return usages;
}

/**
 * Supprime un enregistrement par son ID (appelé depuis l'interface, après confirmation).
 */
function supprimer(table, id) {
  if (TABLES_EDITABLES.indexOf(table) < 0) throw new Error('Suppression impossible depuis l\'outil pour la table ' + table + '.');
  id = String(id || '').trim();
  if (table === 'Prestataires' && id === ID_PRESTATAIRE_AUTRE) {
    throw new Error('L\'entrée « Autre » des prestataires est permanente et ne peut pas être supprimée.');
  }
  var message = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var sch = SCHEMA[table];
    var feuille = ss.getSheetByName(table);
    var valeurs = feuille.getDataRange().getValues();
    var carte = carteColonnes_(valeurs[0], sch);
    var num = ligneParId_(valeurs, carte.id, id);
    if (num < 0) throw new Error(sch.libelle + ' ' + id + ' introuvable (déjà supprimé ?). Cliquez sur « Actualiser ».');
    var enreg = lireTable_(ss, table, [], ctx).filter(function (x) { return x.id === id; })[0] || { id: id };
    if ((table === 'Recettes' || table === 'Depenses') && enreg.origine && enreg.origine !== 'Saisie manuelle') {
      throw new Error(messageLigneAutomatique_(table, enreg));
    }
    if (table === 'Categories') {
      var memeNom = lireTable_(ss, 'Categories', [], ctx).filter(function (x) {
        return x.categorie === enreg.categorie && x.id !== id;
      }).length;
      if (!memeNom) {
        var usages = usagesEnregistrement_(ss, ctx, table, enreg);
        if (usages.length) throw new Error('Suppression impossible : la catégorie « ' + enreg.categorie + ' » est encore utilisée (' + usages.join(', ') + ').');
      }
      // la sous-catégorie elle-même ne doit plus être utilisée
      if (enreg.sousCategorie) {
        var usagesSous = [];
        ['Activites', 'Recettes', 'Depenses'].forEach(function (t) {
          var n = lireTable_(ss, t, [], ctx).filter(function (l) {
            return l.categorie === enreg.categorie && normaliserEntete_(l.sousCategorie) === normaliserEntete_(enreg.sousCategorie);
          }).length;
          if (n) usagesSous.push(n + ' ligne(s) dans ' + t);
        });
        if (usagesSous.length) {
          throw new Error('Suppression impossible : la sous-catégorie « ' + enreg.sousCategorie + ' » est encore utilisée (' + usagesSous.join(', ') +
            '). Modifiez d\'abord ces lignes, ou renommez la sous-catégorie : le nouveau nom sera reporté automatiquement sur ces lignes.');
        }
      }
    } else {
      var usagesRef = usagesEnregistrement_(ss, ctx, table, enreg);
      if (usagesRef.length) {
        throw new Error('Suppression impossible : ' + id + ' est encore utilisé (' + usagesRef.join(', ') + ').' +
          (table === 'Adherents' ? '\nPour un adhérent qui quitte l\'association, utilisez plutôt « Désinscrire » : sa fiche passe dans les archives.' : ''));
      }
    }
    feuille.deleteRow(num);
    journaliser_(ss, 'Suppression', table, id, resumeEnregistrement_(table, enreg));
    return sch.libelle + ' ' + id + ' ' + (sch.feminin ? 'supprimée' : 'supprimé') + '.';
  });
  return reponse_(message, id);
}

/**
 * Enregistrement générique depuis l'interface (création si pas d'ID, sinon modification).
 */
function enregistrer(table, obj) {
  if (TABLES_EDITABLES.indexOf(table) < 0) throw new Error('Enregistrement impossible depuis cet écran pour la table ' + table + '.');
  var res = avecVerrou_(function () {
    var ss = classeur_();
    return ecrireEnregistrement_(ss, contexte_(ss), table, obj || {}, 'Saisie');
  });
  return reponse_(res.message, res.id);
}

/**
 * Enregistre les paramètres modifiés dans Administration.
 */
function enregistrerParametres(valeurs) {
  valeurs = valeurs || {};
  var erreurs = [];
  var defs = {};
  PARAMETRES_DEF.forEach(function (p) { defs[p.cle] = p; });
  var propres = {};
  Object.keys(valeurs).forEach(function (cle) {
    var def = defs[cle];
    if (!def) return;
    var v = valeurs[cle];
    if (def.type === 'oui_non') { propres[cle] = (v === true || v === 'Oui'); return; }
    v = String(v === undefined || v === null ? '' : v).trim();
    if (def.type === 'email') {
      if (v && !EMAIL_RE_.test(v)) erreurs.push('« ' + def.libelle + ' » : adresse e-mail invalide.');
    } else if (def.type === 'montant' || def.type === 'nombre') {
      var n = texteVersNombre_(v);
      if (isNaN(n) || n < 0) { erreurs.push('« ' + def.libelle + ' » doit être un nombre positif.'); return; }
      if (cle === 'NB_SAUVEGARDES' && (n < 1 || Math.round(n) !== n)) erreurs.push('« ' + def.libelle + ' » doit être un nombre entier d\'au moins 1.');
      v = n;
    } else if (cle === 'DEPARTEMENTS_IDF') {
      if (!/^\s*\d{2}(\s*[,;]\s*\d{2})*\s*$/.test(v)) erreurs.push('« ' + def.libelle + ' » : numéros à 2 chiffres séparés par des virgules (ex. 75, 77, 78).');
    }
    propres[cle] = v;
  });
  if (propres.MODE_ENTRAINEMENT === true && valeurs.EMAIL_TEST !== undefined && !propres.EMAIL_TEST) {
    erreurs.push('En mode entraînement, l\'e-mail de test est obligatoire.');
  }
  if (erreurs.length) throw new Error(erreurs.join('\n'));

  avecVerrou_(function () {
    var ss = classeur_();
    var feuille = ss.getSheetByName('Parametres');
    var donnees = feuille.getRange(1, 1, feuille.getLastRow(), 3).getValues();
    var modifs = [];
    for (var r = 1; r < donnees.length; r++) {
      var cle = String(donnees[r][0]).trim();
      if (!(cle in propres)) continue;
      var def = defs[cle];
      var cellule = def.type === 'oui_non' ? (propres[cle] ? 'Oui' : 'Non') : propres[cle];
      if (String(donnees[r][2]) !== String(cellule)) {
        feuille.getRange(r + 1, 3).setValue(cellule);
        modifs.push(def.libelle + ' = ' + cellule);
      }
    }
    if (modifs.length) journaliser_(ss, 'Paramètres', 'Parametres', '', modifs.join(' ; '));
  });
  return reponse_('Paramètres enregistrés.');
}


/* =====================================================================
 *  RÈGLES MÉTIER PAR TABLE (lot 2 : adhérents)
 * ===================================================================== */

function aujourdhuiIso_(ctx) {
  return Utilities.formatDate(new Date(), (ctx && ctx.tz) || 'Europe/Paris', 'yyyy-MM-dd');
}

/** JJ/MM/AAAA pour les messages. */
function isoVersFr_(iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function nomComplet_(a) {
  return ((a.nom || '') + ' ' + (a.prenom || '')).trim();
}

/**
 * Règles appliquées avant chaque enregistrement. Peut compléter l'objet
 * (ex. motif « Décès » automatique). Renvoie la liste des erreurs.
 */
function reglesMetier_(table, o, existants, ctx, mode) {
  if (table === 'Recettes' || table === 'Depenses') return reglesMouvement_(table, o, existants, mode);
  if (table === 'Prestataires') {
    return o.id === ID_PRESTATAIRE_AUTRE ? ['L\'entrée « Autre » (' + ID_PRESTATAIRE_AUTRE + ') est permanente : elle ne peut pas être modifiée.'] : [];
  }
  if (table !== 'Adherents') return [];
  var e = [];
  var auj = aujourdhuiIso_(ctx);
  if (o.nom) o.nom = String(o.nom).toUpperCase();

  // Fin d'adhésion : décès ou désinscription
  if (o.motifFin === 'Décès' && !o.deces) { o.deces = true; if (!o.dateDeces) o.dateDeces = o.dateFin; }
  if (o.deces) {
    if (!o.dateDeces) e.push('Décès coché : la « Date du décès » est obligatoire.');
    o.motifFin = 'Décès';
    if (!o.dateFin) o.dateFin = o.dateDeces;
  } else if (o.desinscrit) {
    if (!o.dateFin) e.push('Désinscrit coché : la « Date de fin » est obligatoire.');
    if (!o.motifFin) e.push('Désinscrit coché : le « Motif de fin » est obligatoire.');
  } else {
    // ni décès ni désinscription : l'adhésion est en cours
    o.dateFin = ''; o.motifFin = ''; o.dateDeces = '';
  }

  // Cohérence des dates
  if (o.dateNaissance && o.dateNaissance > auj) e.push('La date de naissance est dans le futur.');
  if (o.dateNaissance && o.dateInscription && o.dateInscription < o.dateNaissance) e.push('La date d\'inscription est antérieure à la date de naissance.');
  if (o.dateFin && o.dateInscription && o.dateFin < o.dateInscription) e.push('La date de fin est antérieure à la date d\'inscription.');
  if (o.dateDeces && o.dateNaissance && o.dateDeces < o.dateNaissance) e.push('La date du décès est antérieure à la date de naissance.');
  if (o.dateDeces && o.dateDeces > auj) e.push('La date du décès est dans le futur.');

  // Conjoint
  if (o.rattacheA && o.id && o.rattacheA === o.id) e.push('Un adhérent ne peut pas être rattaché à lui-même.');

  // Doublon : même nom, même prénom, même date de naissance
  if (o.nom && o.prenom && o.dateNaissance) {
    var cle = normaliserEntete_(o.nom) + '|' + normaliserEntete_(o.prenom) + '|' + o.dateNaissance;
    var doublon = (existants.Adherents || []).filter(function (a) {
      return a.id !== o.id && normaliserEntete_(a.nom) + '|' + normaliserEntete_(a.prenom) + '|' + a.dateNaissance === cle;
    })[0];
    if (doublon) e.push('Doublon : ' + doublon.id + ' ' + nomComplet_(doublon) + ' a déjà le même nom, prénom et date de naissance.');
  }
  return e;
}

/** Anomalies non bloquantes repérées à la lecture d'une ligne (saisie à la main). */
function controlesLecture_(table, o) {
  if (table !== 'Adherents') return [];
  var r = [];
  if (o.dateFin && !o.desinscrit && !o.deces) r.push('Date de fin renseignée mais ni « Désinscrit » ni « Décès » à Oui');
  if (o.desinscrit && !o.dateFin) r.push('Désinscrit sans date de fin');
  if (o.deces && !o.dateDeces) r.push('Décès sans date du décès');
  if (o.dateNaissance && o.dateInscription && o.dateNaissance > o.dateInscription) r.push('Date de naissance postérieure à la date d\'inscription');
  return r;
}

/** Signale les ID référencés qui n'existent pas (ex. conjoint supprimé à la main). */
function verifierReferences_(tables, avertissements) {
  var ids = {};
  Object.keys(tables).forEach(function (t) {
    ids[t] = {};
    tables[t].forEach(function (l) { ids[t][l.id] = true; });
  });
  Object.keys(tables).forEach(function (t) {
    var refs = SCHEMA[t].champs.filter(function (c) { return c.type === 'ref'; });
    if (!refs.length) return;
    tables[t].forEach(function (l) {
      var manquants = refs.filter(function (c) { return l[c.cle] && !ids[c.table][l[c.cle]]; })
        .map(function (c) { return c.titre + ' : ' + l[c.cle] + ' introuvable dans ' + c.table; });
      if (manquants.length) avertissements.push(avertissement_(t, l._ligne, manquants.join(' ; '), false, l.id));
    });
  });
}

/** Relit un enregistrement par son ID (ou lève une erreur claire). */
function lireEnregistrement_(ss, ctx, table, id) {
  var o = lireTable_(ss, table, [], ctx).filter(function (x) { return x.id === id; })[0];
  if (!o) throw new Error(SCHEMA[table].libelle + ' ' + id + ' introuvable ou illisible dans le classeur. Cliquez sur « Actualiser ».');
  delete o._ligne;
  return o;
}

/**
 * Désinscription (ou décès) depuis la liste des adhérents.
 * donnees = { motifFin, dateFin } ; motif « Décès » → case Décès cochée, date du décès = date de fin.
 */
function desinscrire(id, donnees) {
  donnees = donnees || {};
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var a = lireEnregistrement_(ss, ctx, 'Adherents', String(id || '').trim());
    if (a.desinscrit || a.deces) throw new Error(a.id + ' ' + nomComplet_(a) + ' est déjà dans les archives.');
    var motif = String(donnees.motifFin || '').trim();
    var date = texteVersIso_(donnees.dateFin || '');
    if (!motif) throw new Error('Choisissez le motif de fin.');
    if (!date) throw new Error('Saisissez une date de fin valide.');
    if (motif === 'Décès') { a.deces = true; a.dateDeces = date; a.dateFin = date; a.desinscrit = false; }
    else { a.desinscrit = true; a.dateFin = date; }
    a.motifFin = motif;
    var r = ecrireEnregistrement_(ss, ctx, 'Adherents', a, motif === 'Décès' ? 'Décès' : 'Désinscription (' + motif + ')', 'Désinscription');
    return { id: a.id, message: 'Adhérent ' + a.id + ' (' + nomComplet_(r.obj) + ') ' + (motif === 'Décès' ? 'enregistré comme décédé' : 'désinscrit') +
      ' le ' + isoVersFr_(date) + ' : fiche passée dans les archives.' };
  });
  return reponse_(res.message, res.id);
}

/**
 * Réinscription d'un ancien adhérent : la fiche revient dans la liste active.
 * La date de réinscription devient la date d'inscription ; l'ancienne période
 * est conservée dans le commentaire.
 */
function reinscrire(id, donnees) {
  donnees = donnees || {};
  var res = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var a = lireEnregistrement_(ss, ctx, 'Adherents', String(id || '').trim());
    if (!a.desinscrit && !a.deces) throw new Error(a.id + ' ' + nomComplet_(a) + ' est déjà un adhérent actif.');
    var date = texteVersIso_(donnees.date || '');
    if (!date) throw new Error('Saisissez une date de réinscription valide.');
    if (date > aujourdhuiIso_(ctx)) throw new Error('La date de réinscription ne peut pas être dans le futur.');
    var trace = 'Adhésion précédente du ' + isoVersFr_(a.dateInscription) + ' au ' + isoVersFr_(a.dateFin || a.dateDeces) +
      ' (' + (a.motifFin || (a.deces ? 'Décès' : 'motif non renseigné')) + ')';
    a.commentaire = a.commentaire ? a.commentaire + ' | ' + trace : trace;
    a.dateInscription = date;
    a.desinscrit = false; a.deces = false;
    a.dateFin = ''; a.motifFin = ''; a.dateDeces = '';
    if (donnees.type && LISTES.TYPE_ADH.indexOf(donnees.type) >= 0) a.type = donnees.type;
    ecrireEnregistrement_(ss, ctx, 'Adherents', a, 'Réinscription', 'Réinscription');
    return { id: a.id, message: 'Adhérent ' + a.id + ' (' + nomComplet_(a) + ') réinscrit le ' + isoVersFr_(date) + ' : de retour dans la liste des adhérents.' };
  });
  return reponse_(res.message, res.id);
}


/* =====================================================================
 *  RÈGLES MÉTIER : RECETTES, DÉPENSES, BUDGETS (lot 3)
 * ===================================================================== */

/** Message pour une recette / dépense créée par une automatisation (paiement, remboursement). */
function messageLigneAutomatique_(table, l) {
  var nom = table === 'Recettes' ? 'La recette' : 'La dépense';
  var source = l.echeanceId || l.sourceId;
  return nom + ' ' + l.id + ' a été créée automatiquement (' + l.origine + (source ? ', source ' + source : '') +
    ') : elle se modifie ou s\'annule depuis la rubrique Activités (case « Payé » ou « Rembourser »), jamais à la main, pour éviter une double saisie.';
}

/** Types de catégorie compatibles avec une recette ou une dépense. */
function typesCompatibles_(table) {
  return table === 'Recettes' ? ['Recette', 'Les deux'] : ['Dépense', 'Les deux'];
}

function reglesMouvement_(table, o, existants, mode) {
  var e = [];
  var existant = o.id ? (existants[table] || []).filter(function (x) { return x.id === o.id; })[0] : null;
  if (mode === 'Saisie') {
    if (existant && existant.origine && existant.origine !== 'Saisie manuelle') return [messageLigneAutomatique_(table, existant)];
    // une saisie manuelle reste manuelle : l'origine et la source ne se choisissent pas
    o.origine = 'Saisie manuelle';
    if (table === 'Recettes') o.echeanceId = ''; else o.sourceId = '';
  }
  if (o.sousCategorie && o.categorie) {
    var types = typesCompatibles_(table);
    var ok = (existants.Categories || []).some(function (c) {
      return c.categorie === o.categorie && normaliserEntete_(c.sousCategorie) === normaliserEntete_(o.sousCategorie) && types.indexOf(c.type) >= 0;
    });
    if (!ok) {
      e.push('Sous-catégorie « ' + o.sousCategorie + ' » inconnue pour « ' + o.categorie + ' » côté ' +
        (table === 'Recettes' ? 'recettes' : 'dépenses') + ' (voir Administration > Catégories).');
    }
  }
  if (!o.budgete) o.budgete = 'Budgété';
  return e;
}

/**
 * Enregistre en une fois les budgets prévisionnels d'une année.
 * montants = { 'Villégiatures': 12000, … } ; une case vide vaut 0 €.
 */
function enregistrerBudgets(annee, montants) {
  annee = Number(annee);
  montants = montants || {};
  if (!annee || annee < 2000 || annee > 2100) throw new Error('Année invalide.');
  var erreurs = [];
  var propres = {};
  Object.keys(montants).forEach(function (cat) {
    var v = montants[cat];
    var n = (v === '' || v === null || v === undefined) ? 0 : (typeof v === 'number' ? v : texteVersNombre_(v));
    if (isNaN(n) || n < 0) erreurs.push('« ' + cat + ' » : montant positif attendu.');
    else propres[cat] = Math.round(n * 100) / 100;
  });
  if (erreurs.length) throw new Error(erreurs.join('\n'));

  var bilan = avecVerrou_(function () {
    var ss = classeur_();
    var ctx = contexte_(ss);
    var cats = lireTable_(ss, 'Categories', [], ctx).map(function (c) { return c.categorie; });
    Object.keys(propres).forEach(function (c) {
      if (cats.indexOf(c) < 0) throw new Error('Catégorie « ' + c + ' » inconnue (voir Administration > Catégories).');
    });
    var existants = lireTable_(ss, 'Budgets', [], ctx).filter(function (b) { return Number(b.annee) === annee; });
    var crees = 0, modifies = 0, details = [];
    Object.keys(propres).forEach(function (cat) {
      var b = existants.filter(function (x) { return x.categorie === cat; })[0];
      if (b && Number(b.montant) === propres[cat]) return;
      if (!b && propres[cat] === 0) return;   // inutile de créer une ligne à 0 €
      var obj = b ? { id: b.id, annee: annee, categorie: cat, montant: propres[cat] } : { annee: annee, categorie: cat, montant: propres[cat] };
      ecrireEnregistrement_(ss, ctx, 'Budgets', obj, 'Budgets ' + annee, b ? 'Modification' : 'Création');
      if (b) modifies++; else crees++;
      details.push(cat + ' : ' + propres[cat] + ' €');
    });
    return { crees: crees, modifies: modifies, details: details };
  });
  var n = bilan.crees + bilan.modifies;
  return reponse_(n ? 'Budgets prévisionnels ' + annee + ' enregistrés (' + n + ' catégorie(s) mise(s) à jour).' :
    'Budgets prévisionnels ' + annee + ' : aucun changement.');
}


/**
 * Renommage d'une catégorie / sous-catégorie dans Administration :
 * le nouveau nom est reporté sur les activités, recettes, dépenses (et budgets)
 * qui utilisaient l'ancien — une seule saisie, aucune ligne orpheline.
 * Renvoie un complément de message (« 12 ligne(s) mises à jour »).
 */
function reporterRenommageCategorie_(ss, ctx, ancien, nouveau) {
  var memeCat = ancien.categorie === nouveau.categorie;
  var memeSous = normaliserEntete_(ancien.sousCategorie) === normaliserEntete_(nouveau.sousCategorie);
  if (memeCat && memeSous) return '';
  var restants = lireTable_(ss, 'Categories', [], ctx).filter(function (c) { return c.id !== ancien.id && c.categorie === ancien.categorie; });
  var total = 0;
  ['Activites', 'Recettes', 'Depenses', 'Budgets'].forEach(function (t) {
    var feuille = ss.getSheetByName(t);
    if (!feuille || feuille.getLastRow() < 2) return;
    var valeurs = feuille.getDataRange().getValues();
    var carte = carteColonnes_(valeurs[0], SCHEMA[t]);
    if (carte.categorie < 0) return;
    var aSous = carte.sousCategorie !== undefined && carte.sousCategorie >= 0;
    var change = false;
    for (var r = 1; r < valeurs.length; r++) {
      var cat = String(valeurs[r][carte.categorie]).trim();
      if (cat !== ancien.categorie) continue;
      var sous = aSous ? String(valeurs[r][carte.sousCategorie]).trim() : '';
      if (ancien.sousCategorie) {
        // renommage d'une sous-catégorie : seules les lignes qui l'utilisent changent
        if (!aSous || normaliserEntete_(sous) !== normaliserEntete_(ancien.sousCategorie)) continue;
        valeurs[r][carte.categorie] = nouveau.categorie;
        valeurs[r][carte.sousCategorie] = nouveau.sousCategorie;
      } else {
        // renommage d'une catégorie sans sous-catégorie : seulement si plus aucune ligne ne porte l'ancien nom
        if (memeCat || restants.length) continue;
        valeurs[r][carte.categorie] = nouveau.categorie;
      }
      change = true;
      total++;
    }
    if (change) feuille.getRange(1, 1, valeurs.length, valeurs[0].length).setValues(valeurs);
  });
  if (!total) return '';
  journaliser_(ss, 'Automatisation', 'Categories', nouveau.id, 'Renommage reporté sur ' + total + ' ligne(s) : « ' +
    ancien.categorie + (ancien.sousCategorie ? ' / ' + ancien.sousCategorie : '') + ' » → « ' + nouveau.categorie + (nouveau.sousCategorie ? ' / ' + nouveau.sousCategorie : '') + ' »');
  return ' Nouveau nom reporté sur ' + total + ' ligne(s) (activités, recettes, dépenses).';
}
