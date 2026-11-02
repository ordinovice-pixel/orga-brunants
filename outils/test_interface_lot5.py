#!/usr/bin/env python3
"""
test_interface_lot5.py — Tableau de bord, Calendrier, rubriques reprises du POC, et choix du lot 4 tranchés
(dates d'échéances personnalisées, date des lignes mobil-home, formulaires colorés), dans le navigateur (aperçu local).
Les indicateurs, graphiques et alertes sont recalculés en Python de façon indépendante.
Usage : python3 outils/test_interface_lot5.py <dossier_chartjs_npm> [dossier_captures]
"""
import datetime
import pathlib
import re
import sys
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = (RACINE / 'Apercu_local_Brunants.html').as_uri()
NPM = pathlib.Path(sys.argv[1])
CAPTURES = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RACINE / 'captures'
CAPTURES.mkdir(parents=True, exist_ok=True)
CJ = (NPM / 'cj/package/dist/chart.umd.js').read_text()
DL = (NPM / 'dl/package/dist/chartjs-plugin-datalabels.min.js').read_text()
ok = ko = 0
erreurs = []


def verif(cond, libelle):
    global ok, ko
    if cond:
        ok += 1; print('  ✔', libelle)
    else:
        ko += 1; print('  ✘', libelle)


def euros(s):
    s = s.strip()
    neg = s.startswith('−') or s.startswith('-')
    v = float(re.sub(r'[^\d,]', '', s).replace(',', '.') or 0)
    return -v if neg else v


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def proche(a, b, tol=0.6):
    return abs(a - b) <= tol


# ---------- recalcul indépendant ----------
def actif(a, n):
    if not a['dateInscription'] or a['dateInscription'] > f'{n}-12-31':
        return False
    fin = a.get('dateFin') or (a.get('dateDeces') if a.get('deces') else '') or ''
    return not fin or fin >= f'{n}-01-01'


def tableau_de_bord(t, n, auj, cotisation_defaut):
    adh = [a for a in t['Adherents'] if actif(a, n)]
    tit = sum(1 for a in adh if a['type'] == 'Titulaire')
    nouveaux = sum(1 for a in t['Adherents'] if a['dateInscription'][:4] == str(n))
    dep = [d for d in t['Depenses'] if d['date'][:4] == str(n)]
    rec = [r for r in t['Recettes'] if r['date'][:4] == str(n)]
    bud = [b for b in t['Budgets'] if int(b['annee']) == n]
    cats = {}
    for b in bud:
        cats.setdefault(b['categorie'], [0.0, 0.0, 0.0])[0] += num(b['montant'])
    for d in dep:
        c = cats.setdefault(d['categorie'], [0.0, 0.0, 0.0])
        c[2 if d['budgete'] == 'Hors budget' else 1] += num(d['montant'])
    budget = sum(c[0] for c in cats.values()); consomme = sum(c[1] for c in cats.values())
    acts = [a for a in t['Activites'] if a['dateDebut'][:4] == str(n)]
    annulees = sum(1 for a in acts if a['statut'] == 'Annulé')
    realisees = sum(1 for a in acts if (a['dateFin'] or a['dateDebut']) < auj and a['statut'] != 'Annulé')
    mois_r = [0.0] * 12; mois_d = [0.0] * 12
    for r in rec:
        mois_r[int(r['date'][5:7]) - 1] += num(r['montant'])
    for d in dep:
        mois_d[int(d['date'][5:7]) - 1] += num(d['montant'])
    act_cat = {}
    for a in acts:
        if a['statut'] != 'Annulé':
            act_cat[a['categorie']] = act_cat.get(a['categorie'], 0) + 1
    # alertes
    inscrits = {i['id']: i for i in t['Inscriptions'] if i['statut'] == 'Inscrit'}
    retards = [e for e in t['Echeances'] if e['inscriptionId'] in inscrits and not e['paye'] and e['datePrevue'] and e['datePrevue'] < auj]
    depasse = [c for c, v in cats.items() if v[0] > 0 and v[1] > v[0]]
    exc = [a for a in adh if num(a['cotisation']) > cotisation_defaut]
    insc_par_act = {}
    for i in inscrits.values():
        insc_par_act[i['activiteId']] = insc_par_act.get(i['activiteId'], 0) + 1
    presque = [a for a in t['Activites'] if a['statut'] != 'Annulé' and a['maxParticipants'] not in ('', None) and a['dateDebut'] >= auj
               and num(a['maxParticipants']) - insc_par_act.get(a['id'], 0) <= 3]
    prochaines = sorted([a for a in acts if (a['dateFin'] or a['dateDebut']) >= auj], key=lambda a: a['dateDebut'])
    if not prochaines:
        prochaines = sorted(acts, key=lambda a: a['dateDebut'], reverse=True)
    return {'effectif': len(adh), 'tit': tit, 'sym': len(adh) - tit, 'nouveaux': nouveaux, 'solde': budget - consomme, 'budget': budget,
            'realisees': realisees, 'prevues': len(acts) - annulees, 'restantes': len(acts) - annulees - realisees,
            'mois_r': mois_r, 'mois_d': mois_d, 'cats': {c: v[1] + v[2] for c, v in cats.items() if v[1] + v[2] > 0}, 'act_cat': act_cat,
            'retards': retards, 'total_retards': sum(num(e['montant']) for e in retards), 'depasse': depasse, 'exc': exc,
            'exc_total': sum(num(a['cotisation']) - cotisation_defaut for a in exc), 'presque': presque, 'prochaines': [a['nom'] for a in prochaines[:8]]}


def evenements_mois(t, annee, mois):
    """Nombre d'événements par jour du mois : activités de l'année (chaque jour de leur durée) + dates d'échéances des fiches."""
    debut = datetime.date(annee, mois, 1)
    fin = (datetime.date(annee + (mois == 12), mois % 12 + 1, 1) - datetime.timedelta(days=1))
    par_jour = {}
    for a in t['Activites']:
        if a['dateDebut'][:4] != str(annee):
            continue
        d0 = datetime.date.fromisoformat(a['dateDebut'])
        d1 = datetime.date.fromisoformat(a['dateFin']) if a['dateFin'] and a['dateFin'] > a['dateDebut'] else d0
        d = max(d0, debut)
        while d <= min(d1, fin):
            par_jour[d.day] = par_jour.get(d.day, 0) + 1
            d += datetime.timedelta(days=1)
    for a in t['Activites']:
        if not a.get('datesEcheances') or a['statut'] == 'Annulé':
            continue
        for x in re.split(r'[;,]', a['datesEcheances']):
            m = re.match(r'^\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*$', x)
            if m:
                d = datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
                if debut <= d <= fin:
                    par_jour[d.day] = par_jour.get(d.day, 0) + 1
    return par_jour


def route(r):
    r.fulfill(status=200, content_type='application/javascript', body=CJ if 'Chart.js' in r.request.url else DL)


with sync_playwright() as p:
    nav = p.chromium.launch()
    page = nav.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    page.route('**/cdnjs.cloudflare.com/**', route)
    page.goto(PAGE)
    page.wait_for_selector('#chargement', state='hidden', timeout=15000)
    page.wait_for_timeout(800)

    def fin():
        page.wait_for_selector('#chargement', state='hidden', timeout=15000)
        page.wait_for_timeout(250)

    def notif():
        return page.locator('.notification').last.inner_text()

    def T():
        return page.evaluate('APP.d.tables')

    def txt(sel):
        return page.inner_text(sel).strip()

    def oui():
        page.click('.modale [data-r="oui"]')

    auj = page.evaluate('APP.d.aujourdhui')
    cot = page.evaluate('Number(APP.d.parametres.COTISATION_DEFAUT)')

    def controle_tdb(n):
        a = tableau_de_bord(T(), n, auj, cot)
        verif(txt('#tdb-kpi-effectif') == str(a['effectif']) and f"dont {a['nouveaux']} " in txt('#tdb-kpi-effectif-detail'),
              f"{n} : effectif {a['effectif']} dont {a['nouveaux']} nouveaux arrivants")
        verif(txt('#tdb-kpi-types') == f"{a['tit']} / {a['sym']}", f"{n} : titulaires / sympathisants {a['tit']} / {a['sym']}")
        verif(proche(euros(txt('#tdb-kpi-solde')), a['solde']), f"{n} : solde budget {a['solde']:.2f} € (identique à Budget & Compta)")
        verif(txt('#tdb-kpi-activites') == f"{a['realisees']} / {a['prevues']}" and txt('#tdb-kpi-activites-detail').startswith(f"{a['restantes']} restante"),
              f"{n} : activités réalisées / prévues {a['realisees']} / {a['prevues']}, {a['restantes']} restante(s)")
        g = page.evaluate("[GRAPHIQUES['tdb-graph-mensuel'].data.datasets.map(d => d.data), GRAPHIQUES['tdb-graph-mensuel'].config.plugins.map(x => x.id)]")
        verif(all(proche(x, y, 0.01) for x, y in zip(g[0][0], a['mois_r'])) and all(proche(x, y, 0.01) for x, y in zip(g[0][1], a['mois_d'])) and 'datalabels' in g[1],
              f"{n} : Recettes vs Dépenses = recalcul (12 mois), montants écrits sur les barres")
        dn = page.evaluate("(() => { const g = GRAPHIQUES['tdb-graph-categories']; return [g.data.labels, g.data.datasets[0].data, g.config.plugins.map(x => x.id)]; })()")
        verif(dict(zip(dn[0], dn[1])) == {k: round(v, 2) for k, v in a['cats'].items()} and 'datalabels' in dn[2], f"{n} : répartition des dépenses = recalcul ({len(dn[0])} catégories), montants et % affichés")
        ac = page.evaluate("(() => { const g = GRAPHIQUES['tdb-graph-activites']; return [g.data.labels, g.data.datasets[0].data]; })()")
        verif(dict(zip(ac[0], ac[1])) == a['act_cat'], f"{n} : activités par catégorie = recalcul {a['act_cat']}")
        pro = page.eval_on_selector_all('#tdb-prochaines .timeline-title .lien-bouton', 'b => b.map(x => x.textContent)')
        verif(pro == a['prochaines'], f"{n} : chronologie des activités = recalcul ({len(pro)} : {', '.join(pro[:3])}…)")
        return a

    print('\n1. Tableau de bord : indicateurs et graphiques recalculés')
    a26 = controle_tdb(2026)
    page.screenshot(path=str(CAPTURES / 'l5_01_tableau_de_bord.png'), full_page=False)
    alertes = page.eval_on_selector_all('#tdb-alertes .alert-item strong', 'b => b.map(x => x.textContent)')
    ret = [x for x in alertes if 'en retard' in x]
    verif(ret and ret[0].startswith(f"{len(a26['retards'])} échéance(s)") and proche(euros(ret[0].split('total :')[1]), a26['total_retards']),
          f"alerte échéances en retard : {len(a26['retards'])} pour {a26['total_retards']:.0f} € = recalcul")
    dep = [x for x in alertes if 'dépassement' in x]
    verif(sorted(x.split(' — ')[0] for x in dep) == sorted(a26['depasse']), f"alertes dépassement de budget : {a26['depasse']}")
    exc = [x for x in alertes if 'supérieure' in x]
    verif((not a26['exc'] and not exc) or (exc and exc[0].split(' cotisation')[0].endswith(str(len(a26['exc']))) and proche(euros(exc[0].split(':')[1]), a26['exc_total'])),
          f"alerte cotisations supérieures : {len(a26['exc'])} pour {a26['exc_total']:.0f} €")
    pres = [x for x in alertes if 'place(s) restante(s)' in x or 'complète' in x]
    verif(len(pres) == len(a26['presque']), f"alertes activités presque complètes : {len(a26['presque'])}")
    urg = page.locator('#tdb-alertes .alert-item:not(.warning):not(.info)').count()
    verif(txt('#tdb-kpi-alertes') == str(len(alertes)) and (f'{urg} urgente' in txt('#tdb-kpi-alertes-detail') if urg else True), f"carte « Alertes actives » : {len(alertes)} dont {urg} urgente(s)")
    if exc:
        page.click('#tdb-alertes button:has-text("Afficher la liste")')
        verif(page.locator('#tdb-liste-excedents tbody tr').count() == len(a26['exc']), 'liste des cotisations supérieures dépliée')

    print('\n2. Tableau de bord : participation et navigation')
    t = T()
    # adhérent qui a une participation de l'association en 2026 (activité payante ou mobil-home)
    idp = page.evaluate("T('Adherents').filter(a => CALC.totalParticipation(a.id, 2026) > 0)[0].id")
    adh = next(x for x in t['Adherents'] if x['id'] == idp)
    page.fill('#tdb-part-saisie', f"{adh['nom']} {adh['prenom']} — {adh['id']}")
    page.dispatch_event('#tdb-part-saisie', 'change')
    attendu = page.evaluate(f"CALC.totalParticipation('{adh['id']}', 2026)")
    verif(proche(euros(txt('#tdb-part-valeur')), attendu, 0.01) and page.locator('#tdb-part-detail tbody tr').count() >= 1,
          f"participation cumulée de {adh['id']} : {txt('#tdb-part-valeur')} avec le détail")
    if ret:
        page.click('#tdb-alertes .alert-item:has-text("en retard") button')
        page.wait_for_timeout(400)
        verif(page.evaluate("APP.rubrique") == 'chantier-3' and page.input_value('#act-suivi-filtre') == 'retard', 'clic « Voir » sur les retards → Activités, filtre « en retard »')
    page.click('.nav-item[data-section="dashboard"]')
    page.click('#tdb-prochaines .lien-bouton >> nth=0')
    page.wait_for_timeout(300)
    verif(page.evaluate("APP.rubrique") == 'chantier-3' and page.input_value('#act-selection') == next(a['id'] for a in t['Activites'] if a['nom'] == a26['prochaines'][0]),
          'clic sur une prochaine activité → elle est sélectionnée dans Activités')
    page.click('.nav-item[data-section="dashboard"]')
    page.select_option('#annee-select', '2025')
    page.wait_for_timeout(600)
    controle_tdb(2025)
    verif(txt('#tdb-prochaines-titre') == 'Activités de 2025', 'année passée : la liste montre les activités de 2025')
    page.select_option('#annee-select', '2026')
    page.wait_for_timeout(500)

    print('\n3. Calendrier')
    page.click('.nav-item[data-section="chantier-4"]')
    page.wait_for_timeout(400)
    mois_auj = int(auj[5:7])
    verif(txt('#cal-mois-libelle').lower().endswith('2026') and page.evaluate('CAL.mois') == mois_auj - 1, 'ouvre sur le mois en cours : ' + txt('#cal-mois-libelle'))
    ecarts = []
    for m in range(1, 13):
        page.evaluate(f'CAL.mois = {m - 1}; calRendreMois()')
        lu = page.evaluate("""(() => { const r = {}; document.querySelectorAll('#cal-grille .calendar-day:not(.outside)').forEach(d => {
            const n = d.querySelectorAll('.calendar-event').length; if (n) r[d.querySelector('.calendar-day-number').textContent] = n; }); return r; })()""")
        attendu = {str(k): v for k, v in evenements_mois(T(), 2026, m).items()}
        if lu != attendu:
            ecarts.append(m)
    verif(not ecarts, 'événements des 12 mois de 2026 = recalcul (activités sur toute leur durée + dates d\'échéances des fiches)' + (f' — écarts {ecarts}' if ecarts else ''))
    page.evaluate('CAL.mois = 10; calRendreMois()')   # novembre : échéance 2 du repas + zoo
    ev = page.eval_on_selector_all('#cal-grille .calendar-event', 'e => e.map(x => x.textContent)')
    verif(any(x.startswith('€ Échéance 2') for x in ev) and any('Thoiry' in x for x in ev), 'novembre 2026 : sortie au zoo et échéance n° 2 du repas affichées')
    verif(txt('#cal-kpi-mois') == str(page.locator('#cal-liste tr').count()), 'liste du mois = indicateur « activités du mois affiché »')
    page.screenshot(path=str(CAPTURES / 'l5_02_calendrier.png'), full_page=False)
    page.evaluate('CAL.mois = 0; calRendreMois()')
    verif(page.is_disabled('#cal-precedent'), 'navigation bornée à l\'année choisie (janvier : ◀ inactif)')
    page.evaluate('CAL.mois = 10; calRendreMois()')
    page.click('#cal-grille .calendar-event:has-text("Thoiry")')
    page.wait_for_timeout(300)
    verif(page.evaluate('APP.rubrique') == 'chantier-3' and 'Thoiry' in txt('#act-fiche-resume'), 'clic sur un événement → activité ouverte')
    page.click('.nav-item[data-section="chantier-4"]')
    page.fill('#cal-nouvelle-date', '2026-12-19')
    page.click('#cal-nouvelle')
    page.wait_for_timeout(400)
    verif(page.evaluate('APP.rubrique') == 'chantier-3' and page.input_value('#form-activite [data-champ="dateDebut"]') == '2026-12-19', '« + Nouvelle activité à cette date » → fiche activité au 19/12/2026')

    print('\n4. Dates d\'échéances personnalisées (fiche activité et suivi)')
    f = '#form-activite'
    page.fill(f + ' [data-champ="nom"]', 'Escapade en Baie de Somme')
    page.select_option(f + ' [data-champ="categorie"]', '1. Séjours et villégiatures')
    page.select_option(f + ' [data-champ="statut"]', 'Ouvert aux inscriptions')
    page.select_option(f + ' [data-champ="nbEcheances"]', '3')
    verif(page.locator('#act-dates-echeances input').count() == 3, 'une case date par échéance (3)')
    page.uncheck(f + ' [data-champ="notification"]')
    page.fill(f + ' [data-champ="prixParPersonne"]', '240')
    for k, d in enumerate(['2026-11-05', '2026-12-05', '2027-02-05']):
        page.fill(f'#act-dates-echeances input[data-k="{k}"]', d)
        page.dispatch_event(f'#act-dates-echeances input[data-k="{k}"]', 'change')
    verif(page.input_value(f + ' [data-champ="datesEcheances"]') == '05/11/2026; 05/12/2026; 05/02/2027', 'dates recopiées : ' + page.input_value(f + ' [data-champ="datesEcheances"]'))
    page.click('#act-enregistrer')
    fin()
    id_act = re.search(r'ACT-2026-\d{3}', notif()).group(0)
    a = next(x for x in T()['Activites'] if x['id'] == id_act)
    verif(a['datesEcheances'] == '05/11/2026; 05/12/2026; 05/02/2027', f'{id_act} enregistrée avec ses dates d\'échéances (la 3e après l\'activité)')
    adh2 = next(x for x in T()['Adherents'] if not x.get('desinscrit') and not x.get('deces') and not x.get('dateFin'))
    page.fill('#ins-adherent-saisie', f"{adh2['nom']} {adh2['prenom']} — {adh2['id']}")
    page.dispatch_event('#ins-adherent-saisie', 'change')
    page.click('#ins-inscrire')
    fin()
    t = T()
    ins = next(i for i in t['Inscriptions'] if i['activiteId'] == id_act)
    ech = sorted([e for e in t['Echeances'] if e['inscriptionId'] == ins['id']], key=lambda e: e['numero'])
    verif([e['datePrevue'] for e in ech] == ['2026-11-05', '2026-12-05', '2027-02-05'], 'inscription : échéances aux dates de la fiche')
    page.click(f'#act-suivi button[data-ech="date"][data-id="{ech[2]["id"]}"]')
    page.fill('.modale [data-champ="date"]', '2027-03-20')
    oui(); fin()
    verif(next(e for e in T()['Echeances'] if e['id'] == ech[2]['id'])['datePrevue'] == '2027-03-20', 'date d\'une échéance modifiée depuis le suivi : ' + notif().split('\n')[0])
    page.click('#act-modifier-selection')
    page.wait_for_timeout(300)
    verif(page.is_visible('#act-appliquer-bloc') and page.locator('#act-dates-echeances input').count() == 3, 'fiche avec inscrits : case « appliquer aux échéances non payées » proposée')
    page.fill('#act-dates-echeances input[data-k="0"]', '2026-11-10')
    page.dispatch_event('#act-dates-echeances input[data-k="0"]', 'change')
    page.check('#act-appliquer-echeances')
    page.click('#act-enregistrer')
    fin()
    verif(next(e for e in T()['Echeances'] if e['id'] == ech[0]['id'])['datePrevue'] == '2026-11-10' and 'recalée' in notif(), 'dates appliquées aux inscrits : ' + notif().split('\n')[-1])

    print('\n5. Mobil-home : date de paiement')
    page.click('#mh-nouvelle')
    verif(page.input_value('#form-mobilhome [data-champ="dateLignes"]') == auj, 'date de paiement proposée : le jour de la saisie')
    t = T()
    loue = {m['adherentId'] for m in t['MobilHome'] if int(m['annee']) == 2026}
    tit = next(x for x in t['Adherents'] if x['type'] == 'Titulaire' and not x.get('desinscrit') and not x.get('deces') and not x.get('dateFin') and x['id'] not in loue and x['dateInscription'] < '2026-01-01')
    page.fill('#mh-adherent-saisie', f"{tit['nom']} {tit['prenom']} — {tit['id']}")
    page.dispatch_event('#mh-adherent-saisie', 'change')
    page.select_option('#form-mobilhome [data-champ="campingId"]', 'PRE-005')
    page.fill('#form-mobilhome [data-champ="semaine"]', '2026-08-15')
    page.fill('#form-mobilhome [data-champ="coutLocation"]', '330')
    page.fill('#form-mobilhome [data-champ="dateLignes"]', '2026-10-01')
    page.click('#mh-enregistrer')
    fin()
    t = T()
    m = next(x for x in t['MobilHome'] if x['adherentId'] == tit['id'] and x['semaine'] == '2026-08-15')
    verif(next(d for d in t['Depenses'] if d['id'] == m['depenseId'])['date'] == '2026-10-01' and next(r for r in t['Recettes'] if r['id'] == m['recetteId'])['date'] == '2026-10-01',
          'dépense et recette de la location datées du 01/10/2026')

    print('\n6. Budget & Compta : formulaires colorés et rubriques reprises du POC')
    page.click('.nav-item[data-section="chantier-2"]')
    page.wait_for_timeout(300)
    fonds = page.evaluate("""[getComputedStyle(document.querySelector('#panneau-depense .panel-header')).backgroundColor,
                              getComputedStyle(document.querySelector('#panneau-recette .panel-header')).backgroundColor]""")
    verif(fonds == ['rgb(250, 219, 216)', 'rgb(213, 245, 227)'], f'en-têtes des formulaires : dépense rouge clair, recette vert clair {fonds}')
    verif('datalabels' in page.evaluate("GRAPHIQUES['bud-graph-mensuel'].config.plugins.map(x => x.id)"), 'Budget : montants écrits sur le graphique Recettes vs Dépenses')
    for sec, nom in (('chantier-5', 'Procédures'), ('chantier-6', 'Assemblée Générale'), ('chantier-7', 'Classement NAS')):
        page.click(f'.nav-item[data-section="{sec}"]')
        page.wait_for_timeout(200)
        zones = page.eval_on_selector_all(f'#{sec} > .zone', 'z => z.map(x => x.className.replace("zone ", ""))')
        actifs = page.locator(f'#{sec} button:not([disabled])').count()
        verif(zones == ['zone-indicateurs', 'zone-saisie', 'zone-listes'] and actifs == 0 and page.locator(f'#{sec} .a-venir').count() == 0,
              f'{nom} : contenu du POC dans les 3 zones, boutons inactifs (« version ultérieure »)')
    verif('Brunants_Archives' in txt('#chantier-7 .file-tree') and page.locator('#chantier-5 #chantier-5').count() == 0, 'contenu du POC présent (arborescence NAS, registre des procédures)')

    print('\n7. Affichage mobile')
    page.set_viewport_size({'width': 390, 'height': 844})
    for sec in ('dashboard', 'chantier-4', 'chantier-6'):
        page.click('.nav-item[data-section="%s"]' % sec)
        page.wait_for_timeout(400)
        w = page.evaluate('document.documentElement.scrollWidth')
        verif(w <= 392, f'{sec} : pas de défilement horizontal ({w}px)')
    page.screenshot(path=str(CAPTURES / 'l5_03_mobile.png'), full_page=False)

    verif(not erreurs, 'aucune erreur JavaScript' + (f' — {erreurs[:3]}' if erreurs else ''))
    nav.close()

print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
