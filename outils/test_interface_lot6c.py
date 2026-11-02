#!/usr/bin/env python3
"""
test_interface_lot6c.py — Filtre « À compléter » des adhérents, import des vrais adhérents (Remplacer)
et réinitialisation qui les conserve, dans le navigateur (aperçu local). Personnes du test : fictives.
Usage : python3 outils/test_interface_lot6c.py <dossier_npm> [dossier_captures]
"""
import pathlib
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

CSV = '\r\n'.join(['ID;Sexe (H/F);Nom;Prénom;Date de naissance;Adresse;Code postal;Ville;Mobile;E-mail principal;Date d\'inscription;Commentaire'] + [
    f'ADH-{i:04d};{"F" if i % 2 else "H"};TESTREEL{i};Prénom{i};{"" if i % 5 == 0 else "12/03/1950"};{"" if i % 7 == 0 else "1 rue A"};91160;SAULX;'
    f'{"" if i % 4 == 0 else "0600000000"};{"" if i % 3 == 0 else f"p{i}@exemple.fr"};{"01/01/2000" if i % 6 == 0 else "01/09/2015"};'
    f'{"Date d\'entrée Brunants inconnue (01/01/2000 provisoire)" if i % 6 == 0 else ""}' for i in range(1, 31)]).encode('utf-8')


def verif(cond, libelle):
    global ok, ko
    if cond:
        ok += 1; print('  ✔', libelle)
    else:
        ko += 1; print('  ✘', libelle)


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

    def oui():
        page.click('.modale [data-r="oui"]')

    def filtre_completer():
        return page.locator('#liste-adherents .liste-filtre').nth(6)

    print('\n1. Import des vrais adhérents (Remplacer)')
    page.click('.nav-item[data-section="administration"]'); page.wait_for_timeout(300)
    verif(page.is_hidden('#adm-info-reels'), 'avant import : pas de mention « adhérents réels »')
    page.set_input_files('#imp-fichier', files=[{'name': 'Import_Adherents.csv', 'mimeType': 'text/csv', 'buffer': CSV}])
    page.wait_for_selector('#imp-etape-2:not(.hidden)')
    page.click('#imp-verifier'); fin()
    page.check('input[name="imp-mode"][value="remplacer"]'); fin()
    page.click('#imp-importer')
    verif('ATTENTION' not in page.inner_text('.modale-texte'), 'premier import : pas d\'alerte sur des fiches déjà complétées')
    oui(); page.wait_for_timeout(150); oui(); fin()
    verif(len(page.evaluate('APP.d.tables.Adherents')) == 30 and page.evaluate('APP.d.adherentsReels.nb') == 30, '30 adhérents réels dans l\'outil')
    verif(page.is_visible('#adm-info-reels') and 'conservés' in page.inner_text('#adm-info-reels'), 'Administration : « Adhérents réels … conservés par la réinitialisation »')
    page.click('#imp-importer')
    verif('ATTENTION' in page.inner_text('.modale-texte') and 'PERDU' in page.inner_text('.modale-texte'), 'nouveau « Remplacer » : alerte, les fiches complétées seraient perdues')
    page.click('.modale [data-r="non"]')

    print('\n2. Filtre « À compléter »')
    page.click('.nav-item[data-section="chantier-1"]'); page.wait_for_timeout(300)
    page.select_option('#annee-select', '2026'); page.wait_for_timeout(300)
    opts = page.eval_on_selector_all('#liste-adherents .liste-filtre >> nth=6 >> option', 'o => o.map(x => x.value)') if False else \
        filtre_completer().evaluate('s => Array.from(s.options).map(o => o.value)')
    verif(opts == ['', 'Adresse incomplète', "Date d'entrée provisoire (01/01/2000)", 'Fiche complète', 'Sans date de naissance', 'Sans e-mail', 'Sans téléphone'], 'choix : ' + ', '.join(o for o in opts if o))
    t = page.evaluate('APP.d.tables.Adherents')
    attendus = {'Sans e-mail': sum(1 for a in t if not a['email']), 'Sans téléphone': sum(1 for a in t if not a['mobile'] and not a['telFixe']),
                "Date d'entrée provisoire (01/01/2000)": sum(1 for a in t if a['dateInscription'] == '2000-01-01')}
    for choix, n in attendus.items():
        filtre_completer().select_option(choix); page.wait_for_timeout(150)
        verif(page.inner_text('#liste-adherents .liste-compteur strong') == str(n), f'« {choix} » : {n} fiche(s)')
    page.screenshot(path=str(CAPTURES / 'l6c_01_a_completer.png'), full_page=False)
    filtre_completer().select_option('')

    print('\n3. Réinitialisation')
    a3 = next(a for a in t if a['id'] == 'ADH-0003')
    page.click('.nav-item[data-section="administration"]'); page.wait_for_timeout(300)
    page.click('#adm-reinitialiser')
    verif('30 adhérents RÉELS sont conservés' in page.inner_text('.modale-texte'), 'la confirmation annonce que les adhérents réels sont conservés')
    oui(); page.wait_for_timeout(150); oui(); fin()
    t2 = page.evaluate('APP.d.tables')
    verif(len(t2['Adherents']) == 30 and next(a for a in t2['Adherents'] if a['id'] == 'ADH-0003') == a3, 'adhérents réels identiques après la réinitialisation')
    verif(len(t2['Inscriptions']) == 0 and len(t2['Activites']) == 15 and len(t2['Categories']) == 27, 'activités et catégories rechargées, aucune inscription fictive')
    verif('adhérents réels ont été conservés' in page.locator('.notification').last.inner_text(), 'message de fin')

    verif(not erreurs, 'aucune erreur JavaScript' + (' : ' + ' | '.join(erreurs[:3]) if erreurs else ''))
    nav.close()

print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
