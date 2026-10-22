/* =====================================================================
   Guide d'utilisation — navigation, index automatique et recherche libre
   JavaScript sans bibliothèque. Tout est construit à partir du contenu de
   la page : ajouter une fiche (class="fiche" + id) suffit pour qu'elle soit
   indexée et trouvable.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Outils ---------- */
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[’']/g, ' ').replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /** Normalisation caractère par caractère (même longueur que le texte) : sert à repérer les positions pour surligner. */
  function normC(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (/[\s’'\-_/]/.test(c)) { o += ' '; continue; }
      var d = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      o += d.length === 1 ? d : (c.toLowerCase().length === 1 ? c.toLowerCase() : c);
    }
    return o;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Synonymes : un mot tapé cherche aussi ses équivalents ---------- */
  var SYN = {
    payer: ['paye', 'paiement', 'echeance', 'encaisser', 'regler', 'recette'],
    paiement: ['paye', 'payer', 'echeance', 'reglement'],
    regler: ['paye', 'paiement', 'echeance'],
    cheque: ['paiement', 'mode', 'encaissement'],
    rembourser: ['remboursement', 'rembourse', 'recette negative'],
    remboursement: ['rembourser', 'recette negative'],
    quitter: ['desinscri', 'depart', 'archives', 'fin d adhesion'],
    depart: ['desinscri', 'archives', 'fin d adhesion'],
    partir: ['desinscri', 'depart', 'archives'],
    radier: ['desinscri', 'supprimer'],
    desinscrire: ['desinscri', 'depart', 'archives'],
    mort: ['deces', 'decede'],
    decede: ['deces'],
    deces: ['decede'],
    revenir: ['reinscri'],
    retour: ['reinscri'],
    reinscrire: ['reinscri'],
    cotisation: ['adhesion', 'cotisations', '8.2'],
    adhesion: ['cotisation', 'adherent'],
    don: ['dons', '8.3', 'cotisations superieures', 'excedent'],
    subvention: ['subventionne', 'participation association', '8.1'],
    aide: ['participation association', 'aide mobil home', 'subvention'],
    mobilhome: ['mobil home'],
    camping: ['mobil home', 'prestataire'],
    vacances: ['mobil home', 'sejour'],
    sortie: ['activite'],
    sejour: ['activite', 'villegiature'],
    voyage: ['activite', 'sejour'],
    evenement: ['activite', 'calendrier'],
    agenda: ['calendrier'],
    inscrire: ['inscription', 'nouvel adherent', 'inscrit'],
    inscription: ['inscrire', 'inscrit'],
    imprimer: ['fiche d inscription', 'pdf', 'export'],
    pdf: ['fiche d inscription'],
    excel: ['csv', 'export'],
    exporter: ['export', 'csv'],
    tableur: ['csv', 'export'],
    facture: ['depense', 'prestataire', 'justificatif'],
    fournisseur: ['prestataire'],
    budget: ['budgete', 'previsionnel', 'solde'],
    argent: ['recette', 'depense', 'solde'],
    retard: ['en retard', 'reste du', 'alerte'],
    impaye: ['retard', 'reste du'],
    doublon: ['doublon', 'meme nom'],
    email: ['e mail', 'mail'],
    mail: ['e mail', 'email', 'notification'],
    courriel: ['e mail', 'mail'],
    telephone: ['tel', 'mobile'],
    adresse: ['code postal', 'adresse'],
    annee: ['annee affichee', 'rattachement'],
    supprimer: ['supprimer', 'corbeille', 'effacer'],
    effacer: ['supprimer'],
    modifier: ['modifier', 'corriger'],
    corriger: ['modifier', 'a completer', 'erreur'],
    chercher: ['rechercher', 'recherche', 'filtre'],
    trier: ['tri', 'trier'],
    sauvegarde: ['sauvegarder', 'copie'],
    maillon: ['maillon papier'],
    conjoint: ['conjoint'],
    epoux: ['conjoint'],
    epouse: ['conjoint'],
    age: ['age', 'naissance', 'tranche'],
    stat: ['indicateur', 'graphique'],
    statistique: ['indicateur', 'graphique'],
    chiffre: ['indicateur'],
    graphique: ['graphique', 'camembert', 'barres'],
    combien: ['nombre', 'effectif', 'total']
  };
  function racine(m) { return m.length > 4 ? m.replace(/(s|x)$/, '') : m; }
  function variantes(mot) {
    var r = racine(mot), v = [r];
    (SYN[mot] || SYN[r] || []).forEach(function (x) { v.push(norm(x)); });
    return v;
  }

  /* ---------- Construction de l'index de recherche ---------- */
  var TYPES = { ind: 'Indicateur', sai: 'Saisie', lis: 'Liste', tuto: 'Tuto', base: 'Les bases', glo: 'Glossaire' };
  var INDEX = [];
  function typeDe(el) {
    if (el.classList.contains('tuto')) return 'tuto';
    if (el.classList.contains('terme')) return 'glo';
    var z = el.closest('.zone');
    if (z) { if (z.classList.contains('ind')) return 'ind'; if (z.classList.contains('sai')) return 'sai'; if (z.classList.contains('lis')) return 'lis'; }
    return 'base';
  }
  function titreDe(el) {
    var h = el.querySelector('h4, dt');
    if (!h) return el.id;
    var t = h.cloneNode(true);
    $$('.ou, .duree', t).forEach(function (x) { x.remove(); });
    return t.textContent.trim();
  }
  function construireIndex() {
    $$('.fiche[id], .tuto[id], .terme[id]').forEach(function (el) {
      var sec = el.closest('section[data-rubrique]');
      var texte = (el.innerText || el.textContent).replace(/\s+/g, ' ').trim();
      INDEX.push({
        id: el.id, el: el, type: typeDe(el), titre: titreDe(el),
        rubrique: sec ? sec.getAttribute('data-rubrique') : '',
        texte: texte, nTitre: norm(titreDe(el)), nMots: norm(el.getAttribute('data-mots') || ''), nTexte: norm(texte)
      });
    });
  }

  /* ---------- Recherche ---------- */
  function chercher(q) {
    var mots = norm(q).split(' ').filter(function (m) { return m.length > 1 || /\d/.test(m); });
    if (!mots.length) return { res: [], mots: [] };
    var vars = mots.map(variantes);
    function score(e, tous) {
      var total = 0, trouves = 0;
      for (var i = 0; i < vars.length; i++) {
        var best = 0;
        vars[i].forEach(function (v, k) {
          var poids = k === 0 ? 1 : 0.6;   // le mot tapé compte plus que ses synonymes
          if (e.nTitre.indexOf(v) >= 0) best = Math.max(best, 10 * poids);
          if (e.nMots.indexOf(v) >= 0) best = Math.max(best, 6 * poids);
          if (e.nTexte.indexOf(v) >= 0) best = Math.max(best, (2 + Math.min(3, e.nTexte.split(v).length - 2)) * poids);
        });
        if (best > 0) trouves++;
        else if (tous) return 0;
        total += best;
      }
      if (!trouves) return 0;
      if (e.type === 'tuto') total *= 1.15;   // une question « comment faire » mène volontiers au tuto
      if (e.nTitre === norm(q)) total += 15;
      return total;
    }
    var res = INDEX.map(function (e) { return { e: e, s: score(e, true) }; }).filter(function (x) { return x.s > 0; });
    var approche = false;
    if (!res.length && mots.length > 1) {
      res = INDEX.map(function (e) { return { e: e, s: score(e, false) }; }).filter(function (x) { return x.s > 0; });
      approche = res.length > 0;
    }
    res.sort(function (a, b) { return b.s - a.s; });
    return { res: res.slice(0, 14), mots: [].concat.apply([], vars), approche: approche };
  }

  function extrait(e, mots) {
    var t = e.texte, n = normC(t), pos = -1, lg = 0;
    // la normalisation garde la même longueur pour les lettres accentuées courantes : on retrouve la position dans le texte d'origine
    mots.forEach(function (m) { var p = n.indexOf(m); if (p >= 0 && (pos < 0 || p < pos)) { pos = p; lg = m.length; } });
    if (pos < 0) return esc(t.slice(0, 140)) + (t.length > 140 ? '…' : '');
    var deb = Math.max(0, pos - 60), fin = Math.min(t.length, pos + lg + 90);
    var morceau = t.slice(deb, fin);
    return (deb ? '…' : '') + surligner(morceau, mots) + (fin < t.length ? '…' : '');
  }
  function surligner(txt, mots) {
    var n = normC(txt);
    var marques = new Array(txt.length).fill(false);
    mots.forEach(function (m) { if (m.length < 2) return; var p = n.indexOf(m); while (p >= 0) { for (var i = p; i < p + m.length; i++) marques[i] = true; p = n.indexOf(m, p + m.length); } });
    var out = '', ouvert = false;
    for (var i = 0; i < txt.length; i++) {
      if (marques[i] && !ouvert) { out += '<mark>'; ouvert = true; }
      if (!marques[i] && ouvert) { out += '</mark>'; ouvert = false; }
      out += esc(txt[i]);
    }
    return out + (ouvert ? '</mark>' : '');
  }

  function brancherRecherche(boite) {
    var champ = $('input', boite), liste = $('.resultats', boite), croix = $('.effacer', boite);
    var choisi = -1, derniers = [];
    function afficher() {
      var q = champ.value;
      croix.style.display = q ? 'block' : 'none';
      if (!q.trim()) { liste.classList.remove('ouvert'); liste.innerHTML = ''; return; }
      var r = chercher(q);
      derniers = r.res; choisi = -1;
      if (!r.res.length) {
        liste.innerHTML = '<div class="vide">Aucun résultat pour « ' + esc(q) + ' ». Essayez un autre mot, ou consultez l\'<a href="#index">index</a> et le <a href="#glossaire">glossaire</a>.</div>';
      } else {
        liste.innerHTML = '<div class="entete-res">' + r.res.length + ' résultat(s)' + (r.approche ? ' approchant(s) (pas tous les mots)' : '') + ' · ↑ ↓ puis Entrée</div>' +
          r.res.map(function (x, i) {
            return '<a href="#' + x.e.id + '" data-i="' + i + '"><div class="res-titre"><span class="puce p-' + x.e.type + '">' + TYPES[x.e.type] + '</span>' + surligner(x.e.titre, r.mots) + '</div>' +
              '<div class="res-rub">' + esc(x.e.rubrique) + '</div><div class="res-ext">' + extrait(x.e, r.mots) + '</div></a>';
          }).join('');
      }
      liste.classList.add('ouvert');
      liste._mots = r.mots;
    }
    var minuterie;
    champ.addEventListener('input', function () { clearTimeout(minuterie); minuterie = setTimeout(afficher, 120); });
    champ.addEventListener('focus', function () { if (champ.value.trim()) afficher(); });
    champ.addEventListener('keydown', function (ev) {
      var liens = $$('a[data-i]', liste);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!liens.length) return;
        choisi = (choisi + (ev.key === 'ArrowDown' ? 1 : -1) + liens.length) % liens.length;
        liens.forEach(function (l, i) { l.classList.toggle('choisi', i === choisi); });
        liens[choisi].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        var x = derniers[choisi >= 0 ? choisi : 0];
        if (x) allerA(x.e.id, liste._mots);
      } else if (ev.key === 'Escape') {
        liste.classList.remove('ouvert'); champ.blur();
      }
    });
    liste.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[data-i]');
      if (!a) return;
      ev.preventDefault();
      allerA(derniers[Number(a.getAttribute('data-i'))].e.id, liste._mots);
    });
    croix.addEventListener('click', function () { champ.value = ''; afficher(); champ.focus(); });
    document.addEventListener('click', function (ev) { if (!boite.contains(ev.target)) liste.classList.remove('ouvert'); });
    return { champ: champ, afficher: afficher };
  }

  /* ---------- Aller à un endroit précis, avec surlignage ---------- */
  function retirerTrouves() {
    $$('mark.trouve').forEach(function (m) { var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
  }
  function marquerMots(el, mots) {
    retirerTrouves();
    if (!mots || !mots.length) return;
    var marcheur = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), noeuds = [], n;
    while ((n = marcheur.nextNode())) { if (n.nodeValue.trim() && !n.parentNode.closest('figure, script')) noeuds.push(n); }
    noeuds.forEach(function (noeud) {
      var t = noeud.nodeValue, nn = normC(t);
      var plages = [];
      mots.forEach(function (m) { if (m.length < 3) return; var p = nn.indexOf(m); while (p >= 0) { plages.push([p, p + m.length]); p = nn.indexOf(m, p + m.length); } });
      if (!plages.length) return;
      plages.sort(function (a, b) { return a[0] - b[0]; });
      var frag = document.createDocumentFragment(), pos = 0;
      plages.forEach(function (pl) {
        if (pl[0] < pos) return;
        frag.appendChild(document.createTextNode(t.slice(pos, pl[0])));
        var mk = document.createElement('mark'); mk.className = 'trouve'; mk.textContent = t.slice(pl[0], pl[1]); frag.appendChild(mk);
        pos = pl[1];
      });
      frag.appendChild(document.createTextNode(t.slice(pos)));
      noeud.parentNode.replaceChild(frag, noeud);
    });
    setTimeout(retirerTrouves, 8000);
  }
  function allerA(id, mots) {
    var el = document.getElementById(id);
    if (!el) return;
    $$('.resultats').forEach(function (r) { r.classList.remove('ouvert'); });
    fermerVolet();
    history.pushState(null, '', '#' + id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    flash(el);
    if (mots) marquerMots(el, mots);
  }
  function flash(el) {
    var cible = el.matches('section') ? el.querySelector('h2') || el : el;
    cible.classList.remove('flash'); void cible.offsetWidth; cible.classList.add('flash');
  }

  /* ---------- Index par rubrique (construit à partir des fiches) ---------- */
  function construireIndexRubriques() {
    var zone = $('#index-rubriques');
    var groupes = [['base', 'Contenu'], ['ind', '🔵 Indicateurs'], ['sai', '🟢 Saisie'], ['lis', '🟡 Listes'], ['tuto', '🟠 Tutos']];
    zone.innerHTML = $$('section[data-rubrique]').filter(function (s) { return s.id !== 'accueil' && s.id !== 'glossaire'; }).map(function (s) {
      var h = s.querySelector('h2');
      var entrees = INDEX.filter(function (e) { return e.el.closest('section') === s; });
      return '<div class="carte"><h3><a href="#' + s.id + '">' + esc(h.textContent.trim()) + '</a></h3>' +
        groupes.map(function (g) {
          var l = entrees.filter(function (e) { return e.type === g[0]; });
          if (!l.length) return '';
          return '<div class="grp"><strong>' + g[1] + ' :</strong> ' + l.map(function (e) { return '<a href="#' + e.id + '">' + esc(e.titre) + '</a>'; }).join('') + '</div>';
        }).join('') + '</div>';
    }).join('') + '<div class="carte"><h3><a href="#glossaire">📖 Glossaire</a></h3><div class="grp">' +
      INDEX.filter(function (e) { return e.type === 'glo'; }).map(function (e) { return '<a href="#' + e.id + '">' + esc(e.titre) + '</a>'; }).join('') + '</div></div>';
  }

  /* ---------- Volet : sous-menus et rubrique active ---------- */
  function construireSousNav() {
    $$('#nav a.nav').forEach(function (a) {
      var s = document.getElementById(a.getAttribute('data-cible'));
      var titres = s ? $$('h3.zone-titre[id]', s) : [];
      if (!titres.length) return;
      var d = document.createElement('div');
      d.className = 'sous-nav';
      d.setAttribute('data-pour', s.id);
      d.innerHTML = titres.map(function (h) {
        var z = h.parentNode.classList;
        var c = z.contains('ind') ? 'z-ind' : z.contains('sai') ? 'z-sai' : z.contains('lis') ? 'z-lis' : 'z-tuto';
        return '<a class="' + c + '" href="#' + h.id + '">' + esc(h.textContent.trim()) + '</a>';
      }).join('');
      a.parentNode.insertBefore(d, a.nextSibling);
    });
  }
  function rubriqueActive(id) {
    $$('#nav a.nav').forEach(function (a) { a.classList.toggle('actif', a.getAttribute('data-cible') === id); });
    $$('#nav .sous-nav').forEach(function (d) { d.classList.toggle('ouvert', d.getAttribute('data-pour') === id); });
  }
  function suivreDefilement() {
    var sections = $$('section[data-rubrique]');
    var courant = null;
    function maj() {
      var y = window.scrollY + 120, actif = sections[0];
      sections.forEach(function (s) { if (s.offsetTop <= y) actif = s; });
      if (actif && actif.id !== courant) { courant = actif.id; rubriqueActive(courant); }
    }
    window.addEventListener('scroll', function () { window.requestAnimationFrame(maj); }, { passive: true });
    maj();
  }

  /* ---------- Volet sur téléphone ---------- */
  function ouvrirVolet() { $('#volet').classList.add('ouvert'); $('#voile').classList.add('ouvert'); }
  function fermerVolet() { $('#volet').classList.remove('ouvert'); $('#voile').classList.remove('ouvert'); }

  /* ---------- Agrandissement des captures ---------- */
  function brancherLoupe() {
    var fond = $('#loupe'), img = $('img', fond);
    document.addEventListener('click', function (ev) {
      var i = ev.target.closest('figure.capture img');
      if (!i) return;
      img.src = i.src; img.alt = i.alt; fond.classList.add('ouvert');
    });
    fond.addEventListener('click', function () { fond.classList.remove('ouvert'); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fond.classList.remove('ouvert'); });
  }

  /* ---------- Lettres du glossaire ---------- */
  function construireLettres() {
    var vues = {};
    $('#lettres').innerHTML = $$('.terme').map(function (t) {
      var l = norm(t.querySelector('dt').textContent).charAt(0).toUpperCase();
      if (vues[l]) return '';
      vues[l] = true;
      return '<a href="#' + t.id + '">' + l + '</a>';
    }).join('');
  }

  /* ---------- Démarrage ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    construireIndex();
    construireIndexRubriques();
    construireSousNav();
    construireLettres();
    var haut = brancherRecherche($('#recherche-haut'));
    var acc = brancherRecherche($('#recherche-accueil'));
    $$('.hero .exemples button').forEach(function (b) {
      b.addEventListener('click', function () { acc.champ.value = b.textContent; acc.afficher(); acc.champ.focus(); });
    });
    // liens internes : défilement doux + surlignage de la cible
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[href^="#"]');
      if (!a || a.closest('.resultats')) return;
      var id = a.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      ev.preventDefault();
      allerA(id);
    });
    $('#bouton-menu').addEventListener('click', ouvrirVolet);
    $('#voile').addEventListener('click', fermerVolet);
    // raccourci : touche « / » pour rechercher
    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { ev.preventDefault(); haut.champ.focus(); }
    });
    brancherLoupe();
    suivreDefilement();
    // arrivée directe sur une ancre (ex. Guide.html#adh-liste depuis l'outil)
    if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))) {
      var cible = document.getElementById(location.hash.slice(1));
      [60, 400].forEach(function (t) { setTimeout(function () { cible.scrollIntoView(); }, t); });
      setTimeout(function () { flash(cible); }, 100);
    }
    window.addEventListener('popstate', function () {
      var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
    // API minimale pour l'outil (bouton « ? » d'une rubrique, plus tard)
    window.GuideBrunants = { aller: allerA, chercher: function (q) { haut.champ.value = q; haut.afficher(); haut.champ.focus(); } };
  });
})();
