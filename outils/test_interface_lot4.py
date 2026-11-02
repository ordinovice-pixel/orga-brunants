#!/usr/bin/env python3
"""
test_interface_lot4.py — Teste la rubrique Activités (activités, inscriptions, échéances, mobil-home, aides,
subventions, coût par activité) dans un navigateur (aperçu local), recalcule les indicateurs en Python
de façon indépendante, puis vérifie les nouveaux champs de Budget & Compta et la réinitialisation.
Usage : python3 outils/test_interface_lot4.py <dossier_chartjs_npm> [dossier_captures]
"""
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


def proche(a, b, tol=0.6):
    return abs(a - b) <= tol


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


# ---------- recalcul indépendant ----------
def actif(a, n):
    if not a['dateInscription'] or a['dateInscription'] > f'{n}-12-31':
        return False
    fin = a.get('dateFin') or (a.get('dateDeces') if a.get('deces') else '') or ''
    return not fin or fin >= f'{n}-01-01'


def cout_pp(act):
    if act['coutReelParPersonne'] not in ('', None):
        return float(act['coutReelParPersonne'])
    prix, part = num(act['prixParPersonne']), num(act.get('participationEuro'))
    return prix + part if (prix or part) else None


def activites(t, n, auj):
    acts = {a['id']: a for a in t['Activites']}
    de_n = [a for a in t['Activites'] if a['dateDebut'][:4] == str(n)]
    realisees = sum(1 for a in de_n if (a['dateFin'] or a['dateDebut']) < auj and a['statut'] != 'Annulé')
    annulees = sum(1 for a in de_n if a['statut'] == 'Annulé')
    adh = [a for a in t['Adherents'] if actif(a, n)]
    pa = {}          # adhérent → liste des participations Asso de l'année
    for i in t['Inscriptions']:
        a = acts.get(i['activiteId'])
        if i['statut'] == 'Désinscrit' or not a or a['dateDebut'][:4] != str(n):
            continue
        c = cout_pp(a)
        paye = num(i['montantDu']) if i['montantDu'] != '' else num(a['prixParPersonne'])
        pa.setdefault(i['adherentId'], []).append(0 if c is None else max(0, c - paye))
    mh = [m for m in t['MobilHome'] if int(m['annee']) == n]
    for m in mh:
        pa.setdefault(m['adherentId'], []).append(num(m['aideAsso']))
    ids_actifs = {a['id'] for a in adh}
    participants = [x for x in ids_actifs if x in pa]
    subv = [a for a in adh if sum(pa.get(a['id'], [])) > 0]
    regions = {}
    for r in ['Île-de-France', 'Province']:
        base = [a for a in adh if (a['region'] or '') == r]
        regions[r] = (len([a for a in subv if (a['region'] or '') == r]), len(base))
    ech = {}
    for e in t['Echeances']:
        ech.setdefault(e['inscriptionId'], []).append(e)
    enc = reste = attente = 0
    couts = []
    for a in sorted(de_n, key=lambda x: x['dateDebut']):
        ins_a = [i for i in t['Inscriptions'] if i['activiteId'] == a['id']]
        payees = total = 0
        for i in ins_a:
            for e in ech.get(i['id'], []):
                if e['paye'] and not e['rembourse']:   # remboursée : déduite (lot 5)
                    enc += num(e['montant'])
                if i['statut'] == 'Inscrit':
                    total += 1
                    if e['paye']:
                        payees += 1
                    else:
                        reste += num(e['montant']); attente += 1
        inscrits = [i for i in ins_a if i['statut'] == 'Inscrit']
        c = cout_pp(a)
        ct = 0 if c is None else c * len(inscrits)
        p = sum(0 if c is None else max(0, c - (num(i['montantDu']) if i['montantDu'] != '' else num(a['prixParPersonne']))) for i in inscrits)
        couts.append((a['nom'], len(inscrits), ct, p, payees, total))
    camp = {}
    noms = {p['id']: p['raisonSociale'] for p in t['Prestataires']}
    for m in mh:
        k = noms.get(m['campingId'], '(camping non renseigné)')
        x = camp.setdefault(k, [0, 0.0, 0.0])
        x[0] += 1; x[1] += num(m['coutLocation']); x[2] += num(m['aideAsso'])
    return {
        'nombre': len(de_n), 'realisees': realisees, 'annulees': annulees,
        'participants': len(participants), 'actifs': len(adh),
        'encaisse': enc, 'reste': reste, 'attente': attente,
        'mh_semaines': len(mh), 'mh_total': sum(num(m['coutLocation']) for m in mh), 'mh_aides': sum(num(m['aideAsso']) for m in mh),
        'mh_nb_aides': sum(1 for m in mh if num(m['aideAsso']) > 0), 'camp': camp,
        'subv': len(subv), 'subv_montant': sum(sum(pa.get(a['id'], [])) for a in adh), 'regions': regions,
        'couts': couts,
    }


def route(r):
    r.fulfill(status=200, content_type='application/javascript', body=CJ if 'Chart.js' in r.request.url else DL)


with sync_playwright() as p:
    nav = p.chromium.launch()
    page = nav.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    page.route('**/cdnjs.cloudflare.com/**', route)
    page.goto(PAGE)
    page.wait_for_selector('#chargement', state='hidden', timeout=15000)

    def fin():
        page.wait_for_selector('#chargement', state='hidden', timeout=15000)
        page.wait_for_timeout(250)

    def notif():
        return page.locator('.notification').last.inner_text()

    def T():
        return page.evaluate('APP.d.tables')

    def oui():
        page.click('.modale [data-r="oui"]')

    def txt(sel):
        return page.inner_text(sel).strip()

    auj = page.evaluate('APP.d.aujourdhui')
    page.click('.nav-item[data-section="chantier-3"]')
    page.wait_for_timeout(400)

    def controle(n, titre):
        a = activites(T(), n, auj)
        verif(txt('#act-kpi-nombre') == str(a['nombre']) and f"{a['realisees']} réalisée(s)" in txt('#act-kpi-nombre-detail'),
              f"{titre} : {a['nombre']} activités, {a['realisees']} réalisée(s) — " + txt('#act-kpi-nombre-detail'))
        verif(txt('#act-kpi-participants') == f"{a['participants']} / {a['actifs']}" and txt('#act-kpi-non') == str(a['actifs'] - a['participants']),
              f"{titre} : participants {a['participants']} / {a['actifs']}, non-participants {a['actifs'] - a['participants']}")
        det = txt('#act-kpi-encaisse-detail')
        verif(proche(euros(txt('#act-kpi-encaisse')), a['encaisse']) and f"({a['attente']} échéance(s)" in det
              and proche(euros(det.split('reste dû')[1].split('(')[0]), a['reste']),
              f"{titre} : encaissé {a['encaisse']:.2f} €, reste dû {a['reste']:.2f} € ({a['attente']} échéances en attente)")
        verif(txt('#mh-kpi-semaines') == str(a['mh_semaines']) and proche(euros(txt('#mh-kpi-total')), a['mh_total'])
              and proche(euros(txt('#mh-kpi-asso')), a['mh_aides']) and txt('#mh-kpi-asso-detail').startswith(f"{a['mh_nb_aides']} aide(s)"),
              f"{titre} : mobil-home {a['mh_semaines']} semaine(s), montant total {a['mh_total']:.0f} €, aides {a['mh_aides']:.0f} € ({a['mh_nb_aides']} aides)")
        rows = page.eval_on_selector_all('#mh-campings tr', 'r => r.map(x => [...x.cells].map(c => c.innerText.trim()))')
        attendu = {k: v for k, v in a['camp'].items()}
        lu = {r[0]: r for r in rows if r[0] != 'Total' and len(r) == 4}
        camp_ok = set(lu) == set(attendu) and all(int(lu[k][1]) == v[0] and proche(euros(lu[k][2]), v[1], 0.01) and proche(euros(lu[k][3]), v[2], 0.01) for k, v in attendu.items())
        tot = [r for r in rows if r[0] == 'Total']
        camp_ok = camp_ok and (not attendu or (tot and int(tot[0][1]) == a['mh_semaines']))
        verif(camp_ok, f"{titre} : semaines vendues par camping " + ', '.join(f'{k} {v[0]}' for k, v in attendu.items()) + f" · total {a['mh_semaines']}")
        verif(txt('#sub-kpi-global') == f"{a['subv']} / {a['actifs']}" and proche(euros(txt('#sub-kpi-montant')), a['subv_montant']),
              f"{titre} : adhérents subventionnés {a['subv']} / {a['actifs']}, montant {a['subv_montant']:.2f} €")
        reg = page.eval_on_selector_all('#sub-regions tr', 'r => r.map(x => [...x.cells].map(c => c.innerText.trim()))')
        reg_ok = all(any(r[0] == k and r[1] == f'{v[0]} / {v[1]}' for r in reg) for k, v in a['regions'].items())
        verif(reg_ok, f"{titre} : subventions par région " + ', '.join(f'{k} {v[0]}/{v[1]}' for k, v in a['regions'].items()))
        cts = page.eval_on_selector_all('#act-couts tr', 'r => r.map(x => [...x.cells].map(c => c.innerText.trim()))')
        ecarts = []
        for (nom, nins, ct, pa_, payees, total), r in zip(a['couts'], cts):
            if not r[0].startswith(nom) or not r[2].startswith(str(nins)) or not proche(euros(r[3]), ct, 0.01) or not proche(euros(r[5].split('(')[0]), pa_, 0.01):
                ecarts.append(nom)
            elif total and r[6] != f'{payees} / {total} payées':
                ecarts.append(nom + ' (paiements)')
        verif(len(cts) == len(a['couts']) and not ecarts, f"{titre} : coût par activité ({len(a['couts'])} lignes : inscrits, coût total, part asso, paiements)" + (f' — écarts {ecarts}' if ecarts else ''))
        return a

    print('\n1. Indicateurs de la rubrique Activités, recalculés')
    a26 = controle(2026, '2026')
    page.screenshot(path=str(CAPTURES / 'l4_01_indicateurs.png'), full_page=False)
    page.select_option('#annee-select', '2025')
    page.wait_for_timeout(500)
    controle(2025, '2025')
    page.select_option('#annee-select', '2026')
    page.wait_for_timeout(500)
    t = T()
    par = {}
    for m in t['MobilHome']:
        if num(m['aideAsso']) > 0:
            par[(m['adherentId'], m['annee'])] = par.get((m['adherentId'], m['annee']), 0) + 1
    verif(max(par.values()) <= 2, 'données : jamais plus de 2 aides de 60 € par titulaire et par an')
    aides_rows = page.eval_on_selector_all('#liste-aides-mh tbody tr', 'r => r.map(x => [...x.cells].map(c => c.innerText.trim()))')
    verif(aides_rows and all(re.match(r'^[012] / 2$', r[3]) for r in aides_rows), f'liste « aides par titulaire » : {len(aides_rows)} titulaire(s), aides ≤ 2 / 2')

    print('\n2. Nouvelle activité (notification cochée par défaut)')
    f = '#form-activite'
    verif(page.is_checked(f + ' [data-champ="notification"]'), 'case « Notification par mail » cochée par défaut')
    opts = page.eval_on_selector_all(f + ' [data-champ="nbEcheances"] option', 'o => o.map(x => x.value)')
    verif(opts == [str(i) for i in range(1, 13)], 'nombre d\'échéances : 1 à 12')
    lib = page.eval_on_selector_all('#form-activite label', 'l => l.map(x => x.textContent)')
    verif(any('Prix par personne' in x for x in lib) and not any('Récurrence' in x or 'taux' in x.lower() for x in lib),
          '« Prix par personne » présent ; ni « Récurrence » ni « taux d\'inscription »' + ('' if any('Prix par personne' in x for x in lib) else f' {lib}'))
    page.click('#act-enregistrer')
    verif('obligatoire' in page.inner_text(f + ' .form-erreurs'), 'champs obligatoires signalés')
    page.fill(f + ' [data-champ="nom"]', 'Atelier cuisine test')
    page.select_option(f + ' [data-champ="statut"]', 'Ouvert aux inscriptions')
    page.select_option(f + ' [data-champ="categorie"]', '2. Sorties et spectacles')
    sc = [o for o in page.eval_on_selector_all(f + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)') if o]
    page.select_option(f + ' [data-champ="sousCategorie"]', sc[0])
    page.fill(f + ' [data-champ="dateDebut"]', '2026-12-05')
    page.fill(f + ' [data-champ="lieu"]', 'Salle des fêtes')
    page.fill(f + ' [data-champ="maxParticipants"]', '3')
    page.fill(f + ' [data-champ="budgetPrevu"]', '450')
    page.select_option(f + ' [data-champ="nbEcheances"]', '3')
    page.fill(f + ' [data-champ="prixParPersonne"]', '90')
    page.fill(f + ' [data-champ="coutReelParPersonne"]', '150')
    verif(page.input_value('#act-participation') == '60 € · 40 %', 'participation de l\'association calculée en direct : ' + page.input_value('#act-participation'))
    mails_avant = page.evaluate('FauxGAS.mails.length')
    page.click('#act-enregistrer')
    fin()
    m = re.search(r'ACT-2026-\d{3}', notif())
    verif(m is not None, 'message : ' + notif().split('\n')[0][:140])
    id_act = m.group(0) if m else ''
    mails = page.evaluate('FauxGAS.mails')
    verif(len(mails) == mails_avant + 1 and mails[-1]['to'] == 'apercu.local@exemple.fr' and 'ENTRAÎNEMENT' in mails[-1]['subject']
          and 'Atelier cuisine test' in mails[-1]['htmlBody'], 'notification envoyée : 1 seul mail, à l\'adresse de test (mode entraînement) — « ' + (mails[-1]['subject'] if mails else '') + ' »')
    verif(page.input_value('#act-selection') == id_act and 'Atelier cuisine test' in txt('#act-fiche-resume'), 'la nouvelle activité est sélectionnée pour les inscriptions')
    verif(int(txt('#act-kpi-nombre')) == a26['nombre'] + 1, 'indicateur « activités » +1')

    print('\n3. Inscriptions (maximum 3) et cases de paiement')
    t = T()
    deja = {i['adherentId'] for i in t['Inscriptions'] if i['activiteId'] == id_act}
    cands = [a for a in t['Adherents'] if not a.get('desinscrit') and not a.get('deces') and not a.get('dateFin') and a['id'] not in deja]
    cands.sort(key=lambda a: a['id'])
    choisis = cands[:4]

    def inscrire(a):
        page.fill('#ins-adherent-saisie', f"{a['nom']} {a['prenom']} — {a['id']}")
        page.dispatch_event('#ins-adherent-saisie', 'change')
        page.click('#ins-inscrire')
        fin()

    for a in choisis[:3]:
        inscrire(a)
    t = T()
    ins = [i for i in t['Inscriptions'] if i['activiteId'] == id_act and i['statut'] == 'Inscrit']
    ech = {i['id']: sorted([e for e in t['Echeances'] if e['inscriptionId'] == i['id']], key=lambda e: e['numero']) for i in ins}
    verif(len(ins) == 3 and all(len(v) == 3 and proche(sum(num(e['montant']) for e in v), 90, 0.001) for v in ech.values()),
          '3 inscrits, 3 échéances chacun (total 90 €)')
    dates = [e['datePrevue'] for e in next(iter(ech.values()))]
    verif(dates == sorted(dates) and dates[-1] < '2026-12-05' and dates[0] >= auj, 'dates prévues échelonnées avant l\'activité : ' + ', '.join(dates))
    verif(txt('#act-suivi-compteur').startswith('3') and page.locator('#act-suivi .ech').count() == 9, 'suivi : 3 participants, 9 cases d\'échéance')
    page.fill('#ins-adherent-saisie', f"{choisis[3]['nom']} {choisis[3]['prenom']} — {choisis[3]['id']}")
    page.dispatch_event('#ins-adherent-saisie', 'change')
    page.click('#ins-inscrire')
    page.wait_for_timeout(300)
    verif('complète' in notif(), '4e inscription refusée : ' + notif().split('\n')[0])
    page.screenshot(path=str(CAPTURES / 'l4_02_suivi.png'), full_page=False)

    print('\n4. Payé → recette automatique ; décocher → recette supprimée ; Rembourser → dépense')
    i1 = sorted(ins, key=lambda i: i['adherentId'])[0]
    e1, e2, e3 = ech[i1['id']]
    nrec = len(t['Recettes'])

    def payer(e, date=None, mode='Virement'):
        page.click(f'#act-suivi input[data-id="{e["id"]}"]')
        if date:
            page.fill('.modale [data-champ="date"]', date)
        page.select_option('.modale [data-champ="mode"]', mode)
        oui()
        fin()

    payer(e1, mode='Chèque')
    payer(e2)
    t = T()
    recs = [r for r in t['Recettes'] if r['echeanceId'] in (e1['id'], e2['id'])]
    verif(len(t['Recettes']) == nrec + 2 and len(recs) == 2 and all(r['origine'] == 'Automatique' and r['activiteId'] == id_act and r['adherentId'] == i1['adherentId'] for r in recs),
          '2 échéances payées → 2 recettes automatiques liées (activité, adhérent)')
    verif(sorted(r['modePaiement'] for r in recs) == ['Chèque', 'Virement'] and all(r['categorie'] == '2. Sorties et spectacles' for r in recs), 'mode de paiement et catégorie reportés sur la recette')
    verif(page.locator(f'#act-suivi input[data-id="{e1["id"]}"]').is_checked(), 'case cochée après paiement')
    page.click(f'#act-suivi input[data-id="{e1["id"]}"]')
    payer_again = page.locator('.modale').inner_text()
    verif('Supprimer la recette' in payer_again, 'décocher demande confirmation avant de supprimer la recette')
    oui()
    fin()
    t = T()
    verif(not any(r['echeanceId'] == e1['id'] for r in t['Recettes']) and len(t['Recettes']) == nrec + 1, 'recette supprimée après confirmation, plus de double')
    payer(e3)
    ndep = len(t['Depenses'])
    page.click(f'#act-suivi button[data-ech="rembourser"][data-id="{e3["id"]}"]')
    oui()
    fin()
    t = T()
    e3b = next(e for e in t['Echeances'] if e['id'] == e3['id'])
    dep = [d for d in t['Recettes'] if d['id'] == e3b['remboursementId']]
    verif(e3b['rembourse'] and len(t['Depenses']) == ndep and dep and dep[0]['origine'] == 'Remboursement' and proche(dep[0]['montant'], -e3['montant'], 0.001),
          f'remboursement déduit des recettes : {dep[0]["id"] if dep else "?"} de −{e3["montant"]} €, aucune dépense (choix du bureau, lot 5)')
    verif(page.locator(f'#act-suivi input[data-id="{e3["id"]}"]').is_disabled() and 'Remboursée' in txt('#act-suivi'), 'échéance remboursée : case verrouillée, badge « Remboursée »')
    verif('2 / 9 échéance(s) payée(s)' in txt('#act-fiche-resume'), 'résumé : ' + re.search(r'\d+ / \d+ échéance\(s\) payée\(s\)', txt('#act-fiche-resume')).group(0))

    print('\n5. Les lignes automatiques ne se modifient pas dans Budget & Compta')
    id_rec = next(r['id'] for r in t['Recettes'] if r['echeanceId'] == e2['id'])
    page.click('.nav-item[data-section="chantier-2"]')
    page.wait_for_timeout(300)
    page.fill('#liste-recettes .liste-recherche', id_rec)
    page.wait_for_timeout(150)
    verif('Automatique' in txt('#liste-recettes tbody'), f'recette {id_rec} visible avec le badge « Automatique »')
    page.click('#liste-recettes button[data-action="supprimer"]')
    page.wait_for_timeout(300)
    if page.locator('.modale [data-r="oui"]').count():
        oui(); fin()
    verif(any(r['id'] == id_rec for r in T()['Recettes']) and 'Activités' in notif(), 'suppression refusée, renvoi vers la rubrique Activités')
    page.fill('#liste-recettes .liste-recherche', '')
    page.click('.nav-item[data-section="chantier-3"]')
    page.wait_for_timeout(300)

    print('\n6. Désinscription')
    i2 = sorted(ins, key=lambda i: i['adherentId'])[1]
    page.click(f'#act-suivi button[data-ech="desinscrire"][data-id="{i2["id"]}"]')
    oui()
    fin()
    t = T()
    verif(next(i for i in t['Inscriptions'] if i['id'] == i2['id'])['statut'] == 'Désinscrit' and not any(e['inscriptionId'] == i2['id'] for e in t['Echeances']),
          'désinscrit ; ses échéances non payées sont supprimées')
    verif(txt('#act-suivi-compteur').startswith('2') and '2 / 3' in txt('#act-fiche-resume'), 'suivi : 2 participants ; inscrits 2 / 3')
    page.fill('#act-suivi-recherche', i1['adherentId'])
    page.wait_for_timeout(150)
    verif(txt('#act-suivi-compteur').startswith('1'), 'recherche d\'un participant dans le suivi')
    page.fill('#act-suivi-recherche', '')
    page.select_option('#act-suivi-filtre', 'reste')
    page.wait_for_timeout(150)
    verif(txt('#act-suivi-compteur').startswith('2'), 'filtre « reste à payer » : ' + txt('#act-suivi-compteur'))
    page.select_option('#act-suivi-filtre', '')

    print('\n7. Fiche d\'inscription (Google Doc + PDF)')
    page.click('#act-fiche-inscription')
    fin()
    liens = page.locator('#act-fiche-liens a')
    verif(liens.count() == 2 and 'Fiches_inscription' in txt('#act-fiche-liens'), 'liens Google Doc et PDF affichés : ' + txt('#act-fiche-liens')[:90])
    doc = page.evaluate("""(() => { const d = Object.values(FauxGAS.docs || {}).pop(); return d ? JSON.stringify(d).slice(0, 4000) : ''; })()""")
    if doc:
        verif('Atelier cuisine test' in doc and 'Date de paiement' in doc, 'contenu du Doc : en-tête de l\'activité et colonnes de paiement')

    print('\n8. Mobil-home : aides 2 × 60 € par titulaire et par an')
    t = T()
    loue26 = {m['adherentId'] for m in t['MobilHome'] if int(m['annee']) == 2026}
    libres = [a for a in t['Adherents'] if not a.get('desinscrit') and not a.get('deces') and not a.get('dateFin') and a['id'] not in loue26 and a['dateInscription'] < '2026-01-01']
    tit = next(a for a in libres if a['type'] == 'Titulaire')
    sym = next(a for a in libres if a['type'] == 'Sympathisant')
    proposes = [o for o in page.eval_on_selector_all('#form-mobilhome [data-champ="campingId"] option', 'o => o.map(x => x.value)') if o]
    campings = ['PRE-005', 'PRE-013']
    verif(all(c in proposes for c in campings), f'campings proposés en premier (hébergement) : {proposes[:3]}')
    fm = '#form-mobilhome'
    a0 = activites(t, 2026, auj)

    def location(a, semaine, camping, cout='350', verifier_info=None):
        page.fill('#mh-adherent-saisie', f"{a['nom']} {a['prenom']} — {a['id']}")
        page.dispatch_event('#mh-adherent-saisie', 'change')
        page.select_option(fm + ' [data-champ="campingId"]', camping)
        page.fill(fm + ' [data-champ="semaine"]', semaine)
        page.fill(fm + ' [data-champ="coutLocation"]', cout)
        page.dispatch_event(fm + ' [data-champ="coutLocation"]', 'change')
        info = txt('#mh-info-aide')
        page.click('#mh-enregistrer')
        fin()
        return info, notif()

    i_1, n_1 = location(tit, '2026-07-04', campings[0])
    i_2, n_2 = location(tit, '2026-07-18', campings[1])
    i_3, n_3 = location(tit, '2026-08-01', campings[0])
    verif('aide de 60 €' in i_1 and '290 €' in i_1, 'prévision avant enregistrement : ' + i_1)
    verif('aide de 60' in n_1 and 'aide de 60' in n_2, '1re et 2e semaines : aide de 60 €')
    verif('Plafond atteint' in i_3 and 'plafond' in n_3, '3e semaine : plafond annoncé avant (« ' + i_3[:60] + '… ») et après enregistrement')
    t = T()
    mh = sorted([m for m in t['MobilHome'] if m['adherentId'] == tit['id']], key=lambda m: m['semaine'])
    rec = {r['id']: r for r in t['Recettes']}
    depi = {d['id']: d for d in t['Depenses']}
    verif([num(m['aideAsso']) for m in mh] == [60, 60, 0], 'aides enregistrées : 60 / 60 / 0')
    verif(all(m['depenseId'] in depi and proche(depi[m['depenseId']]['montant'], 350, 0.001) and depi[m['depenseId']]['prestataireId'] == m['campingId'] for m in mh),
          'chaque location crée sa dépense de 350 € au camping')
    verif([rec[m['recetteId']]['montant'] for m in mh] == [290, 290, 350], 'et sa recette « part adhérent » : 290 / 290 / 350 €')
    i_0, n_0 = location(tit, '2026-06-20', campings[1])
    verif('plus tôt' in i_0, 'semaine plus tôt : l\'outil prévient qu\'une aide sera déplacée')
    t = T()
    mh = sorted([m for m in t['MobilHome'] if m['adherentId'] == tit['id']], key=lambda m: m['semaine'])
    rec = {r['id']: r for r in t['Recettes']}
    verif([num(m['aideAsso']) for m in mh] == [60, 60, 0, 0] and [rec[m['recetteId']]['montant'] for m in mh] == [290, 290, 350, 350],
          'recalcul : les 2 premières semaines de l\'année gardent l\'aide (60/60/0/0), recettes ajustées')
    page.fill('#liste-mobilhome .liste-recherche', mh[0]['id'])
    page.wait_for_timeout(150)
    page.click('#liste-mobilhome button[data-action="supprimer"]')
    oui()
    fin()
    page.fill('#liste-mobilhome .liste-recherche', '')
    t = T()
    mh2 = sorted([m for m in t['MobilHome'] if m['adherentId'] == tit['id']], key=lambda m: m['semaine'])
    verif(len(mh2) == 3 and [num(m['aideAsso']) for m in mh2] == [60, 60, 0] and mh[0]['depenseId'] not in {d['id'] for d in t['Depenses']}
          and mh[0]['recetteId'] not in {r['id'] for r in t['Recettes']}, 'suppression : dépense et recette supprimées, aide rendue à la semaine suivante')
    _, n_s = location(sym, '2026-08-08', campings[0], '300')
    verif('réservée aux titulaires' in n_s, 'sympathisant : pas d\'aide (« ' + n_s.split('\n')[0][:90] + ' »)')
    a1 = controle(2026, '2026 après saisies')
    verif(a1['mh_semaines'] == a0['mh_semaines'] + 4 and proche(a1['mh_aides'] - a0['mh_aides'], 120, 0.01), 'semaines vendues +4, aides +120 €')
    lig = [r for r in page.eval_on_selector_all('#liste-aides-mh tbody tr', 'r => r.map(x => [...x.cells].map(c => c.innerText.trim()))') if r[0] == tit['id']]
    verif(lig and lig[0][2] == '3' and lig[0][3] == '2 / 2' and 'plafond' in lig[0][4], 'aides par titulaire : 3 semaines, 2 / 2, « plafond atteint »')
    page.locator('#panneau-mobilhome').screenshot(path=str(CAPTURES / 'l4_03_mobilhome.png'))

    print('\n9. Budget & Compta : mode de paiement, justificatif, commentaire')
    page.click('.nav-item[data-section="chantier-2"]')
    page.wait_for_timeout(300)
    f = '#form-depense'
    modes = page.eval_on_selector_all(f + ' [data-champ="modePaiement"] option', 'o => o.map(x => x.value)')
    verif('Chèque' in modes and 'Virement' in modes, 'modes de paiement proposés : ' + ', '.join(x for x in modes if x))
    page.fill(f + ' [data-champ="montant"]', '42')
    page.fill(f + ' [data-champ="libelle"]', 'Timbres')
    page.select_option(f + ' [data-champ="categorie"]', '7. Fonctionnement association')
    page.select_option(f + ' [data-champ="sousCategorie"]', [o for o in page.eval_on_selector_all(f + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)') if o][0])
    page.select_option(f + ' [data-champ="modePaiement"]', 'Carte bancaire')
    page.fill(f + ' [data-champ="justificatif"]', 'Facture 2026-118')
    page.fill(f + ' [data-champ="commentaire"]', 'Envoi du Maillon')
    page.click('#dep-enregistrer')
    fin()
    idd = re.search(r'DEP-2026-\d{4}', notif()).group(0)
    d = next(x for x in T()['Depenses'] if x['id'] == idd)
    verif(d['modePaiement'] == 'Carte bancaire' and d['justificatif'] == 'Facture 2026-118' and d['commentaire'] == 'Envoi du Maillon', f'dépense {idd} enregistrée avec les 3 nouveaux champs')
    page.fill('#liste-depenses .liste-recherche', idd)
    page.wait_for_timeout(150)
    verif('Envoi du Maillon' in txt('#liste-depenses tbody'), 'commentaire visible dans la liste')
    page.fill('#liste-depenses .liste-recherche', '')

    print('\n10. Réinitialisation des données d\'entraînement')
    page.click('.nav-item[data-section="administration"]')
    page.wait_for_timeout(300)
    verif(page.is_enabled('#adm-reinitialiser'), 'bouton actif en mode entraînement')
    page.click('#adm-reinitialiser')
    oui()
    page.wait_for_timeout(200)
    verif('seconde fois' in page.locator('.modale').inner_text(), 'double confirmation demandée')
    oui()
    page.wait_for_selector('#chargement', state='hidden', timeout=60000)
    page.wait_for_timeout(400)
    t = T()
    verif('réinitialisées' in notif() and not any(a['id'] == id_act for a in t['Activites']) and not any(m['adherentId'] == tit['id'] and m['semaine'] == '2026-07-04' for m in t['MobilHome']),
          'données rechargées (activité et locations de test disparues) : ' + notif().split('\n')[0][:90])
    page.click('.nav-item[data-section="chantier-3"]')
    page.wait_for_timeout(300)
    controle(2026, '2026 après réinitialisation')

    print('\n11. Affichage mobile')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(300)
    largeur = page.evaluate('document.documentElement.scrollWidth')
    verif(largeur <= 392, f'pas de défilement horizontal de la page (largeur {largeur}px)')
    page.screenshot(path=str(CAPTURES / 'l4_04_mobile.png'), full_page=False)

    verif(not erreurs, 'aucune erreur JavaScript' + (f' — {erreurs[:3]}' if erreurs else ''))
    nav.close()

print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
