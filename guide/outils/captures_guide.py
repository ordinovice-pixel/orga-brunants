#!/usr/bin/env python3
"""
captures_guide.py — Génère toutes les captures d'écran du « Guide d'utilisation » de l'outil Les Brunants.

Les captures sont prises dans l'APERÇU LOCAL (Apercu_local_Brunants.html), qui fait tourner le vrai code
de l'outil avec les DONNÉES FICTIVES uniquement : aucune vraie donnée d'adhérent n'apparaît (DEC-062).
Les tutoriels rejouent les 10 exercices de la Prise en main avec la fiche fictive « EXERCICE Paul ».

Usage : python3 captures_guide.py <Apercu_local_Brunants.html> <dossier_npm> <dossier_sortie>
  dossier_npm : contient cj/package/dist/chart.umd.js et dl/package/dist/chartjs-plugin-datalabels.min.js
  (npm pack chart.js@4.4.1 chartjs-plugin-datalabels@2.2.0, puis décompresser dans cj/ et dl/)
Sortie : un fichier .webp par capture.
"""
import io
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

APERCU = pathlib.Path(sys.argv[1]).resolve().as_uri()
NPM = pathlib.Path(sys.argv[2])
SORTIE = pathlib.Path(sys.argv[3])
SORTIE.mkdir(parents=True, exist_ok=True)
CJ = (NPM / 'cj/package/dist/chart.umd.js').read_text()
DL = (NPM / 'dl/package/dist/chartjs-plugin-datalabels.min.js').read_text()
ECHELLE = 1.25
QUALITE = 74

ANNOTER_JS = r"""
(items) => {
  document.querySelectorAll('.__anno').forEach(e => e.remove());
  const manquants = [];
  items.forEach(it => {
    const el = typeof it.sel === 'string' ? document.querySelector(it.sel) : null;
    if (!el) { manquants.push(it.sel); return; }
    const r = el.getBoundingClientRect();
    const x0 = r.left + window.scrollX, y0 = r.top + window.scrollY;
    if (it.cadre) {
      const c = document.createElement('div');
      c.className = '__anno';
      c.style.cssText = `position:absolute;z-index:9998;left:${x0 - 4}px;top:${y0 - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;` +
        'border:3px solid #D35400;border-radius:8px;pointer-events:none;box-shadow:0 0 0 3px rgba(255,255,255,.7)';
      document.body.appendChild(c);
    }
    const b = document.createElement('div');
    b.className = '__anno';
    b.textContent = it.n;
    const pos = it.pos || 'tr', t = 30;
    let x = x0 - 12, y = y0 - 12;
    if (pos === 'tr') { x = x0 + r.width - t + 12; }
    if (pos === 'r') { x = x0 + r.width + 6; y = y0 + r.height / 2 - t / 2; }
    if (pos === 'l') { x = x0 - t - 6; y = y0 + r.height / 2 - t / 2; }
    if (pos === 'bl') { y = y0 + r.height - t + 12; }
    if (pos === 'in') { x = x0 + 6; y = y0 + r.height / 2 - t / 2; }
    x += it.dx || 0; y += it.dy || 0;
    b.style.cssText = `position:absolute;z-index:9999;left:${x}px;top:${y}px;width:${t}px;height:${t}px;border-radius:50%;` +
      'background:#D35400;color:#fff;font:bold 17px Calibri,Arial,sans-serif;display:flex;align-items:center;justify-content:center;' +
      'border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45);pointer-events:none';
    document.body.appendChild(b);
  });
  return manquants;
}
"""


def route(r):
    r.fulfill(status=200, content_type='application/javascript', body=CJ if 'Chart.js' in r.request.url else DL)


manquants_total = []
liste_captures = []

with sync_playwright() as p:
    nav = p.chromium.launch(args=['--lang=fr-FR'])
    page = nav.new_page(viewport={'width': 1300, 'height': 860}, device_scale_factor=ECHELLE, locale='fr-FR', timezone_id='Europe/Paris')
    page.route('**/cdnjs.cloudflare.com/**', route)
    page.on('pageerror', lambda e: print('  ! erreur page :', e))
    page.goto(APERCU)
    page.wait_for_selector('#chargement', state='hidden', timeout=20000)
    page.wait_for_timeout(600)

    def fin(ms=300):
        page.wait_for_selector('#chargement', state='hidden', timeout=20000)
        page.wait_for_timeout(ms)

    # Personnalisation de l'aperçu : utilisateur et adresse de test fictifs, cadre « Aperçu local » masqué
    page.evaluate("FauxGAS.utilisateur = 'membre.bureau@exemple.fr'")
    page.evaluate("SERVEUR.enregistrerParametres({ EMAIL_TEST: 'test.bureau@exemple.fr' })")
    page.evaluate("chargerDonnees(false)")
    fin(800)
    page.add_style_tag(content='body > div[style*="position:fixed"][style*="bottom:12px"]{display:none!important}')
    page.evaluate("""() => { document.querySelectorAll('body > div').forEach(d => {
        if ((d.innerText || '').indexOf('Aperçu local') === 0) d.remove(); }); }""")


    def q(sel, i=0):
        """Repère le i-ème élément correspondant et renvoie un sélecteur unique."""
        cle = 'c' + str(abs(hash((sel, i))) % 10**8)
        ok = page.evaluate("""([s, i, c]) => { const e = document.querySelectorAll(s)[i]; if (!e) return false; e.setAttribute('data-cap', c); return true; }""", [sel, i, cle])
        if not ok:
            print('  ! introuvable :', sel, i)
        return f'[data-cap="{cle}"]'

    def vider_notifs():
        page.evaluate("document.getElementById('notifications').innerHTML = ''")

    def annoter(items):
        m = page.evaluate(ANNOTER_JS, items)
        if m:
            manquants_total.extend(m)
            print('  ! sélecteurs introuvables :', m)

    def effacer_annotations():
        page.evaluate("document.querySelectorAll('.__anno').forEach(e => e.remove())")

    def enregistrer_png(nom, png):
        img = Image.open(io.BytesIO(png)).convert('RGB')
        img.save(SORTIE / f'{nom}.webp', 'WEBP', quality=QUALITE, method=6)
        liste_captures.append(nom)
        print('  ✔', nom, img.size)

    def shot(nom, sel, pad=16, max_h=None, items=None, depuis=None, large=False):
        """Capture d'un élément (document entier, l'en-tête n'est pas collant pendant ces captures)."""
        vider_notifs()
        if large:
            page.set_viewport_size({'width': 1640, 'height': 860}); page.wait_for_timeout(400)
        el = page.locator(sel).first
        el.scroll_into_view_if_needed()
        page.wait_for_timeout(150)
        if items:
            annoter(items)
        b = page.evaluate("""(s) => { const r = document.querySelector(s).getBoundingClientRect();
            return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }; }""", sel)
        if depuis:   # commencer la capture plus haut (ex. inclure un titre au-dessus)
            b2 = page.evaluate("""(s) => { const r = document.querySelector(s).getBoundingClientRect();
                return { y: r.top + window.scrollY }; }""", depuis)
            b['h'] += b['y'] - b2['y']; b['y'] = b2['y']
        h = b['h'] + 2 * pad
        if max_h:
            h = min(h, max_h)
        clip = {'x': max(0, b['x'] - pad), 'y': max(0, b['y'] - pad), 'width': b['w'] + 2 * pad, 'height': h}
        enregistrer_png(nom, page.screenshot(full_page=True, clip=clip))
        effacer_annotations()
        if large:
            page.set_viewport_size({'width': 1300, 'height': 860}); page.wait_for_timeout(300)

    def shot_ecran(nom, sel=None, pad=12, items=None):
        """Capture dans la fenêtre visible (fenêtres de confirmation, notifications)."""
        if items:
            annoter(items)
        page.wait_for_timeout(150)
        if sel:
            r = page.locator(sel).first.bounding_box()
            clip = {'x': max(0, r['x'] - pad), 'y': max(0, r['y'] - pad), 'width': r['width'] + 2 * pad, 'height': r['height'] + 2 * pad}
            enregistrer_png(nom, page.screenshot(clip=clip))
        else:
            enregistrer_png(nom, page.screenshot())
        effacer_annotations()

    def aller(section):
        page.click(f'.nav-item[data-section="{section}"]')
        page.wait_for_timeout(500)
        page.evaluate('window.scrollTo(0, 0)')

    def oui():
        page.click('.modale [data-r="oui"]')

    def non():
        page.click('.modale [data-r="non"]')

    def choisir_adherent(sel_saisie, nom):
        val = page.evaluate("""([s, n]) => { const i = document.querySelector(s); const l = document.getElementById(i.getAttribute('list'));
            const o = Array.from(l.options).find(o => o.value.indexOf(n) === 0); return o ? o.value : ''; }""", [sel_saisie, nom])
        page.fill(sel_saisie, val)
        page.dispatch_event(sel_saisie, 'change')
        page.wait_for_timeout(200)

    def choisir_option_contenant(sel, texte):
        v = page.evaluate("""([s, t]) => { const o = Array.from(document.querySelector(s).options).find(o => o.text.indexOf(t) >= 0);
            return o ? o.value : null; }""", [sel, texte])
        if v is None:
            print('  ! option introuvable', sel, texte)
            return
        page.select_option(sel, v)
        page.wait_for_timeout(150)

    # =====================================================================
    # 1. VUE D'ENSEMBLE (en-tête collant, état initial)
    # =====================================================================
    print('\nVue d\'ensemble')
    vider_notifs()
    annoter([
        {'sel': '.sidebar .nav', 'n': '1', 'pos': 'tr', 'dx': -10, 'dy': 4},
        {'sel': '.annee-selecteur', 'n': '2', 'pos': 'tl'},
        {'sel': '#btn-actualiser', 'n': '3', 'pos': 'tl'},
        {'sel': '#btn-sauvegarder', 'n': '4', 'pos': 'tl'},
        {'sel': '#bandeau-entrainement span', 'n': '5', 'pos': 'l'},
        {'sel': '#badge-adherents', 'n': '6', 'pos': 'r'},
        {'sel': '.zone-indicateurs .zone-titre', 'n': '7', 'pos': 'l', 'dx': 4},
    ])
    shot_ecran('commun-ecran')

    # À partir d'ici, l'en-tête ne colle plus en haut (captures d'éléments)
    page.add_style_tag(content='.entete-fixe{position:static!important}')

    # =====================================================================
    # 2. TABLEAU DE BORD
    # =====================================================================
    print('\nTableau de bord')
    shot('tdb-indicateurs', '#dashboard .kpi-grid')
    shot('tdb-graphiques', q('#dashboard .zone-indicateurs > .grid-2', 0))
    shot('tdb-activites-alertes', q('#dashboard .zone-indicateurs > .grid-2', 1))
    choisir_adherent('#tdb-part-saisie', page.evaluate("""() => { const a = APP.d.tables.Adherents.filter(a => CALC.participations(a.id, APP.annee).length >= 3)[0];
        return a.nom + ' ' + a.prenom; }"""))
    shot('tdb-listes', '#dashboard .zone-listes')
    page.fill('#tdb-part-saisie', ''); page.dispatch_event('#tdb-part-saisie', 'change')

    # =====================================================================
    # 3. ADHÉRENTS
    # =====================================================================
    print('\nAdhérents')
    aller('chantier-1')
    shot('adh-indicateurs', '#chantier-1 .zone-indicateurs > .kpi-grid')
    shot('adh-repartitions', q('#chantier-1 .zone-indicateurs > .panel', 0))
    shot('adh-participation', q('#chantier-1 .zone-indicateurs > .panel', 1))
    shot('adh-formulaire', '#panneau-fiche-adherent')
    # erreurs de saisie : formulaire vide
    page.fill('#form-adherent [data-champ="nom"]', '')
    page.click('#adh-enregistrer'); page.wait_for_timeout(300)
    shot('commun-erreurs', '#panneau-fiche-adherent', max_h=330)
    page.click('#adh-annuler'); page.wait_for_timeout(200)
    shot('adh-liste', '#liste-adherents', max_h=560, depuis=q('#chantier-1 .zone-listes > .panel', 0) + ' .panel-header')
    # outils des listes, annotés
    annot_liste = [
        {'sel': '#liste-adherents .liste-recherche', 'n': '1'},
        {'sel': '#liste-adherents .liste-filtre', 'n': '2'},
        {'sel': '#liste-adherents .liste-raz', 'n': '3'},
        {'sel': '#liste-adherents .liste-compteur', 'n': '4'},
        {'sel': '#liste-adherents .liste-export', 'n': '5'},
        {'sel': '#liste-adherents th.triable:nth-child(2)', 'n': '6', 'pos': 'tr'},
        {'sel': '#liste-adherents .filtres-colonnes th:nth-child(2) input', 'n': '7', 'pos': 'l', 'dx': 30},
        {'sel': '#liste-adherents tbody tr:first-child .cellule-actions', 'n': '8', 'pos': 'r', 'dx': -8},
    ]
    shot('commun-liste', '#liste-adherents', max_h=330, items=annot_liste)
    page.click('#adh-arch-toutes'); page.wait_for_timeout(200)
    shot('adh-archives', q('#chantier-1 .zone-listes > .panel', 1), max_h=520)
    # historique d'un adhérent
    nom_hist = page.evaluate("""() => { const a = APP.d.tables.Adherents.filter(a => CALC.participations(a.id, APP.annee).length >= 3)[0];
        return a.nom + ' ' + a.prenom; }""")
    choisir_adherent('#hist-saisie', nom_hist)
    shot('adh-historique', '#panneau-historique')

    # =====================================================================
    # 4. BUDGET & COMPTA
    # =====================================================================
    print('\nBudget & Compta')
    aller('chantier-2')
    shot('bud-indicateurs', '#chantier-2 .zone-indicateurs > .kpi-grid')
    shot('bud-graphiques', '#chantier-2 .zone-indicateurs > .grid-2')
    shot('bud-suivi', '#chantier-2 .zone-indicateurs > .panel')
    shot('bud-formulaires', '#chantier-2 .zone-saisie > .grid-2')
    shot('bud-budgets', '#panneau-budgets')
    shot('bud-depenses', q('#chantier-2 .zone-listes > .panel', 0), max_h=520, large=True)
    shot('bud-recettes', q('#chantier-2 .zone-listes > .panel', 1), max_h=520, large=True)
    shot('bud-excedents', q('#chantier-2 .zone-listes > .panel', 2), max_h=420)
    # confirmation de suppression (exemple, annulée)
    page.locator('#liste-depenses').scroll_into_view_if_needed()
    page.evaluate("""() => { const b = Array.from(document.querySelectorAll('#liste-depenses [data-action="supprimer"]'))
        .find(b => { const l = APP.listes.Depenses.parId[b.getAttribute('data-id')]; return l && (!l.origine || l.origine === 'Saisie manuelle'); }); b.click(); }""")
    page.wait_for_timeout(300)
    shot_ecran('commun-confirmation', '.modale')
    non()

    # =====================================================================
    # 5. ACTIVITÉS
    # =====================================================================
    print('\nActivités')
    aller('chantier-3')
    shot('act-indicateurs', '#chantier-3 .zone-indicateurs > .kpi-grid')
    shot('act-mobilhome-subventions', '#chantier-3 .zone-indicateurs > .grid-2')
    shot('act-repartition', q('#chantier-3 .zone-indicateurs > .panel', 0))
    shot('act-couts', q('#chantier-3 .zone-indicateurs > .panel', 1), max_h=520)
    shot('act-fiche', '#panneau-fiche-activite')
    # activité sélectionnée : une activité passée avec des paiements
    act_sel = page.evaluate("""() => { const l = actActivitesAnnee(APP.annee).filter(a => actInscrits(a.id).length >= 5 && Number(a.nbEcheances) >= 2);
        return l.length ? l[0].id : ''; }""")
    if act_sel:
        page.select_option('#act-selection', act_sel); page.wait_for_timeout(300)
    shot('act-selection', '#panneau-activite-selectionnee', max_h=900)
    shot('act-mh-formulaire', '#panneau-mobilhome')
    shot('act-liste', q('#chantier-3 .zone-listes > .panel', 0), max_h=520)
    shot('act-locations', q('#chantier-3 .zone-listes > .panel', 1), max_h=480)
    shot('act-aides', q('#chantier-3 .zone-listes > .panel', 2), max_h=420)

    # =====================================================================
    # 6. PRESTATAIRES
    # =====================================================================
    print('\nPrestataires')
    aller('prestataires')
    shot('pre-indicateurs', '#prestataires .zone-indicateurs > .kpi-grid')
    shot('pre-suivi', '#prestataires .zone-indicateurs > .grid-2')
    shot('pre-formulaire', '#panneau-fiche-prestataire')
    shot('pre-liste', q('#prestataires .zone-listes > .panel', 0), max_h=520)
    page.evaluate("""() => { const p = APP.d.tables.Prestataires.find(p => p.raisonSociale.indexOf('Billetterie') === 0); preVoirFactures(p); }""")
    page.wait_for_timeout(300)
    shot('pre-factures', '#panneau-factures', max_h=420)

    # =====================================================================
    # 7. CALENDRIER
    # =====================================================================
    print('\nCalendrier')
    aller('chantier-4')
    # mois avec des activités et des échéances
    page.evaluate("""() => { let best = 0, m = CAL.mois; for (let i = 0; i < 12; i++) { const n = Object.keys(calEvenements(CAL.annee, i)).length;
        if (n > best) { best = n; m = i; } } CAL.mois = m; calRendreMois(); }""")
    page.wait_for_timeout(300)
    shot('cal-indicateurs', '#chantier-4 .zone-indicateurs')
    shot('cal-saisie', q('#chantier-4 .zone-saisie > .panel', 0))
    shot('cal-liste', q('#chantier-4 .zone-listes > .panel', 1))

    # =====================================================================
    # 8. RUBRIQUES REPRISES DU POC
    # =====================================================================
    print('\nProcédures, AG, NAS')
    aller('chantier-5'); shot('poc-procedures', q('#chantier-5 .zone-listes > .panel', 0), max_h=420)
    aller('chantier-6'); shot('poc-ag', '#chantier-6 .zone-indicateurs')
    aller('chantier-7'); shot('poc-nas', '#chantier-7 .zone-listes .grid-2')

    # =====================================================================
    # 9. TUTORIELS : les 10 exercices avec la fiche fictive « EXERCICE Paul »
    # =====================================================================
    print('\nTutoriels')
    # --- T1 : nouvel adhérent
    aller('chantier-1')
    page.click('#adh-nouveau'); page.wait_for_timeout(300)
    f = '#form-adherent '
    page.select_option(f + '[data-champ="civilite"]', 'M.')
    page.select_option(f + '[data-champ="sexe"]', 'H')
    page.fill(f + '[data-champ="nom"]', 'EXERCICE')
    page.fill(f + '[data-champ="prenom"]', 'Paul')
    page.fill(f + '[data-champ="adresse"]', '1 rue du Test')
    page.type(f + '[data-champ="codePostal"]', '91160')
    page.fill(f + '[data-champ="ville"]', 'Saulx-les-Chartreux')
    shot('tuto-adherent-fiche', '#panneau-fiche-adherent', items=[
        {'sel': f + '[data-champ="sexe"]', 'n': '1'},
        {'sel': f + '[data-champ="nom"]', 'n': '2'},
        {'sel': f + '[data-champ="dateInscription"]', 'n': '3'},
        {'sel': '#adh-region', 'n': '4', 'pos': 'tr'},
        {'sel': f + '[data-champ="cotisation"]', 'n': '5'},
        {'sel': '#adh-enregistrer', 'n': '6', 'pos': 'tl'},
    ], depuis='#chantier-1 .zone-saisie')
    page.click('#adh-enregistrer'); fin(400)
    shot_ecran('tuto-adherent-message', '#notifications .notification')
    id_paul = page.evaluate("APP.d.tables.Adherents.find(a => a.nom === 'EXERCICE').id")
    print('  fiche fictive :', id_paul)

    # --- T2 : filtre « À compléter »
    page.locator('#liste-adherents').scroll_into_view_if_needed()
    page.locator('#liste-adherents .liste-filtre').nth(6).select_option('Sans e-mail'); page.wait_for_timeout(200)
    page.fill('#liste-adherents .liste-recherche', 'EXERCICE'); page.wait_for_timeout(250)
    shot('tuto-acompleter', '#liste-adherents', items=[
        {'sel': '#liste-adherents .liste-filtre:nth-of-type(7)', 'n': '1', 'cadre': True},
        {'sel': '#liste-adherents .liste-recherche', 'n': '2'},
        {'sel': '#liste-adherents tbody tr:first-child [data-action="modifier"]', 'n': '3', 'pos': 'tr'},
    ])
    page.evaluate("id => adhModifier(parId('Adherents', id))", id_paul); page.wait_for_timeout(300)
    page.fill(f + '[data-champ="email"]', 'exercice@example.com')
    page.click('#adh-enregistrer'); fin()
    page.click('#liste-adherents .liste-raz'); page.wait_for_timeout(200)

    # --- Décès (fiche, sans enregistrer)
    page.evaluate("id => adhModifier(parId('Adherents', id))", id_paul); page.wait_for_timeout(300)
    page.check(f + '[data-champ="deces"]'); page.wait_for_timeout(200)
    shot('tuto-deces', '#panneau-fiche-adherent .form-group:has([data-champ="deces"])', pad=20, items=[
        {'sel': f + '[data-champ="deces"]', 'n': '1', 'pos': 'l', 'dx': 4},
        {'sel': f + '[data-champ="dateDeces"]', 'n': '2'},
        {'sel': f + '[data-champ="motifFin"]', 'n': '3'},
    ], depuis='#panneau-fiche-adherent .form-group:has([data-champ="abonneFacebook"])')
    page.click('#adh-annuler'); page.wait_for_timeout(200)

    # --- T3 : nouvelle activité en 3 échéances
    aller('chantier-3')
    page.click('#act-nouvelle'); page.wait_for_timeout(300)
    fa = '#form-activite '
    page.fill(fa + '[data-champ="nom"]', 'Sortie exercice')
    page.select_option(fa + '[data-champ="statut"]', 'Ouvert aux inscriptions')
    choisir_option_contenant(fa + '[data-champ="categorie"]', '2. ')
    page.dispatch_event(fa + '[data-champ="categorie"]', 'change'); page.wait_for_timeout(150)
    choisir_option_contenant(fa + '[data-champ="sousCategorie"]', '2.2')
    page.dispatch_event(fa + '[data-champ="sousCategorie"]', 'change')
    page.fill(fa + '[data-champ="dateDebut"]', '2026-12-05')
    page.fill(fa + '[data-champ="lieu"]', 'Paris')
    page.fill(fa + '[data-champ="maxParticipants"]', '20')
    page.select_option(fa + '[data-champ="nbEcheances"]', '3'); page.wait_for_timeout(150)
    page.type(fa + '[data-champ="prixParPersonne"]', '45')
    page.type(fa + '[data-champ="coutReelParPersonne"]', '60')
    for k, d in enumerate(['2026-11-15', '2026-12-01', '2026-12-15']):
        page.fill(f'#act-dates-echeances input[data-k="{k}"]', d)
    page.dispatch_event('#act-dates-echeances input[data-k="2"]', 'change')
    page.uncheck(fa + '[data-champ="notification"]')
    shot('tuto-activite-fiche', '#panneau-fiche-activite', items=[
        {'sel': fa + '[data-champ="nom"]', 'n': '1'},
        {'sel': fa + '[data-champ="sousCategorie"]', 'n': '2'},
        {'sel': fa + '[data-champ="dateDebut"]', 'n': '3'},
        {'sel': fa + '[data-champ="nbEcheances"]', 'n': '4'},
        {'sel': '#act-dates-echeances', 'n': '5'},
        {'sel': '#act-participation', 'n': '6', 'pos': 'tr'},
        {'sel': fa + '[data-champ="notification"]', 'n': '7', 'pos': 'l'},
        {'sel': '#act-enregistrer', 'n': '8'},
    ])
    page.click('#act-enregistrer'); fin(400)
    id_act = page.evaluate("APP.d.tables.Activites.find(a => a.nom === 'Sortie exercice').id")
    # calendrier de décembre : la sortie et ses échéances
    aller('chantier-4')
    page.evaluate("CAL.mois = 11; calRendreMois()"); page.wait_for_timeout(300)
    shot('cal-grille', q('#chantier-4 .zone-listes > .panel', 0), items=[
        {'sel': '#cal-precedent', 'n': '1', 'pos': 'l'},
        {'sel': '#cal-aujourdhui', 'n': '2', 'pos': 'tr'},
        {'sel': '#cal-grille .calendar-event:not(.echeance)', 'n': '3', 'pos': 'l'},
        {'sel': '#cal-grille .calendar-event.echeance', 'n': '4', 'pos': 'l'},
        {'sel': '#cal-legende', 'n': '5', 'pos': 'l', 'dx': 30},
    ])
    aller('chantier-3')
    page.select_option('#act-selection', id_act); page.wait_for_timeout(300)

    # --- T4 : inscription
    choisir_adherent('#ins-adherent-saisie', 'EXERCICE Paul')
    page.fill('#ins-montant', '45')
    shot('tuto-inscrire', '#form-inscription', pad=20, items=[
        {'sel': '#ins-adherent-saisie', 'n': '1'},
        {'sel': '#ins-montant', 'n': '2'},
        {'sel': '#ins-inscrire', 'n': '3'},
    ], depuis='#panneau-activite-selectionnee h4.sous-titre')
    page.click('#ins-inscrire'); fin(400)
    shot('tuto-cases', '#act-suivi', items=[
        {'sel': '#act-suivi .ech:nth-child(1) input', 'n': '1', 'pos': 'l', 'dx': 4},
        {'sel': '#act-suivi .ech:nth-child(1) .lien-date', 'n': '2', 'pos': 'tr'},
        {'sel': '#act-suivi [data-ech="desinscrire"]', 'n': '3', 'pos': 'tl'},
    ], depuis='#panneau-activite-selectionnee .liste-barre')
    # date prévue d'une échéance
    page.click('#act-suivi .ech:nth-child(3) .lien-date'); page.wait_for_timeout(300)
    shot_ecran('tuto-date-echeance', '.modale')
    non(); page.wait_for_timeout(200)

    # --- T5 : payer deux échéances
    page.click('#act-suivi .ech:nth-child(1) input[data-ech="payer"]'); page.wait_for_timeout(300)
    shot_ecran('tuto-payer', '.modale')
    oui(); fin(400)
    page.click('#act-suivi .ech:nth-child(2) input[data-ech="payer"]'); page.wait_for_timeout(300)
    page.select_option('.modale [data-champ="mode"]', 'Chèque')
    oui(); fin(400)
    shot('tuto-payees', '#act-suivi', items=[
        {'sel': '#act-suivi .ech:nth-child(1)', 'n': '1', 'pos': 'l', 'dx': 4},
        {'sel': '#act-suivi .ech:nth-child(3)', 'n': '2', 'pos': 'l', 'dx': 4},
    ])

    # --- T6 : payer puis rembourser la 3e
    page.click('#act-suivi .ech:nth-child(3) input[data-ech="payer"]'); page.wait_for_timeout(300)
    oui(); fin(400)
    page.click('#act-suivi .ech:nth-child(3) [data-ech="rembourser"]'); page.wait_for_timeout(300)
    shot_ecran('tuto-rembourser', '.modale')
    oui(); fin(400)
    shot('tuto-remboursee', '#act-suivi', items=[
        {'sel': '#act-suivi .ech:nth-child(3) .badge', 'n': '1', 'pos': 'tl', 'dy': -8},
        {'sel': '#act-suivi [data-ech="annuler-remb"]', 'n': '2', 'pos': 'r'},
    ])
    aller('chantier-2')
    page.locator('#liste-recettes').scroll_into_view_if_needed()
    page.fill('#liste-recettes .liste-recherche', 'Sortie exercice'); page.wait_for_timeout(250)
    shot('tuto-recettes-auto', q('#chantier-2 .zone-listes > .panel', 1), large=True, items=[
        {'sel': '#liste-recettes tbody tr:first-child td:nth-child(3)', 'n': '1', 'pos': 'tl', 'dx': 4},
        {'sel': '#liste-recettes tbody tr:last-child td:nth-child(8)', 'n': '2', 'pos': 'tl', 'dx': 20},
        {'sel': '#liste-recettes tbody tr:first-child td:nth-child(10) .badge', 'n': '3', 'pos': 'tr'},
    ])
    page.click('#liste-recettes .liste-raz'); page.wait_for_timeout(200)

    # --- T7 : dépense avec prestataire et justificatif
    page.click('#dep-nouvelle'); page.wait_for_timeout(300)
    fd = '#form-depense '
    page.fill(fd + '[data-champ="montant"]', '900')
    page.fill(fd + '[data-champ="libelle"]', 'Billetterie sortie exercice')
    choisir_option_contenant(fd + '[data-champ="categorie"]', '2. ')
    page.dispatch_event(fd + '[data-champ="categorie"]', 'change'); page.wait_for_timeout(150)
    choisir_option_contenant(fd + '[data-champ="sousCategorie"]', '2.2')
    page.dispatch_event(fd + '[data-champ="sousCategorie"]', 'change')
    choisir_option_contenant(fd + '[data-champ="prestataireId"]', 'Billetterie')
    page.select_option(fd + '[data-champ="activiteId"]', id_act)
    page.select_option(fd + '[data-champ="modePaiement"]', 'Virement')
    page.type(fd + '[data-champ="justificatif"]', 'https://drive.google.com/file/d/EXEMPLE/view')
    shot('tuto-depense', '#panneau-depense', items=[
        {'sel': fd + '[data-champ="date"]', 'n': '1'},
        {'sel': fd + '[data-champ="sousCategorie"]', 'n': '2'},
        {'sel': fd + '.descriptif-souscat', 'n': '3', 'pos': 'l', 'dx': 30},
        {'sel': fd + '[data-champ="prestataireId"]', 'n': '4'},
        {'sel': fd + '[data-champ="justificatif"]', 'n': '5'},
        {'sel': fd + '[data-radio="budgete"]', 'n': '6', 'pos': 'l'},
    ])
    page.click('#dep-enregistrer'); fin(400)
    page.fill('#liste-depenses .liste-recherche', 'exercice'); page.wait_for_timeout(250)
    shot('tuto-depense-liste', '#liste-depenses', max_h=300, large=True, items=[
        {'sel': '#liste-depenses tbody tr:first-child .lien-justif', 'n': '1', 'pos': 'r'},
    ])
    page.click('#liste-depenses .liste-raz'); page.wait_for_timeout(200)

    # --- T8 : location de mobil-home
    aller('chantier-3')
    page.click('#mh-nouvelle'); page.wait_for_timeout(300)
    fm = '#form-mobilhome '
    choisir_adherent('#mh-adherent-saisie', 'EXERCICE Paul')
    choisir_option_contenant(fm + '[data-champ="campingId"]', 'Pins Bleus')
    page.fill(fm + '[data-champ="semaine"]', '2027-07-03')
    page.fill(fm + '[data-champ="coutLocation"]', '400')
    page.dispatch_event(fm + '[data-champ="coutLocation"]', 'change'); page.wait_for_timeout(200)
    shot('tuto-mobilhome', '#panneau-mobilhome', items=[
        {'sel': '#mh-adherent-saisie', 'n': '1'},
        {'sel': fm + '[data-champ="semaine"]', 'n': '2'},
        {'sel': fm + '[data-champ="dateLignes"]', 'n': '3'},
        {'sel': '#mh-info-aide', 'n': '4', 'pos': 'l', 'dx': 30},
    ])
    page.click('#mh-enregistrer'); fin(400)

    # --- Fiche d'inscription
    page.select_option('#act-selection', id_act); page.wait_for_timeout(300)
    page.click('#act-fiche-inscription'); fin(400)
    shot('tuto-fiche-inscription', '#act-fiche-liens', pad=20, items=[
        {'sel': '#act-fiche-inscription', 'n': '1'},
        {'sel': '#act-fiche-liens', 'n': '2', 'pos': 'l', 'dx': 30},
    ], depuis='#act-modifier-selection')

    # --- T9 : désinscrire puis réinscrire
    aller('chantier-1')
    page.locator('#liste-adherents').scroll_into_view_if_needed()
    page.fill('#liste-adherents .liste-recherche', 'EXERCICE'); page.wait_for_timeout(250)
    shot('tuto-desinscrire-case', '#liste-adherents', max_h=200, items=[
        {'sel': f'#liste-adherents .case-liste[data-id="{id_paul}"]', 'n': '1', 'pos': 'l'},
    ])
    page.evaluate("id => adhDesinscrire(parId('Adherents', id))", id_paul); page.wait_for_timeout(300)
    page.select_option('.modale [data-champ="motifFin"]', 'Autre'); page.wait_for_timeout(150)
    shot_ecran('tuto-desinscrire', '.modale')
    oui(); fin(400)
    page.locator('#liste-archives').scroll_into_view_if_needed()
    page.fill('#liste-archives .liste-recherche', 'EXERCICE'); page.wait_for_timeout(250)
    shot('tuto-archives', q('#chantier-1 .zone-listes > .panel', 1), max_h=330, items=[
        {'sel': '#adh-arch-deces', 'n': '1'},
        {'sel': f'#liste-archives [data-action="reinscrire"][data-id="{id_paul}"]', 'n': '2', 'pos': 'l'},
    ])
    page.evaluate("id => adhReinscrire(parId('Adherents', id))", id_paul); page.wait_for_timeout(300)
    shot_ecran('tuto-reinscrire', '.modale')
    oui(); fin(400)

    # --- T10 : participation au tableau de bord
    aller('dashboard')
    choisir_adherent('#tdb-part-saisie', 'EXERCICE Paul')
    shot('tuto-participation', q('#dashboard .zone-listes .panel', 1), items=[
        {'sel': '#tdb-part-saisie', 'n': '1'},
        {'sel': '#tdb-part-valeur', 'n': '2'},
    ])

    # --- Budgets prévisionnels : bouton « Reprendre »
    aller('chantier-2')
    shot('tuto-budgets', '#panneau-budgets .form-actions', pad=14, items=[
        {'sel': '#bud-reprendre', 'n': '1'},
        {'sel': '#bud-enregistrer', 'n': '2'},
    ], depuis='#panneau-budgets')

    nav.close()

print(f'\n{len(liste_captures)} captures dans {SORTIE}')
if manquants_total:
    print('Sélecteurs à revoir :', manquants_total)
