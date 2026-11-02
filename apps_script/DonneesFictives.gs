/**
 * =====================================================================
 *  DonneesFictives.gs — Jeu de données de départ et d'entraînement
 * =====================================================================
 *  Chargé par setup() UNIQUEMENT dans les onglets encore vides.
 *
 *  Lot 1 : Catégories (celles du bureau depuis le lot 6b), Budgets 2025-2026,
 *          prestataire permanent « Autre » (ajouté par setup()).
 *  Lot 2 : ≈ 230 adhérents, ≈ 15 activités 2025-2026, inscriptions,
 *          ≈ 20 locations de mobil-home — pour tester la rubrique Adhérents
 *          (indicateurs, historique, Participation Association).
 *  Lots 3-4 : prestataires, recettes, dépenses, échéances (cohérentes avec
 *          les inscriptions ci-dessous).
 *
 *  Le jeu est DÉTERMINISTE (générateur pseudo-aléatoire à graine fixe) :
 *  il est identique à chaque chargement, ce qui permet la réinitialisation
 *  des données d'entraînement (lot 6).
 *
 *  Toutes les personnes sont fictives. Les adresses e-mail utilisent les
 *  domaines réservés example.com / example.net / example.org, qui ne
 *  peuvent appartenir à personne.
 * =====================================================================
 */

function jeuDeDepart_() {
  var adherents = adherentsFictifs_();
  var activites = activitesFictives_(adherents);
  // Lot 5 : une activité à dates d'échéances personnalisées, dont une après l'activité (paiement étalé)
  activites.forEach(function (act) {
    if (act.nom === 'Repas de fin d\'année 2026') act.datesEcheances = '01/10/2026; 15/11/2026; 15/01/2027';
  });
  var inscriptions = inscriptionsFictives_(adherents, activites);
  var prestataires = prestatairesFictifs_();
  var mobilhome = mobilHomeFictif_(adherents);
  var depenses = depensesFictives_(adherents, activites, inscriptions, mobilhome, prestataires);
  var recettes = recettesFictives_(adherents, mobilhome, prestataires);
  var echeances = echeancesFictives_(adherents, activites, inscriptions, recettes, depenses);
  // identifiants explicites (REC-AAAA-0001…, DEP-AAAA-0001…) puis liens croisés
  attribuerIdsParDate_(recettes, 'REC');
  attribuerIdsParDate_(depenses, 'DEP');
  echeances.forEach(function (e) {
    if (e._recette) { e.recetteId = e._recette.id; e._recette.echeanceId = e.id; }
    if (e._remboursement) { e.remboursementId = e._remboursement.id; e._remboursement.echeanceId = e.id; }
    delete e._recette; delete e._remboursement;
  });
  activites.forEach(function (a) { delete a._genre; });
  mobilhome.forEach(function (m) {
    if (m._recette) { m.recetteId = m._recette.id; m._recette.echeanceId = m.id; }
    if (m._depense) { m.depenseId = m._depense.id; m._depense.sourceId = m.id; }
    delete m._recette; delete m._depense;
  });
  return {
    Categories: categoriesDeDepart_(),
    Budgets: budgetsDeDepart_(depenses),
    Adherents: adherents,
    Activites: activites,
    Inscriptions: inscriptions,
    Echeances: echeances,
    MobilHome: mobilhome,
    Prestataires: prestataires,
    Recettes: recettes,
    Depenses: depenses
  };
}

/** Trie par date et numérote par année : REC-2025-0001, REC-2025-0002… */
function attribuerIdsParDate_(lignes, prefixe) {
  lignes.sort(function (a, b) { return a.date.localeCompare(b.date) || String(a.libelle).localeCompare(String(b.libelle)); });
  var compteur = {};
  lignes.forEach(function (l) {
    var an = l.date.slice(0, 4);
    compteur[an] = (compteur[an] || 0) + 1;
    l.id = prefixe + '-' + an + '-' + ('000' + compteur[an]).slice(-4);
  });
}

/**
 * Catégories et sous-catégories du bureau (dossier budgétaire V5, octobre 2026), avec « ce qu'elle recouvre ».
 * Catégories 1 à 7 : dépenses ET recettes liées (participation des adhérents à une activité, un séjour…).
 * Catégorie 8 : recettes seulement (subvention, adhésions).
 * Ce ne sont PAS des données fictives : elles sont aussi chargées par la réinitialisation.
 */
var CATEGORIES_BUREAU_ = [
  ['1. Séjours et villégiatures', '1.1 Séjours 7j. et +', 'Transport, hébergement, visites ou prestations comprises dans le programme.'],
  ['1. Séjours et villégiatures', '1.2 Villégiature en mobil-home', 'Location et dépenses directement liées à cette formule ; aides ou subventions suivies séparément (recettes ou déduction) selon la méthode comptable retenue.'],
  ['1. Séjours et villégiatures', '1.3 Voyages d\'études', 'Déplacements organisés avec une dimension de découverte, de visite ou d\'apprentissage.'],
  ['2. Sorties et spectacles', '2.1 Spectacles, cabaret, théâtre et concerts', 'Billetterie, transport et frais directement associés à la sortie.'],
  ['2. Sorties et spectacles', '2.2 Visites et découvertes 1 journée', 'Visites culturelles, excursions, entrées, guides et transport liés à la journée.'],
  ['2. Sorties et spectacles', '2.3 Randonnées', 'Dépenses propres à l\'organisation des randonnées, lorsqu\'il y en a.'],
  ['3. Convivialité et fêtes', '3.1 Repas à thème', 'Repas organisés autour d\'un thème ou d\'un moment partagé.'],
  ['3. Convivialité et fêtes', '3.2 Journées printanières, barbecues', 'Achats, repas, location ou logistique spécifique à ces rendez-vous.'],
  ['3. Convivialité et fêtes', '3.3 Animations calendaires : galette, crêpes, Beaujolais', 'Dépenses des animations récurrentes liées au calendrier.'],
  ['4. Loisirs et animations', '4.1 Lotos', 'Lots, consommables et autres coûts d\'organisation du loto.'],
  ['4. Loisirs et animations', '4.2 Concours de boules, de pêche et autres', 'Matériel, inscriptions, récompenses et dépenses propres à chaque concours.'],
  ['4. Loisirs et animations', '4.3 Retransmissions sportives ou autres au club', 'Dépenses spécifiquement engagées pour organiser ces moments au club.'],
  ['5. Culture, créativité et bien-être', '5.1 Ateliers créatifs, relaxation, chant', 'Matériel, intervenants et frais liés aux séances.'],
  ['5. Culture, créativité et bien-être', '5.2 Conférences', 'Intervenants, supports et frais d\'organisation des conférences.'],
  ['6. Informatique et apprentissages', '6.1 Ateliers informatiques', 'Intervenants, supports et petits équipements directement liés aux ateliers.'],
  ['6. Informatique et apprentissages', '6.2 Prévention : gestes qui sauvent', 'Formation, encadrement et matériel pédagogique liés aux séances de prévention.'],
  ['6. Informatique et apprentissages', '6.3 Autres...', 'Autres activités d\'apprentissage ou d\'initiation, à préciser dans le libellé de la dépense.'],
  ['7. Fonctionnement association', '7.1 Gouvernance associative', 'Préparation et tenue de l\'assemblée générale et des instances de gouvernance.'],
  ['7. Fonctionnement association', '7.2 Gestion administrative et financière', 'Frais bancaires (Crédit Mutuel), assurances (MAIF), études et développement de nos outils (la maintenance informatique est en 7.7).'],
  ['7. Fonctionnement association', '7.3 Communication et information', 'Le Maillon : imprimerie, affranchissement, enveloppes, timbres et fournitures de communication.'],
  ['7. Fonctionnement association', '7.4 Gestion des adhérents', 'Fleurs pour décès ou autres circonstances ; cadeaux divers (tombola, départs du CA, etc.).'],
  ['7. Fonctionnement association', '7.5 Local et logistique', 'Intendance et équipements du club.'],
  ['7. Fonctionnement association', '7.6 Administration courante (fonctionnement)', 'Repas d\'étude et d\'animation du CA, fournitures de bureau, photos, vidéos et dépenses diverses à expliciter.'],
  ['7. Fonctionnement association', '7.7 Services et outils informatiques', 'Logiciel Zoom, abonnement Adobe, maintenance informatique.'],
  ['8. Subvention et Adhésions', '8.1 Subvention', 'Subventions reçues (commune, département, autres organismes).', 'Recette'],
  ['8. Subvention et Adhésions', '8.2 Adhésion', 'Cotisations annuelles des adhérents.', 'Recette'],
  ['8. Subvention et Adhésions', '8.3 Dons', 'Dons reçus des adhérents ou d\'autres personnes (dons ponctuels, legs).', 'Recette']
];

function categoriesDeDepart_() {
  return CATEGORIES_BUREAU_.map(function (c) {
    return { categorie: c[0], sousCategorie: c[1], type: c[3] || 'Les deux', descriptif: c[2] };
  });
}

/**
 * Budgets prévisionnels 2025 et 2026 calés sur les dépenses d'entraînement :
 * en 2025 certaines catégories sont dépassées, d'autres non ; 2026 = 2025 + 4 % en général
 * (davantage pour les sorties et les villégiatures, plus nombreuses en 2026).
 */
function budgetsDeDepart_(depenses) {
  var evolution2026 = { '1. Séjours et villégiatures': 1.08, '2. Sorties et spectacles': 1.9 };
  var facteurs = { '1. Séjours et villégiatures': 1.03, '2. Sorties et spectacles': 1.08, '3. Convivialité et fêtes': 0.96,
                   '4. Loisirs et animations': 1.0, '5. Culture, créativité et bien-être': 1.0, '6. Informatique et apprentissages': 1.12,
                   '7. Fonctionnement association': 0.98 };
  var lignes = [];
  CATEGORIES_BUDGET.forEach(function (cat) {
    var depense2025 = (depenses || []).filter(function (d) {
      return d.categorie === cat && d.budgete === 'Budgété' && d.date.slice(0, 4) === '2025';
    }).reduce(function (s, d) { return s + d.montant; }, 0);
    var b2025 = Math.max(300, Math.round(depense2025 * facteurs[cat] / 100) * 100);
    lignes.push({ annee: 2025, categorie: cat, montant: b2025 });
    lignes.push({ annee: 2026, categorie: cat, montant: Math.round(b2025 * (evolution2026[cat] || 1.04) / 100) * 100 });
  });
  return lignes;
}

/* ---------------------------------------------------------------------
 * Générateur pseudo-aléatoire déterministe (mulberry32)
 * ------------------------------------------------------------------- */
function hasard_(graine) {
  var a = graine >>> 0;
  var f = function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.entier = function (min, max) { return min + Math.floor(f() * (max - min + 1)); };
  f.choix = function (liste) { return liste[Math.floor(f() * liste.length)]; };
  f.oui = function (proba) { return f() < proba; };
  return f;
}

function isoFictif_(a, m, j) {
  return a + '-' + (m < 10 ? '0' : '') + m + '-' + (j < 10 ? '0' : '') + j;
}

function sansAccentsMail_(s) {
  return sansAccents_(s).toLowerCase().replace(/[^a-z]+/g, '');
}

var NOMS_FICTIFS_ = ['MARTIN', 'BERNARD', 'THOMAS', 'PETIT', 'ROBERT', 'RICHARD', 'DURAND', 'DUBOIS', 'MOREAU', 'LAURENT',
  'SIMON', 'MICHEL', 'LEFEBVRE', 'LEROY', 'ROUX', 'DAVID', 'BERTRAND', 'MOREL', 'FOURNIER', 'GIRARD', 'BONNET', 'DUPONT',
  'LAMBERT', 'FONTAINE', 'ROUSSEAU', 'VINCENT', 'MULLER', 'LEFEVRE', 'FAURE', 'ANDRE', 'MERCIER', 'BLANC', 'GUERIN',
  'BOYER', 'GARNIER', 'CHEVALIER', 'FRANCOIS', 'LEGRAND', 'GAUTHIER', 'GARCIA', 'PERRIN', 'ROBIN', 'CLEMENT', 'MORIN',
  'NICOLAS', 'HENRY', 'ROUSSEL', 'MATHIEU', 'GAUTIER', 'MASSON', 'MARCHAND', 'DUVAL', 'DENIS', 'DUMONT', 'MARIE',
  'LEMAIRE', 'NOEL', 'MEYER', 'DUFOUR', 'MEUNIER', 'BRUN', 'BLANCHARD', 'GIRAUD', 'JOLY', 'RIVIERE', 'LUCAS', 'BRUNET',
  'GAILLARD', 'BARBIER', 'ARNAUD', 'MARTINEZ', 'GERARD', 'ROCHE', 'RENARD', 'SCHMITT', 'ROY', 'LEROUX', 'COLIN',
  'VIDAL', 'CARON', 'PICARD', 'ROGER', 'FABRE', 'AUBERT', 'LEMOINE', 'RENAUD', 'DUMAS', 'LACROIX', 'OLIVIER', 'PHILIPPE'];
var PRENOMS_F_ = ['Marie', 'Monique', 'Françoise', 'Nicole', 'Catherine', 'Jacqueline', 'Sylvie', 'Christiane', 'Martine',
  'Brigitte', 'Danielle', 'Annie', 'Michèle', 'Chantal', 'Josiane', 'Colette', 'Odile', 'Yvette', 'Simone', 'Denise',
  'Hélène', 'Isabelle', 'Évelyne', 'Geneviève', 'Claudine', 'Régine', 'Marie-Claire', 'Bernadette', 'Paulette', 'Arlette',
  'Huguette', 'Dominique', 'Anne', 'Nadine', 'Élisabeth', 'Ginette', 'Jeanne', 'Lucienne', 'Suzanne', 'Thérèse'];
var PRENOMS_H_ = ['Jean', 'Michel', 'Pierre', 'Alain', 'Bernard', 'Jacques', 'Gérard', 'Daniel', 'Claude', 'Patrick',
  'Christian', 'André', 'Philippe', 'Jean-Pierre', 'René', 'Robert', 'Roger', 'Marcel', 'Guy', 'Serge', 'Gilles', 'Yves',
  'Jean-Claude', 'Jean-Paul', 'Dominique', 'Henri', 'Louis', 'Georges', 'Maurice', 'Raymond', 'Francis', 'Didier',
  'Joël', 'Thierry', 'Jean-Louis', 'Lucien', 'Paul', 'Hubert', 'Roland', 'Bruno'];
var VILLES_IDF_ = [['91160', 'Saulx-les-Chartreux'], ['91160', 'Champlan'], ['91300', 'Massy'], ['91120', 'Palaiseau'],
  ['91140', 'Villebon-sur-Yvette'], ['91940', 'Les Ulis'], ['91400', 'Orsay'], ['91460', 'Marcoussis'],
  ['91620', 'La Ville-du-Bois'], ['91310', 'Montlhéry'], ['91700', 'Sainte-Geneviève-des-Bois'], ['91250', 'Saint-Germain-lès-Corbeil'],
  ['91000', 'Évry-Courcouronnes'], ['91200', 'Athis-Mons'], ['91600', 'Savigny-sur-Orge'], ['91190', 'Gif-sur-Yvette'],
  ['91430', 'Igny'], ['91370', 'Verrières-le-Buisson'], ['92160', 'Antony'], ['92290', 'Châtenay-Malabry'],
  ['92330', 'Sceaux'], ['94260', 'Fresnes'], ['94550', 'Chevilly-Larue'], ['75014', 'Paris'], ['75015', 'Paris'],
  ['75013', 'Paris'], ['78140', 'Vélizy-Villacoublay'], ['77300', 'Fontainebleau'], ['93100', 'Montreuil'], ['95000', 'Cergy']];
var VILLES_PROVINCE_ = [['45000', 'Orléans'], ['28000', 'Chartres'], ['37000', 'Tours'], ['44000', 'Nantes'], ['35000', 'Rennes'],
  ['14000', 'Caen'], ['76000', 'Rouen'], ['59000', 'Lille'], ['51100', 'Reims'], ['21000', 'Dijon'], ['69003', 'Lyon'],
  ['42000', 'Saint-Étienne'], ['38000', 'Grenoble'], ['13008', 'Marseille'], ['06000', 'Nice'], ['34000', 'Montpellier'],
  ['31000', 'Toulouse'], ['33000', 'Bordeaux'], ['64200', 'Biarritz'], ['17000', 'La Rochelle'], ['29200', 'Brest'],
  ['56000', 'Vannes'], ['85000', 'La Roche-sur-Yon'], ['87000', 'Limoges'], ['63000', 'Clermont-Ferrand'], ['41000', 'Blois']];
var RUES_ = ['rue de la Mairie', 'rue des Écoles', 'avenue de la République', 'rue Victor Hugo', 'allée des Tilleuls',
  'rue Pasteur', 'chemin des Vignes', 'rue du Moulin', 'impasse des Lilas', 'rue Jean Jaurès', 'boulevard Gambetta',
  'rue de la Gare', 'place de l\'Église', 'rue des Peupliers', 'avenue du Général de Gaulle', 'rue des Rosiers',
  'rue de Paris', 'allée des Chênes', 'rue du Stade', 'rue des Acacias'];

/** Téléphone fictif « 06 12 34 56 78 ». */
function telFictif_(h, prefixe) {
  var t = prefixe;
  for (var i = 0; i < 4; i++) t += ' ' + (h.entier(10, 99));
  return t;
}

/**
 * ≈ 230 adhérents fictifs, cohérents sur 2025 et 2026 :
 * titulaires / sympathisants, hommes / femmes, Île-de-France / province,
 * tous âges dont des plus de 80 et 85 ans, couples rattachés,
 * nouveaux arrivants 2025 et 2026, décès et désinscriptions.
 */
function adherentsFictifs_() {
  var h = hasard_(20261012);
  var NB = 232;
  // tranches d'âge (au 31/12/2026) : proportions proches du POC
  var tranches = [[45, 59, 0.06], [60, 69, 0.23], [70, 74, 0.27], [75, 79, 0.23], [80, 84, 0.14], [85, 94, 0.07]];
  function ageTire() {
    var x = h(), cumul = 0;
    for (var i = 0; i < tranches.length; i++) {
      cumul += tranches[i][2];
      if (x < cumul) return h.entier(tranches[i][0], tranches[i][1]);
    }
    return h.entier(70, 79);
  }
  function domaine() { return h.choix(['example.com', 'example.net', 'example.org']); }
  function emailDe(prenom, nom) {
    var p = sansAccentsMail_(prenom), n = sansAccentsMail_(nom);
    var forme = h.entier(0, 3);
    var local = forme === 0 ? p + '.' + n : forme === 1 ? p.charAt(0) + '.' + n : forme === 2 ? p + n : n + '.' + p;
    return local + (h.oui(0.2) ? h.entier(1, 99) : '') + '@' + domaine();
  }

  var liste = [];
  for (var i = 0; i < NB; i++) {
    var conjointDe = (i > 0 && liste[i - 1].estPremierDuCouple) ? liste[i - 1] : null;
    var sexe, nom, adresse, cp, ville, age, dateInscription, type;
    if (conjointDe) {
      sexe = conjointDe.sexe === 'F' ? 'H' : 'F';
      nom = h.oui(0.85) ? conjointDe.nom : h.choix(NOMS_FICTIFS_);
      adresse = conjointDe.adresse; cp = conjointDe.codePostal; ville = conjointDe.ville;
      age = Math.max(45, conjointDe._age + h.entier(-5, 4));
      dateInscription = conjointDe.dateInscription;
      type = h.oui(0.55) ? 'Sympathisant' : 'Titulaire';
    } else {
      sexe = h.oui(0.56) ? 'F' : 'H';
      nom = h.choix(NOMS_FICTIFS_);
      var idf = h.oui(0.72);
      var lieu = h.choix(idf ? VILLES_IDF_ : VILLES_PROVINCE_);
      cp = lieu[0]; ville = lieu[1];
      adresse = h.entier(1, 148) + (h.oui(0.08) ? ' bis' : '') + ' ' + h.choix(RUES_);
      age = ageTire();
      // ancienneté : de 1996 à 2024 (les nouveaux 2025-2026 sont ajoutés plus bas)
      dateInscription = isoFictif_(h.entier(1996, 2024), h.entier(1, 12), h.entier(1, 28));
      type = h.oui(0.88) ? 'Titulaire' : 'Sympathisant';
    }
    var prenom = h.choix(sexe === 'F' ? PRENOMS_F_ : PRENOMS_H_);
    var anneeNaissance = 2026 - age;
    var naissance = isoFictif_(anneeNaissance, h.entier(1, 12), h.entier(1, 28));
    // on adhère au plus tôt vers 35 ans
    if (Number(dateInscription.slice(0, 4)) < anneeNaissance + 35) {
      dateInscription = Math.min(anneeNaissance + 35, 2024) + dateInscription.slice(4);
    }
    var idfAdresse = /^(75|77|78|91|92|93|94|95)/.test(cp);
    var a = {
      id: 'ADH-' + ('000' + (i + 1)).slice(-4),
      civilite: sexe === 'F' ? 'Mme' : 'M.',
      sexe: sexe, nom: nom, prenom: prenom, dateNaissance: naissance, type: type,
      adresse: adresse, complementAdresse: h.oui(0.1) ? h.choix(['Bâtiment B', 'Résidence Les Pins', 'Appartement 12', 'Escalier 2', 'Lieu-dit Les Bruyères']) : '',
      codePostal: cp, ville: ville,
      mobile: h.oui(0.82) ? telFictif_(h, h.oui(0.85) ? '06' : '07') : '',
      telFixe: h.oui(0.42) ? telFictif_(h, idfAdresse ? '01' : h.choix(['02', '03', '04', '05'])) : '',
      email: h.oui(0.86) ? emailDe(prenom, nom) : '',
      dateInscription: dateInscription,
      cotisation: h.oui(0.84) ? 15 : h.choix([20, 20, 25, 30, 50]),
      abonneFacebook: h.oui(0.3),
      recoitMaillon: h.oui(0.87),
      rattacheA: conjointDe ? conjointDe.id : '',
      neRienEnvoyer: h.oui(0.03),
      deces: false, dateDeces: '', desinscrit: false, dateFin: '', motifFin: '', commentaire: '',
      _age: age,
      estPremierDuCouple: !conjointDe && h.oui(0.14)
    };
    a.email2 = a.email && h.oui(0.1) ? emailDe(prenom, nom) : '';
    if (!a.email && !a.mobile && !a.telFixe) a.telFixe = telFictif_(h, idfAdresse ? '01' : '02');
    liste.push(a);
  }

  // Nouveaux arrivants : 12 en 2025, 13 en 2026 (personnes seules, en fin de liste)
  var seuls = liste.filter(function (a) { return !a.rattacheA && !a.estPremierDuCouple; });
  seuls.slice(-25).forEach(function (a, k) {
    a.dateInscription = k < 12 ? isoFictif_(2025, h.entier(1, 12), h.entier(1, 28)) : isoFictif_(2026, h.entier(1, 9), h.entier(1, 28));
    if (h.oui(0.5)) a.commentaire = 'Venu(e) par le bouche-à-oreille';
  });

  // Fins d'adhésion parmi les adhérents plus anciens (inscrits avant 2024)
  var anciens = liste.filter(function (a) { return a.dateInscription < '2024-01-01' && !a.rattacheA && !a.estPremierDuCouple; });
  var pris = {};
  function prendre(filtre) {
    var c = anciens.filter(function (a) { return !pris[a.id] && filtre(a); });
    var a = c[Math.floor(h() * c.length)];
    pris[a.id] = true;
    return a;
  }
  // décès : 2 en 2025, 3 en 2026 (personnes âgées)
  [['2025', 3, 11], ['2025', 9, 4], ['2026', 2, 14], ['2026', 5, 28], ['2026', 8, 3]].forEach(function (d) {
    var a = prendre(function (x) { return x._age >= 80; });
    a.deces = true; a.dateDeces = isoFictif_(Number(d[0]), d[1], d[2]);
    a.dateFin = a.dateDeces; a.motifFin = 'Décès';
  });
  // désinscriptions : 2 en 2024 (archives anciennes), 4 en 2025, 5 en 2026
  [[2024, 6, 30, 'Non renouvellement'], [2024, 11, 15, 'Déménagement'],
   [2025, 1, 31, 'Non renouvellement'], [2025, 4, 10, 'Santé'], [2025, 7, 1, 'Déménagement'], [2025, 12, 31, 'Non renouvellement'],
   [2026, 1, 15, 'Déménagement'], [2026, 3, 2, 'Non renouvellement'], [2026, 4, 10, 'Santé'], [2026, 6, 22, 'Déménagement'], [2026, 7, 7, 'Autre']
  ].forEach(function (d) {
    var a = prendre(function () { return true; });
    a.desinscrit = true; a.dateFin = isoFictif_(d[0], d[1], d[2]); a.motifFin = d[3];
    if (d[3] === 'Autre') a.commentaire = 'Souhaite rester informé(e) des grands événements';
  });

  // Lot 4b : carrière JMB et préférence « tout par mail ». Tirage séparé (graine propre) :
  // le reste du jeu fictif reste identique à celui du lot 4.
  var hj = hasard_(1978);
  liste.forEach(function (a) {
    var nais = Number(String(a.dateNaissance).slice(0, 4));
    if (nais && a.type === 'Titulaire' && hj.oui(0.85)) {
      a.anneeEntreeJMB = Math.min(2015, nais + hj.entier(19, 32));
      var sortie = Math.max(a.anneeEntreeJMB + 3, nais + hj.entier(57, 63));
      a.dateSortieJMB = sortie <= 2025 ? isoFictif_(sortie, hj.entier(1, 12), hj.entier(1, 28)) : '';
    } else {
      a.anneeEntreeJMB = ''; a.dateSortieJMB = '';
    }
    a.toutParMail = !!a.email && hj.oui(a.recoitMaillon ? 0.15 : 0.8);
  });

  liste.forEach(function (a) { delete a._age; delete a.estPremierDuCouple; });
  return liste;
}

/** Adhérent actif à une date (inscrit avant, pas encore parti). */
function actifALaDate_(a, iso) {
  return a.dateInscription <= iso && (!a.dateFin || a.dateFin >= iso);
}

/**
 * ≈ 15 activités 2025-2026 dans les catégories du bureau.
 * « genre » (fete, ag, sortie, sejour, atelier, formation) décide des dépenses fictives générées ; il n'est pas enregistré.
 * coût réel par personne, prix demandé et participation de l'association cohérents.
 */
function activitesFictives_(adherents) {
  var h = hasard_(4242);
  var organisateurs = adherents.filter(function (a) { return a.type === 'Titulaire' && !a.dateFin && a.dateInscription < '2020-01-01'; });
  // [nom, catégorie, sous-catégorie, début, fin, lieu, max, coût réel/pers, prix/pers, échéances, statut, genre]
  var defs = [
    ['Galette des rois 2025', '3. Convivialité et fêtes', '3.3 Animations calendaires : galette, crêpes, Beaujolais', '2025-01-18', '', 'Salle polyvalente, Saulx-les-Chartreux', 80, 12, 5, 1, 'Terminé', 'fete'],
    ['Visite du château de Fontainebleau', '2. Sorties et spectacles', '2.2 Visites et découvertes 1 journée', '2025-03-22', '', 'Fontainebleau (77)', 45, 48, 25, 1, 'Terminé', 'sortie'],
    ['Assemblée générale 2025', '7. Fonctionnement association', '7.1 Gouvernance associative', '2025-04-05', '', 'Salle polyvalente, Saulx-les-Chartreux', 120, 18, 0, 1, 'Terminé', 'ag'],
    ['Atelier peinture — printemps 2025', '5. Culture, créativité et bien-être', '5.1 Ateliers créatifs, relaxation, chant', '2025-03-03', '2025-06-23', 'Maison des associations', 15, 60, 20, 2, 'Terminé', 'atelier'],
    ['Séjour en Bretagne', '1. Séjours et villégiatures', '1.1 Séjours 7j. et +', '2025-06-14', '2025-06-20', 'Carnac (56)', 30, 520, 360, 3, 'Terminé', 'sejour'],
    ['Formation tablette et smartphone', '6. Informatique et apprentissages', '6.1 Ateliers informatiques', '2025-10-07', '2025-10-28', 'Médiathèque', 12, 40, 10, 1, 'Terminé', 'formation'],
    ['Repas de fin d\'année 2025', '3. Convivialité et fêtes', '3.1 Repas à thème', '2025-12-13', '', 'Restaurant Le Relais, Massy', 90, 52, 30, 1, 'Terminé', 'fete'],
    ['Galette des rois 2026', '3. Convivialité et fêtes', '3.3 Animations calendaires : galette, crêpes, Beaujolais', '2026-01-17', '', 'Salle polyvalente, Saulx-les-Chartreux', 80, 12, 5, 1, 'Terminé', 'fete'],
    ['Chorale — saison 2026', '5. Culture, créativité et bien-être', '5.1 Ateliers créatifs, relaxation, chant', '2026-01-12', '2026-06-29', 'Maison des associations', 25, 30, 0, 1, 'Terminé', 'atelier'],
    ['Assemblée générale 2026', '7. Fonctionnement association', '7.1 Gouvernance associative', '2026-03-28', '', 'Salle polyvalente, Saulx-les-Chartreux', 120, 18, 0, 1, 'Terminé', 'ag'],
    ['Croisière sur la Seine', '2. Sorties et spectacles', '2.2 Visites et découvertes 1 journée', '2026-05-16', '', 'Paris (75)', 50, 65, 35, 2, 'Terminé', 'sortie'],
    ['Séjour dans le Jura', '1. Séjours et villégiatures', '1.1 Séjours 7j. et +', '2026-09-12', '2026-09-18', 'Les Rousses (39)', 30, 560, 390, 3, 'Terminé', 'sejour'],
    ['Premiers secours (PSC1)', '6. Informatique et apprentissages', '6.2 Prévention : gestes qui sauvent', '2026-10-17', '', 'Caserne des pompiers, Massy', 12, 60, 0, 1, 'Ouvert aux inscriptions', 'formation'],
    ['Visite du zoo de Thoiry', '2. Sorties et spectacles', '2.2 Visites et découvertes 1 journée', '2026-11-07', '', 'Thoiry (78)', 50, 58, 30, 2, 'Ouvert aux inscriptions', 'sortie'],
    ['Repas de fin d\'année 2026', '3. Convivialité et fêtes', '3.1 Repas à thème', '2026-12-12', '', 'Restaurant Le Relais, Massy', 90, 54, 30, 3, 'Ouvert aux inscriptions', 'fete']
  ];
  var compteur = {};
  return defs.map(function (d) {
    var cout = d[7], prix = d[8];
    var part = cout - prix;
    var annee = d[3].slice(0, 4);
    compteur[annee] = (compteur[annee] || 0) + 1;
    return {
      id: 'ACT-' + annee + '-' + ('00' + compteur[annee]).slice(-3),
      nom: d[0], categorie: d[1], sousCategorie: d[2], dateDebut: d[3], dateFin: d[4], lieu: d[5],
      organisateur: h.choix(organisateurs).id,
      descriptif: 'Activité fictive pour l\'entraînement.',
      maxParticipants: d[6], budgetPrevu: cout * Math.round(d[6] * 0.8), prixParPersonne: prix,
      coutReelParPersonne: cout, participationEuro: part, participationPct: Math.round(100 * part / cout),
      nbEcheances: d[9], notification: true, statut: d[10], _genre: d[11]
    };
  });
}

/** Inscriptions : adhérents actifs à la date de l'activité, dans la limite du maximum. */
function inscriptionsFictives_(adherents, activites) {
  var h = hasard_(777);
  var lignes = [];
  activites.forEach(function (act) {
    var idAct = act.id;
    var futur = act.statut === 'Ouvert aux inscriptions';
    var taux = futur ? 0.45 : (act._genre === 'fete' || act._genre === 'ag' ? 0.85 : 0.75);
    var nb = Math.round(act.maxParticipants * taux);
    var candidats = adherents.filter(function (a) { return actifALaDate_(a, act.dateDebut); });
    // tirage sans remise
    var choisis = [];
    var pool = candidats.slice();
    while (choisis.length < nb && pool.length) choisis.push(pool.splice(Math.floor(h() * pool.length), 1)[0]);
    choisis.forEach(function (a) {
      var j = isoVersDate_(act.dateDebut);
      j.setDate(j.getDate() - h.entier(10, 60));
      var dateIns = isoFictif_(j.getFullYear(), j.getMonth() + 1, j.getDate());
      // on ne s'inscrit pas dans le futur : inscriptions aux activités à venir au plus tard le 09/10/2026
      if (dateIns > LIMITE_FICTIVE_) dateIns = decalerIso_(LIMITE_FICTIVE_, -h.entier(0, 40));
      // le jeu d'entraînement commence en 2025 : pas d'inscription (ni de paiement) en 2024
      if (dateIns < '2025-01-02') dateIns = '2025-01-02';
      if (dateIns < a.dateInscription) dateIns = a.dateInscription;
      lignes.push({ id: 'INS-' + ('0000' + (lignes.length + 1)).slice(-5), activiteId: idAct, adherentId: a.id, dateInscription: dateIns,
                    statut: h.oui(0.04) ? 'Désinscrit' : 'Inscrit', montantDu: act.prixParPersonne });
    });
  });
  return lignes;
}

/** ≈ 20 locations de mobil-home (titulaires, 2 aides de 60 € maximum par an). */
function mobilHomeFictif_(adherents) {
  var h = hasard_(6060);
  var lignes = [];
  [[2025, 8], [2026, 12]].forEach(function (x) {
    var annee = x[0];
    var titulaires = adherents.filter(function (a) { return a.type === 'Titulaire' && actifALaDate_(a, annee + '-07-01'); });
    var aides = {};
    for (var i = 0; i < x[1]; i++) {
      // un titulaire sur trois loue deux semaines
      var a = (i > 0 && h.oui(0.3)) ? adherents.filter(function (z) { return z.id === lignes[lignes.length - 1].adherentId; })[0] : h.choix(titulaires);
      aides[a.id] = (aides[a.id] || 0) + 1;
      var cout = h.choix([380, 420, 450, 480]);
      var aide = aides[a.id] <= 2 ? 60 : 0;
      var jour = isoVersDate_(annee + '-06-06');
      jour.setDate(jour.getDate() + 7 * h.entier(0, 12));
      lignes.push({ id: 'MH-' + ('000' + (lignes.length + 1)).slice(-4), adherentId: a.id, annee: annee,
                    semaine: isoFictif_(jour.getFullYear(), jour.getMonth() + 1, jour.getDate()),
                    coutLocation: cout, aideAsso: aide, montantPayeAdherent: cout - aide,
                    campingId: h.oui(0.6) ? 'PRE-005' : 'PRE-013', depenseId: '', recetteId: '' });
    }
  });
  return lignes;
}


/* =====================================================================
 *  LOT 3 : prestataires, dépenses, recettes
 * ===================================================================== */

/** Toutes les dépenses et recettes fictives sont antérieures à cette date. */
var LIMITE_FICTIVE_ = '2026-10-09';

var PRE_ = { car1: 'PRE-001', car2: 'PRE-002', resto: 'PRE-003', traiteur: 'PRE-004', camping: 'PRE-005',
             vacances: 'PRE-006', imprimerie: 'PRE-007', assurance: 'PRE-008', papeterie: 'PRE-009',
             formation: 'PRE-010', atelier: 'PRE-011', billetterie: 'PRE-012' };

/** 13 prestataires fictifs (noms inventés, dont 2 campings) + l'entrée permanente « Autre ». */
function prestatairesFictifs_() {
  var d = [
    ['PRE-001', 'Cars Hurepoix Évasion', 'Transport', '12 rue des Artisans', '91160', 'Champlan', 'M. Morel', '01 60 11 22 33', 'reservation@example.com', '2012-03-01'],
    ['PRE-002', 'Autocars Val d\'Yvette', 'Transport', '5 avenue de l\'Industrie', '91940', 'Les Ulis', 'Mme Garnier', '01 69 22 33 44', 'contact@example.net', '2019-09-15'],
    ['PRE-003', 'Restaurant Le Relais Fleuri', 'Restauration / traiteur', '48 rue de Paris', '91300', 'Massy', 'M. Lambert', '01 64 33 44 55', 'relais.fleuri@example.org', '2015-11-20'],
    ['PRE-004', 'Traiteur Les Saveurs du Moulin', 'Restauration / traiteur', '3 chemin du Moulin', '91160', 'Saulx-les-Chartreux', 'Mme Roux', '01 69 44 55 66', 'saveurs.moulin@example.com', '2017-01-10'],
    ['PRE-005', 'Camping Les Pins Bleus', 'Hébergement / mobil-home', 'Route de la Plage', '85160', 'Saint-Jean-de-Monts', 'Accueil', '02 51 55 66 77', 'pins.bleus@example.net', '2010-04-01'],
    ['PRE-006', 'Résidence de vacances Les Embruns', 'Hébergement / mobil-home', '1 promenade des Embruns', '56340', 'Carnac', 'Service groupes', '02 97 66 77 88', 'groupes@example.org', '2021-02-01'],
    ['PRE-007', 'Imprimerie du Val Fleuri', 'Impression / communication', '27 rue Gutenberg', '91120', 'Palaiseau', 'M. Fontaine', '01 60 77 88 99', 'devis@example.com', '2008-06-01'],
    ['PRE-008', 'Mutuelle Assoc\'Prévoyance', 'Assurance', '10 boulevard des Assureurs', '75015', 'Paris', 'Conseiller associations', '01 45 88 99 00', 'associations@example.net', '2005-01-01'],
    ['PRE-009', 'Papeterie des Chartreux', 'Fournitures / matériel', '2 place de la Mairie', '91160', 'Saulx-les-Chartreux', 'Mme Dumas', '01 69 99 00 11', 'papeterie@example.org', '2014-09-01'],
    ['PRE-010', 'Clic & Seniors Formation', 'Animation / intervenant', '14 rue des Écoles', '91400', 'Orsay', 'M. Noël', '06 12 00 11 22', 'formation@example.com', '2023-09-01'],
    ['PRE-011', 'Atelier Couleurs Vives', 'Animation / intervenant', '7 impasse des Peintres', '91190', 'Gif-sur-Yvette', 'Mme Picard', '06 23 11 22 33', 'couleurs.vives@example.net', '2018-02-01'],
    ['PRE-012', 'Billetterie Patrimoine & Loisirs', 'Animation / intervenant', '33 quai des Visites', '75004', 'Paris', 'Service groupes', '01 42 22 33 44', 'groupes.patrimoine@example.org', '2016-05-01'],
    ['PRE-013', 'Camping La Clairière', 'Hébergement / mobil-home', 'Chemin des Gorges', '07150', 'Vallon-Pont-d\'Arc', 'Accueil', '04 75 11 22 33', 'clairiere@example.com', '2024-01-15']
  ];
  return d.map(function (x) {
    return { id: x[0], raisonSociale: x[1], activite: x[2], adresse: x[3], codePostal: x[4], ville: x[5], contact: x[6],
             telephone: x[7], email: x[8], siteWeb: '', siret: '', dateDebutRelation: x[9], commentaire: 'Prestataire fictif (entraînement).' };
  });
}

function decalerIso_(iso, jours) {
  var d = isoVersDate_(iso);
  d.setDate(d.getDate() + jours);
  return isoFictif_(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function arrondi2_(n) { return Math.round(n * 100) / 100; }

/** Dépenses : prestations des activités, frais fixes, mobil-home et quelques dépenses hors budget. */
function depensesFictives_(adherents, activites, inscriptions, mobilhome, prestataires) {
  var h = hasard_(3030);
  var lignes = [];
  function ajouter(date, libelle, montant, categorie, sousCategorie, prestataire, activiteId, budgete) {
    if (date > LIMITE_FICTIVE_ || montant <= 0) return null;
    var l = { date: date, libelle: libelle, montant: arrondi2_(montant), categorie: categorie, sousCategorie: sousCategorie,
              prestataireId: prestataire || '', activiteId: activiteId || '', budgete: budgete || 'Budgété', origine: 'Saisie manuelle', sourceId: '',
              modePaiement: prestataire === '' ? 'Prélèvement' : h.choix(['Virement', 'Virement', 'Chèque', 'Carte bancaire']), justificatif: '', commentaire: '' };
    lignes.push(l);
    return l;
  }

  // 1. Prestations liées aux activités : coût réel par personne × nombre d'inscrits
  activites.forEach(function (act) {
    var nb = inscriptions.filter(function (i) { return i.activiteId === act.id && i.statut === 'Inscrit'; }).length;
    var total = act.coutReelParPersonne * nb;
    var d0 = act.dateDebut, c = act.categorie, sc = act.sousCategorie, id = act.id, g = act._genre;
    if (g === 'fete' || g === 'ag') {
      if (/Galette/.test(act.nom)) {
        ajouter(d0, 'Galettes et boissons — ' + act.nom, total, c, sc, PRE_.traiteur, id);
      } else if (/Assemblée/.test(act.nom)) {
        ajouter(d0, 'Buffet de l\'AG — ' + act.nom, total * 0.8, c, sc, PRE_.traiteur, id);
        ajouter(decalerIso_(d0, -20), 'Location salle et sonorisation — ' + act.nom, total * 0.2, c, sc, ID_PRESTATAIRE_AUTRE, id);
      } else {
        ajouter(decalerIso_(d0, -45), 'Acompte 30 % repas — ' + act.nom, total * 0.3, c, sc, PRE_.resto, id);
        ajouter(d0, 'Solde repas — ' + act.nom, total * 0.7, c, sc, PRE_.resto, id);
      }
    } else if (g === 'sortie') {
      var car = h.oui(0.5) ? PRE_.car1 : PRE_.car2;
      if (/Croisière/.test(act.nom)) {
        ajouter(decalerIso_(d0, -20), 'Billets croisière — ' + act.nom, total, c, sc, PRE_.billetterie, id);
      } else if (d0 > LIMITE_FICTIVE_) {
        ajouter(decalerIso_(d0, -37), 'Acompte 30 % billetterie — ' + act.nom, total * 0.6 * 0.3, c, sc, PRE_.billetterie, id);
      } else {
        ajouter(decalerIso_(d0, -20), 'Billetterie groupe — ' + act.nom, total * 0.6, c, sc, PRE_.billetterie, id);
        ajouter(d0, 'Transport en car — ' + act.nom, total * 0.4, c, sc, car, id);
      }
    } else if (g === 'sejour') {
      ajouter(decalerIso_(d0, -90), 'Acompte 30 % hébergement — ' + act.nom, total * 0.75 * 0.3, c, sc, PRE_.vacances, id);
      ajouter(decalerIso_(d0, -10), 'Solde hébergement — ' + act.nom, total * 0.75 * 0.7, c, sc, PRE_.vacances, id);
      ajouter(d0, 'Transport en car — ' + act.nom, total * 0.25, c, sc, PRE_.car1, id);
    } else if (g === 'atelier') {
      if (/Chorale/.test(act.nom)) {
        [0, 60, 120].forEach(function (j, k) {
          ajouter(decalerIso_(d0, j), 'Chef de chœur — vacations ' + (k + 1) + '/3 — ' + act.nom, total / 3, c, sc, ID_PRESTATAIRE_AUTRE, id);
        });
      } else {
        ajouter(d0, 'Fournitures de peinture — ' + act.nom, total * 0.2, c, sc, PRE_.papeterie, id);
        ajouter(decalerIso_(d0, 50), 'Intervenante peinture 1/2 — ' + act.nom, total * 0.4, c, sc, PRE_.atelier, id);
        ajouter(act.dateFin || decalerIso_(d0, 100), 'Intervenante peinture 2/2 — ' + act.nom, total * 0.4, c, sc, PRE_.atelier, id);
      }
    } else if (g === 'formation') {
      ajouter(act.dateFin || d0, 'Formateur — ' + act.nom, total, c, sc, /secours/.test(act.nom) ? ID_PRESTATAIRE_AUTRE : PRE_.formation, id);
    }
  });

  // 2. Frais de fonctionnement
  [2025, 2026].forEach(function (y) {
    ajouter(y + '-01-20', 'Assurance responsabilité civile ' + y, y === 2025 ? 687 : 712, '7. Fonctionnement association', '7.2 Gestion administrative et financière', PRE_.assurance);
    [2, 5, 9, 12].forEach(function (m, k) {
      ajouter(isoFictif_(y, m, 8), 'Impression du Maillon n° ' + (k + 1) + ' / ' + y, h.entier(290, 340) + h.entier(0, 99) / 100, '7. Fonctionnement association', '7.3 Communication et information', PRE_.imprimerie);
      ajouter(isoFictif_(y, m, 12), 'Affranchissement du Maillon n° ' + (k + 1), h.entier(150, 190) + h.entier(0, 99) / 100, '7. Fonctionnement association', '7.3 Communication et information', ID_PRESTATAIRE_AUTRE);
    });
    ajouter(y + '-03-15', 'Nom de domaine et hébergement du site', 96, '7. Fonctionnement association', '7.7 Services et outils informatiques', ID_PRESTATAIRE_AUTRE);
    [[1, 10], [6, 5], [9, 12]].forEach(function (x) {
      ajouter(isoFictif_(y, x[0], x[1]), 'Fournitures de bureau', h.entier(40, 110) + h.entier(0, 99) / 100, '7. Fonctionnement association', '7.6 Administration courante (fonctionnement)', PRE_.papeterie);
    });
    ajouter(y + '-04-02', 'Licence logiciel de comptabilité', 120, '7. Fonctionnement association', '7.7 Services et outils informatiques', ID_PRESTATAIRE_AUTRE);
    for (var m = 1; m <= 12; m++) ajouter(isoFictif_(y, m, 5), 'Frais de tenue de compte', y === 2025 ? 9.5 : 9.9, '7. Fonctionnement association', '7.2 Gestion administrative et financière', '');
    [[3, 18], [7, 9], [11, 21]].forEach(function (x) {
      ajouter(isoFictif_(y, x[0], x[1]), 'Visite à un adhérent hospitalisé (fleurs)', h.entier(45, 80), '7. Fonctionnement association', '7.4 Gestion des adhérents', ID_PRESTATAIRE_AUTRE);
    });
  });
  ajouter('2025-12-15', 'Colis solidaires de fin d\'année', 640, '7. Fonctionnement association', '7.4 Gestion des adhérents', ID_PRESTATAIRE_AUTRE);
  ajouter('2025-02-10', 'Formation tableur pour le bureau', 180, '6. Informatique et apprentissages', '6.3 Autres...', PRE_.formation);
  // gerbes pour les décès de l'année
  adherents.filter(function (a) { return a.deces; }).forEach(function (a) {
    ajouter(decalerIso_(a.dateDeces, 5), 'Gerbe de fleurs — obsèques de ' + a.prenom + ' ' + a.nom, 75, '7. Fonctionnement association', '7.4 Gestion des adhérents', ID_PRESTATAIRE_AUTRE);
  });

  // 3. Mobil-home : la location est payée au camping (dépense AUTOMATIQUE liée à la location)
  var nomParId = {}, campingParId = {};
  adherents.forEach(function (a) { nomParId[a.id] = a.nom + ' ' + a.prenom; });
  (prestataires || []).forEach(function (p) { campingParId[p.id] = p.raisonSociale; });
  mobilhome.forEach(function (mh) {
    var l = ajouter(decalerIso_(mh.semaine, -30), 'Location mobil-home semaine du ' + isoVersFr_(mh.semaine) + ' — ' + campingParId[mh.campingId] + ' — ' + nomParId[mh.adherentId],
            mh.coutLocation, CAT_MOBILHOME, SOUSCAT_MOBILHOME, mh.campingId);
    if (l) { l.origine = 'Automatique'; mh._depense = l; }
  });

  // 4. Dépenses hors budget (imprévues)
  ajouter('2025-05-20', 'Vidéoprojecteur pour les réunions', 480, '7. Fonctionnement association', '7.5 Local et logistique', ID_PRESTATAIRE_AUTRE, '', 'Hors budget');
  ajouter('2025-11-30', 'Cadeau de départ de l\'ancien trésorier', 150, '7. Fonctionnement association', '7.4 Gestion des adhérents', ID_PRESTATAIRE_AUTRE, '', 'Hors budget');
  ajouter('2026-03-12', 'Réparation de la sonorisation', 230, '7. Fonctionnement association', '7.5 Local et logistique', ID_PRESTATAIRE_AUTRE, '', 'Hors budget');
  ajouter('2026-06-18', 'Remplacement de l\'imprimante du bureau', 189, '7. Fonctionnement association', '7.5 Local et logistique', PRE_.papeterie, '', 'Hors budget');

  lignes.sort(function (a, b) { return a.date.localeCompare(b.date); });
  return lignes;
}

var MOIS_FR_ = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Recettes saisies à la main : cotisations (regroupées par mois), dons, subventions,
 * part payée par les adhérents pour le mobil-home.
 * Les participations aux activités seront créées automatiquement au lot 4 (paiement des échéances).
 */
function recettesFictives_(adherents, mobilhome, prestataires) {
  var h = hasard_(5150);
  var lignes = [];
  function ajouter(date, libelle, montant, categorie, sousCategorie, adherentId, budgete) {
    if (date > LIMITE_FICTIVE_ || montant <= 0) return null;
    var l = { date: date, libelle: libelle, montant: arrondi2_(montant), categorie: categorie, sousCategorie: sousCategorie,
              activiteId: '', adherentId: adherentId || '', budgete: budgete || 'Budgété', origine: 'Saisie manuelle', echeanceId: '',
              modePaiement: /^Subvention/.test(libelle) ? 'Virement' : h.choix(['Chèque', 'Chèque', 'Espèces', 'Virement']), justificatif: '', commentaire: '' };
    lignes.push(l);
    return l;
  }
  // Cotisations : les anciens paient de janvier à avril, les nouveaux le mois de leur inscription
  [2025, 2026].forEach(function (y) {
    var parMois = {};
    adherents.forEach(function (a) {
      if (!actifALaDate_(a, y + '-12-31') && !(a.dateFin && a.dateFin >= y + '-01-01' && a.dateInscription <= y + '-12-31')) return;
      var date;
      if (a.dateInscription.slice(0, 4) === String(y)) date = a.dateInscription;
      else {
        var x = h();
        var mois = x < 0.5 ? 1 : x < 0.75 ? 2 : x < 0.9 ? 3 : 4;
        date = isoFictif_(y, mois, h.entier(3, 28));
      }
      if (a.dateFin && a.dateFin < date) return;     // parti avant d'avoir réglé
      var m = Number(date.slice(5, 7));
      parMois[m] = parMois[m] || { n: 0, total: 0, derniere: date };
      parMois[m].n++; parMois[m].total += Number(a.cotisation || 15);
      if (date > parMois[m].derniere) parMois[m].derniere = date;
    });
    Object.keys(parMois).forEach(function (m) {
      var x = parMois[m];
      ajouter(x.derniere, 'Cotisations ' + MOIS_FR_[m - 1] + ' ' + y + ' (' + x.n + ' adhérent' + (x.n > 1 ? 's' : '') + ')', x.total, '8. Subvention et Adhésions', '8.2 Adhésion');
    });
  });
  // Dons et subventions
  ajouter('2025-03-10', 'Don d\'un adhérent', 50, '8. Subvention et Adhésions', '8.3 Dons');
  ajouter('2025-06-22', 'Don à l\'occasion du séjour', 100, '8. Subvention et Adhésions', '8.3 Dons');
  ajouter('2025-12-05', 'Don anonyme', 30, '8. Subvention et Adhésions', '8.3 Dons');
  ajouter('2026-02-14', 'Don d\'un adhérent', 80, '8. Subvention et Adhésions', '8.3 Dons');
  ajouter('2026-05-30', 'Don anonyme', 40, '8. Subvention et Adhésions', '8.3 Dons');
  ajouter('2026-04-03', 'Don exceptionnel (legs)', 500, '8. Subvention et Adhésions', '8.3 Dons', '', 'Hors budget');
  ajouter('2025-03-25', 'Subvention municipale de fonctionnement 2025', 1500, '8. Subvention et Adhésions', '8.1 Subvention');
  ajouter('2026-03-24', 'Subvention municipale de fonctionnement 2026', 1500, '8. Subvention et Adhésions', '8.1 Subvention');
  ajouter('2025-06-30', 'Subvention départementale — projet numérique', 800, '8. Subvention et Adhésions', '8.1 Subvention');
  // Mobil-home : part payée par l'adhérent (recette AUTOMATIQUE liée à la location)
  var nomParId = {}, campingParId = {};
  adherents.forEach(function (a) { nomParId[a.id] = a.nom + ' ' + a.prenom; });
  (prestataires || []).forEach(function (p) { campingParId[p.id] = p.raisonSociale; });
  mobilhome.forEach(function (mh) {
    var l = ajouter(decalerIso_(mh.semaine, -25), 'Mobil-home semaine du ' + isoVersFr_(mh.semaine) + ' — ' + campingParId[mh.campingId] + ' — ' + nomParId[mh.adherentId] + ' (part adhérent)',
            mh.montantPayeAdherent, CAT_MOBILHOME, SOUSCAT_MOBILHOME, mh.adherentId);
    if (l) { l.origine = 'Automatique'; mh._recette = l; }
  });
  return lignes;
}


/* =====================================================================
 *  LOT 4 : échéances, paiements et remboursement
 * ===================================================================== */

/**
 * Cases de paiement des inscriptions (même découpage que l'outil : planifierEcheances_).
 *  - activités passées : presque tout payé, quelques dernières échéances impayées (paiements partiels) ;
 *  - activités à venir : échéances déjà échues payées en grande partie ;
 *  - une inscription annulée avec une échéance payée puis remboursée.
 * Chaque paiement crée sa recette automatique ; le remboursement est une recette négative.
 */
function echeancesFictives_(adherents, activites, inscriptions, recettes, depenses) {
  var h = hasard_(4040);
  var actParId = {}, nomParId = {};
  activites.forEach(function (a) { actParId[a.id] = a; });
  adherents.forEach(function (a) { nomParId[a.id] = a.nom + ' ' + a.prenom; });
  var lignes = [];
  var rembourse = false;
  function payer(e, act, ins, date, n) {
    e.paye = true; e.datePaiement = date;
    var r = { date: date, libelle: 'Paiement échéance ' + e.numero + '/' + n + ' — ' + act.nom + ' — ' + nomParId[ins.adherentId],
              montant: e.montant, categorie: act.categorie, sousCategorie: act.sousCategorie, activiteId: act.id, adherentId: ins.adherentId,
              budgete: 'Budgété', origine: 'Automatique', echeanceId: '', modePaiement: h.choix(['Chèque', 'Chèque', 'Virement', 'Espèces']),
              justificatif: '', commentaire: '' };
    recettes.push(r);
    e._recette = r;
  }
  inscriptions.forEach(function (ins) {
    var act = actParId[ins.activiteId];
    if (!act || !(Number(ins.montantDu) > 0)) return;
    var cases = planifierEcheances_(ins, act);
    var n = cases.length;
    var passee = act.dateDebut <= LIMITE_FICTIVE_;
    if (ins.statut === 'Désinscrit') {
      // une seule inscription annulée garde son 1er paiement, remboursé ensuite
      if (rembourse || !passee || cases[0].datePrevue > LIMITE_FICTIVE_) return;
      var e0 = cases[0];
      e0.id = 'ECH-' + ('0000' + (lignes.length + 1)).slice(-5);
      payer(e0, act, ins, e0.datePrevue, n);
      var dRemb = decalerIso_(e0.datePrevue, 20) > LIMITE_FICTIVE_ ? LIMITE_FICTIVE_ : decalerIso_(e0.datePrevue, 20);
      var d = { date: dRemb, libelle: 'Remboursement échéance 1/' + n + ' — ' + act.nom + ' — ' + nomParId[ins.adherentId], montant: -e0.montant,
                categorie: act.categorie, sousCategorie: act.sousCategorie, activiteId: act.id, adherentId: ins.adherentId, budgete: 'Budgété',
                origine: 'Remboursement', echeanceId: '', modePaiement: 'Chèque', justificatif: '', commentaire: 'Désinscription pour raison de santé' };
      recettes.push(d);
      e0.rembourse = true; e0._remboursement = d;
      lignes.push(e0);
      rembourse = true;
      return;
    }
    var partiel = n > 1 && passee && h.oui(0.08);   // dernière échéance non réglée
    cases.forEach(function (e, k) {
      e.id = 'ECH-' + ('0000' + (lignes.length + 1)).slice(-5);
      e.datePaiement = ''; e.recetteId = ''; e.depenseId = ''; e.remboursementId = '';
      var echue = e.datePrevue <= LIMITE_FICTIVE_;
      var aPayer = echue && (passee ? !(partiel && k === n - 1) && h.oui(0.98) : h.oui(0.85));
      if (aPayer) {
        var date = decalerIso_(e.datePrevue, h.entier(0, 6));
        if (date > LIMITE_FICTIVE_) date = LIMITE_FICTIVE_;
        payer(e, act, ins, date, n);
      }
      lignes.push(e);
    });
  });
  return lignes;
}
