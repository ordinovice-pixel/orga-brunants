#!/usr/bin/env python3
"""
test_interface_lot3.py — Teste Budget & Compta et Prestataires dans un navigateur (aperçu local),
graphiques Chart.js compris, et recalcule les indicateurs de façon indépendante en Python.
Usage : python3 outils/test_interface_lot3.py <dossier_chartjs_npm> [dossier_captures]
  <dossier_chartjs_npm> contient cj/package/dist/chart.umd.js et dl/package/dist/chartjs-plugin-datalabels.min.js
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


# ---------- recalcul indépendant ----------
def budget(t, n):
    an = str(n)
    rec = [r for r in t['Recettes'] if r['date'][:4] == an]
    dep = [d for d in t['Depenses'] if d['date'][:4] == an]
    bud = [b for b in t['Budgets'] if int(b['annee']) == n]
    cats = {}
    for b in bud:
        cats.setdefault(b['categorie'], {'budget': 0, 'consomme': 0, 'hors': 0})['budget'] += b['montant']
    for d in dep:
        c = cats.setdefault(d['categorie'], {'budget': 0, 'consomme': 0, 'hors': 0})
        c['hors' if d['budgete'] == 'Hors budget' else 'consomme'] += d['montant']
    tb = sum(c['budget'] for c in cats.values())
    tc = sum(c['consomme'] for c in cats.values())
    th = sum(c['hors'] for c in cats.values())
    mois_r = [0] * 12
    mois_d = [0] * 12
    for r in rec:
        mois_r[int(r['date'][5:7]) - 1] += r['montant']
    for d in dep:
        mois_d[int(d['date'][5:7]) - 1] += d['montant']
    return {'recettes': sum(r['montant'] for r in rec), 'depenses': sum(d['montant'] for d in dep), 'budget': tb,
            'consomme': tc, 'solde': tb - tc, 'hors': th, 'cats': cats, 'mois_r': mois_r, 'mois_d': mois_d}


def prestataires(t, n):
    fact = [d for d in t['Depenses'] if d['date'][:4] == str(n) and d['prestataireId']]
    tot = sum(d['montant'] for d in fact)
    par = {}
    for d in fact:
        par[d['prestataireId']] = par.get(d['prestataireId'], 0) + d['montant']
    return tot, par, len(fact)


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
    page.click('.nav-item[data-section="chantier-2"]')
    page.wait_for_timeout(400)

    def fin():
        page.wait_for_selector('#chargement', state='hidden', timeout=10000)
        page.wait_for_timeout(200)

    def notif():
        return page.locator('.notification').last.inner_text()

    def T():
        return page.evaluate('APP.d.tables')

    def lire_budget():
        rows = page.eval_on_selector_all('#bud-suivi tr', 'r => r.map(x => [...x.cells].map(c => c.innerText))')
        return {
            'recettes': euros(page.inner_text('#bud-kpi-recettes')), 'depenses': euros(page.inner_text('#bud-kpi-depenses')),
            'solde': euros(page.inner_text('#bud-kpi-solde')), 'hors': euros(page.inner_text('#bud-kpi-hors')),
            'rows': {r[0]: r for r in rows},
            'mensuel': page.evaluate("GRAPHIQUES['bud-graph-mensuel'].data.datasets.map(d => d.data)"),
            'donut': page.evaluate("(() => { const g = GRAPHIQUES['bud-graph-categories']; return [g.data.labels, g.data.datasets[0].data]; })()"),
        }

    def controle_budget(n, titre):
        a = budget(T(), n)
        u = lire_budget()
        ok_kpi = proche(u['recettes'], a['recettes'], 0.6) and proche(u['depenses'], a['depenses'], 0.6) and proche(u['solde'], a['solde'], 0.6) and proche(u['hors'], a['hors'], 0.6)
        verif(ok_kpi, f'{titre} : recettes {a["recettes"]:.2f}, dépenses {a["depenses"]:.2f}, solde budget {a["solde"]:.2f}, hors budget {a["hors"]:.2f} = recalcul')
        ecarts = []
        for c, v in a['cats'].items():
            r = u['rows'].get(c)
            if not r or not proche(euros(r[1]) if 'non saisi' not in r[1] else 0, v['budget']) or not proche(euros(r[2]), v['consomme'], 0.01) or not proche(euros(r[6]) if r[6] != '—' else 0, v['hors'], 0.01):
                ecarts.append(c)
            elif v['budget'] and r[4] != f"{round(100 * v['consomme'] / v['budget'])} %":
                ecarts.append(c + ' (%)')
        verif(not ecarts, f'{titre} : tableau des {len(a["cats"])} catégories (budget, réalisé, %, hors budget) juste' + (f' — écarts {ecarts}' if ecarts else ''))
        m_ok = all(proche(x, y, 0.01) for x, y in zip(u['mensuel'][0], a['mois_r'])) and all(proche(x, y, 0.01) for x, y in zip(u['mensuel'][1], a['mois_d']))
        verif(m_ok, f'{titre} : graphique mensuel = recalcul (12 mois × recettes / dépenses)')
        d_ok = all(proche(v, a['cats'][l]['consomme'] + a['cats'][l]['hors'], 0.01) for l, v in zip(*u['donut']))
        verif(d_ok and abs(sum(u['donut'][1]) - a['depenses']) < 0.05, f'{titre} : graphique de répartition = dépenses par catégorie')
        return a

    print('\n1. Budget & Compta : indicateurs recalculés')
    a26 = controle_budget(2026, '2026')
    page.screenshot(path=str(CAPTURES / 'l3_01_budget.png'))
    tip = page.evaluate("""(() => { const g = GRAPHIQUES['bud-graph-categories']; const cb = g.options.plugins.tooltip.callbacks.label;
        return cb({ parsed: g.data.datasets[0].data[0], label: g.data.labels[0], dataset: g.data.datasets[0], chart: g }); })()""")
    verif('€' in tip and '%' in tip and '&' not in tip, 'infobulle de répartition : « ' + tip + ' » (UTF-8, € et %)')

    print('\n2. Saisie d\'une dépense')
    f = '#form-depense'
    verif(page.input_value(f + ' [data-champ="date"]') == page.evaluate('APP.d.aujourdhui'), 'date du jour proposée')
    page.click('#dep-enregistrer')
    verif('obligatoire' in page.inner_text(f + ' .form-erreurs'), 'champs obligatoires signalés')
    page.fill(f + ' [data-champ="date"]', '2026-10-08')
    page.fill(f + ' [data-champ="montant"]', '250')
    page.fill(f + ' [data-champ="libelle"]', 'Formateur tablette — séance de rattrapage')
    page.select_option(f + ' [data-champ="categorie"]', '6. Informatique et apprentissages')
    sous = page.eval_on_selector_all(f + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)')
    verif('6.1 Ateliers informatiques' in sous and '8.2 Adhésion' not in sous, 'sous-catégories filtrées selon la catégorie')
    verif('Choisissez une sous-catégorie' in page.inner_text(f + ' .descriptif-souscat'), 'aide : choisir une sous-catégorie')
    page.select_option(f + ' [data-champ="sousCategorie"]', '6.1 Ateliers informatiques')
    verif(page.inner_text(f + ' .descriptif-souscat').startswith("Ce qu'elle recouvre : Intervenants, supports et petits équipements"), 'descriptif de la sous-catégorie affiché : ' + page.inner_text(f + ' .descriptif-souscat')[:60])
    cats_dep = page.eval_on_selector_all(f + ' [data-champ="categorie"] option', 'o => o.map(x => x.value)')
    verif('8. Subvention et Adhésions' not in cats_dep and len([c for c in cats_dep if c]) == 7, 'dépense : la catégorie 8 (recettes seulement) n\'est pas proposée')
    page.select_option(f + ' [data-champ="prestataireId"]', 'PRE-010')
    page.select_option(f + ' [data-champ="activiteId"]', 'ACT-2026-006')
    avant = lire_budget()
    nfact_avant = prestataires(T(), 2026)[1].get('PRE-010', 0)
    page.click('#dep-enregistrer')
    fin()
    m = re.search(r'DEP-2026-\d{4}', notif())
    verif(m and 'créée' in notif(), 'message : ' + notif().split('\n')[0])
    id_dep = m.group(0)
    apres = lire_budget()
    verif(proche(apres['depenses'] - avant['depenses'], 250) and proche(avant['solde'] - apres['solde'], 250)
          and proche(euros(apres['rows']['6. Informatique et apprentissages'][2]) - euros(avant['rows']['6. Informatique et apprentissages'][2]), 250),
          'dépenses +250 €, solde budget −250 €, 6. Informatique +250 € : instantanément')
    verif(page.locator('#liste-depenses tr.ligne-surlignee').count() == 1, 'nouvelle dépense surlignée dans la liste')
    page.select_option('#liste-depenses .liste-filtre >> nth=1', 'Premiers secours (PSC1)')
    verif(id_dep in page.inner_text('#liste-depenses tbody'), 'filtre « Activité » : la dépense apparaît avec son activité')
    page.click('#liste-depenses .liste-raz')

    print('\n3. Modification : passage en hors budget')
    page.fill('#liste-depenses .liste-recherche', id_dep)
    page.wait_for_timeout(100)
    page.click('#liste-depenses button[data-action="modifier"]')
    verif(page.inner_text('#dep-form-titre') == 'Modifier ' + id_dep and page.input_value(f + ' [data-champ="prestataireId"]') == 'PRE-010', 'fiche ouverte dans la zone Saisie')
    page.fill(f + ' [data-champ="montant"]', '300')
    page.check(f + ' input[data-radio="budgete"][value="Hors budget"]')
    page.click('#dep-enregistrer')
    fin()
    m2 = lire_budget()
    verif(proche(m2['hors'] - apres['hors'], 300) and proche(euros(m2['rows']['6. Informatique et apprentissages'][2]), euros(avant['rows']['6. Informatique et apprentissages'][2])),
          'hors budget +300 € ; la catégorie retrouve son consommé initial (le hors budget ne consomme pas le budget)')
    page.fill('#liste-depenses .liste-recherche', '')

    print('\n4. Recette avec adhérent, puis suppression')
    r = '#form-recette'
    page.fill(r + ' [data-champ="montant"]', '60')
    page.fill(r + ' [data-champ="libelle"]', 'Cotisations octobre (4 adhérents)')
    page.select_option(r + ' [data-champ="categorie"]', '8. Subvention et Adhésions')
    sous_r = page.eval_on_selector_all(r + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)')
    verif(sous_r == ['', '8.1 Subvention', '8.2 Adhésion', '8.3 Dons'], 'recette : catégorie 8 et ses sous-catégories proposées')
    page.select_option(r + ' [data-champ="sousCategorie"]', '8.2 Adhésion')
    verif('Cotisations annuelles' in page.inner_text(r + ' .descriptif-souscat'), 'recette : descriptif affiché')
    page.fill('#rec-adherent-saisie', 'BERNARD Suzanne — ADH-0001')
    page.dispatch_event('#rec-adherent-saisie', 'change')
    rec_avant = lire_budget()['recettes']
    page.click('#rec-enregistrer')
    fin()
    id_rec = re.search(r'REC-2026-\d{4}', notif()).group(0)
    verif(proche(lire_budget()['recettes'] - rec_avant, 60), 'recettes +60 € : ' + id_rec)
    page.fill('#liste-recettes .liste-recherche', id_rec)
    page.wait_for_timeout(100)
    verif('BERNARD Suzanne' in page.inner_text('#liste-recettes tbody'), 'adhérent affiché dans la liste des recettes')
    page.click('#liste-recettes button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    fin()
    verif('supprimée' in notif() and proche(lire_budget()['recettes'], rec_avant), 'suppression : recettes revenues à leur valeur')
    page.fill('#liste-recettes .liste-recherche', '')

    print('\n5. Recette créée automatiquement : protégée')
    page.evaluate("""(() => { const f = FauxGAS.classeurLie.brut('Recettes'); const e = f.d[0]; const l = e.map(() => '');
      l[e.indexOf('ID')] = 'REC-2026-0999'; l[e.indexOf("Date d'encaissement")] = new Date(2026, 8, 1); l[e.indexOf('Libellé')] = 'Paiement échéance 1/3 — test';
      l[e.indexOf('Montant (€)')] = 120; l[e.indexOf('Catégorie')] = '1. Séjours et villégiatures'; l[e.indexOf('Budgété / Hors budget')] = 'Budgété';
      l[e.indexOf('Origine')] = 'Automatique'; l[e.indexOf("ID de l'échéance source")] = 'ECH-00001'; f.d.push(l); })()""")
    page.click('#btn-actualiser')
    fin()
    page.fill('#liste-recettes .liste-recherche', 'REC-2026-0999')
    page.wait_for_timeout(100)
    verif('Automatique' in page.inner_text('#liste-recettes tbody'), 'badge « Automatique » dans la liste')
    page.click('#liste-recettes button[data-action="modifier"]')
    page.wait_for_timeout(100)
    verif('créée automatiquement' in notif() and page.inner_text('#rec-form-titre') != 'Modifier REC-2026-0999', 'Modifier : refusé avec explication')
    page.click('#liste-recettes button[data-action="supprimer"]')
    page.wait_for_timeout(100)
    verif(page.locator('.modale').count() == 0 or not page.locator('.modale').is_visible(), 'Supprimer : pas de suppression possible')
    page.fill('#liste-recettes .liste-recherche', '')

    print('\n6. Budgets prévisionnels')
    solde_avant = lire_budget()['solde']
    champ = '#bud-form-lignes input[data-budget="6. Informatique et apprentissages"]'
    ancien = float(page.input_value(champ))
    page.fill(champ, str(int(ancien + 500)))
    page.click('#bud-enregistrer')
    fin()
    verif('Budgets prévisionnels 2026 enregistrés' in notif() and proche(lire_budget()['solde'] - solde_avant, 500), 'budget +500 € → solde budget +500 € : ' + notif().split('\n')[0])
    page.click('#bud-reprendre')
    v25 = page.input_value('#bud-form-lignes input[data-budget="1. Séjours et villégiatures"]')
    b25 = [b['montant'] for b in T()['Budgets'] if b['annee'] == 2025 and b['categorie'] == '1. Séjours et villégiatures'][0]
    verif(float(v25) == b25, f'« Reprendre les budgets 2025 » recopie {b25} € (non enregistré)')
    page.click('#bud-annuler')
    verif(float(page.input_value('#bud-form-lignes input[data-budget="1. Séjours et villégiatures"]')) != b25 or b25 == [b['montant'] for b in T()['Budgets'] if b['annee'] == 2026 and b['categorie'] == '1. Séjours et villégiatures'][0],
          '« Annuler les modifications » remet les montants 2026')
    page.fill(champ, '-5')
    page.click('#bud-enregistrer')
    verif('positif' in page.inner_text('#form-budgets .form-erreurs'), 'montant négatif refusé')
    page.click('#bud-annuler')

    print('\n7. Cotisations supérieures à l\'attendu et export')
    t = T()
    attendu = [a for a in t['Adherents'] if a['dateInscription'] <= '2026-12-31' and not ((a['dateFin'] or (a['dateDeces'] if a['deces'] else '')) and (a['dateFin'] or a['dateDeces']) < '2026-01-01') and a['cotisation'] and a['cotisation'] > 15]
    n_ex = int(page.inner_text('#liste-excedents .liste-compteur strong'))
    verif(n_ex == len(attendu), f'{n_ex} adhérents au-dessus de 15 € = recalcul {len(attendu)}')
    with page.expect_download() as dl:
        page.click('#liste-depenses .liste-export')
    lignes = pathlib.Path(dl.value.path()).read_text(encoding='utf-8-sig').splitlines()
    verif(len(lignes) - 1 == len([d for d in T()['Depenses'] if d['date'][:4] == '2026']), f'export CSV des dépenses 2026 : {len(lignes) - 1} lignes')
    page.locator('#chantier-2 .zone-listes').screenshot(path=str(CAPTURES / 'l3_02_listes.png'))

    print('\n8. Année 2025')
    page.select_option('#annee-select', '2025')
    page.wait_for_timeout(400)
    controle_budget(2025, '2025')
    page.select_option('#annee-select', '2026')
    page.wait_for_timeout(300)

    print('\n9. Prestataires')
    page.click('.nav-item[data-section="prestataires"]')
    page.wait_for_timeout(500)
    tot, par, nb = prestataires(T(), 2026)
    verif(proche(euros(page.inner_text('#pre-kpi-factures')), tot, 0.6), f'factures 2026 : {tot:.2f} € ({nb} factures) = recalcul')
    rows = page.eval_on_selector_all('#pre-suivi tr:not(.ligne-total)', 'r => r.map(x => [...x.cells].map(c => c.innerText))')
    noms = {p['id']: ('Autre (non listé)' if p['id'] == 'PRE-000' else p['raisonSociale']) for p in T()['Prestataires']}
    ecarts = [r[0] for r in rows if not proche(euros(r[2]), par[[k for k, v in noms.items() if v == r[0]][0]], 0.01)
              or abs(float(r[3].replace(' ', '').replace(' %', '').replace(',', '.')) - round(1000 * par[[k for k, v in noms.items() if v == r[0]][0]] / tot) / 10) > 0.05]
    verif(len(rows) == len(par) and not ecarts, f'suivi par prestataire : {len(rows)} lignes, cumul et % du total justes' + (f' — écarts {ecarts}' if ecarts else ''))
    top = page.evaluate("(() => { const g = GRAPHIQUES['pre-graph-top']; return [g.data.labels, g.data.datasets[0].data]; })()")
    attendu_top = sorted([(noms[k], v) for k, v in par.items() if k != 'PRE-000'], key=lambda x: -x[1])[:10]
    verif(top[0] == [x[0] for x in attendu_top] and all(proche(a, b[1], 0.01) for a, b in zip(top[1], attendu_top)), f'graphique des 10 principaux (sans « Autre ») : {top[0][:3]}…')
    page.screenshot(path=str(CAPTURES / 'l3_03_prestataires.png'))
    fp = '#form-prestataire'
    page.fill(fp + ' [data-champ="raisonSociale"]', 'Taxis du Plateau')
    page.select_option(fp + ' [data-champ="activite"]', 'Transport')
    page.fill(fp + ' [data-champ="siret"]', '123')
    page.click('#pre-enregistrer')
    verif('14 chiffres' in page.inner_text(fp + ' .form-erreurs'), 'SIRET contrôlé (14 chiffres)')
    page.fill(fp + ' [data-champ="siret"]', '')
    page.fill(fp + ' [data-champ="dateDebutRelation"]', '2020-10-12')
    page.dispatch_event(fp + ' [data-champ="dateDebutRelation"]', 'change')
    verif('Ancienneté : 6,0' in page.inner_text('#pre-anciennete-aide'), 'ancienneté calculée en direct : ' + page.inner_text('#pre-anciennete-aide'))
    page.click('#pre-enregistrer')
    fin()
    verif('Prestataire PRE-014 créé' in notif() and int(page.inner_text('#pre-kpi-nombre')) == 14, 'création : ' + notif().split('\n')[0] + ', compteur 14')
    page.fill(fp + ' [data-champ="raisonSociale"]', 'TAXIS du plateau')
    page.click('#pre-enregistrer')
    fin()
    verif('existe déjà' in page.inner_text(fp + ' .form-erreurs'), 'raison sociale en double refusée')
    page.click('#pre-annuler')
    page.fill('#liste-prestataires .liste-recherche', 'PRE-000')
    page.wait_for_timeout(100)
    page.click('#liste-prestataires button[data-action="modifier"]')
    verif('permanente' in notif(), 'entrée « Autre » : modification refusée')
    page.fill('#liste-prestataires .liste-recherche', 'PRE-003')
    page.wait_for_timeout(100)
    page.click('#liste-prestataires button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    fin()
    verif('Suppression impossible' in notif(), 'prestataire avec factures : suppression refusée')
    page.click('#liste-prestataires .lien-bouton')
    page.wait_for_timeout(300)
    n_fact = len([d for d in T()['Depenses'] if d['prestataireId'] == 'PRE-003' and d['date'][:4] == '2026'])
    verif(int(page.inner_text('#liste-factures .liste-compteur strong')) == n_fact and 'Restaurant Le Relais Fleuri' in page.inner_text('#pre-factures-titre'),
          f'clic sur le nom → {n_fact} facture(s) 2026 : ' + page.inner_text('#pre-factures-titre'))
    page.select_option('#pre-factures-periode', 'toutes')
    n_toutes = len([d for d in T()['Depenses'] if d['prestataireId'] == 'PRE-003'])
    verif(int(page.inner_text('#liste-factures .liste-compteur strong')) == n_toutes, f'toutes années : {n_toutes} facture(s)')
    page.fill('#liste-prestataires .liste-recherche', 'PRE-014')
    page.wait_for_timeout(100)
    page.click('#liste-prestataires button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    fin()
    verif('supprimé' in notif(), 'prestataire sans facture supprimé')
    page.locator('#prestataires .zone-listes').screenshot(path=str(CAPTURES / 'l3_04_factures.png'))

    print('\n10. Prestataire choisi dans la dépense = nouveaux prestataires proposés')
    page.click('.nav-item[data-section="chantier-2"]')
    opts = page.eval_on_selector_all('#form-depense [data-champ="prestataireId"] option', 'o => o.map(x => x.textContent)')
    verif(opts[-1].startswith('Autre') and 'Taxis du Plateau' not in opts and len(opts) == 15, 'liste des prestataires à jour (« Autre » en dernier, prestataire supprimé retiré)')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(300)
    verif(page.evaluate('document.documentElement.scrollWidth') <= 392, 'mobile : pas de défilement horizontal')
    nav.close()

verif(not erreurs, 'aucune erreur JavaScript' + ('' if not erreurs else ' : ' + ' | '.join(erreurs[:4])))
print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
