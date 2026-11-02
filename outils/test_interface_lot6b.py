#!/usr/bin/env python3
"""
test_interface_lot6b.py — Catégories du bureau dans le navigateur : descriptif sous les sous-catégories
(dépense, recette, activité), Administration, budgets, graphiques, calendrier.
Usage : python3 outils/test_interface_lot6b.py <dossier_npm> [dossier_captures]
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
C1, C3, C7, C8 = '1. Séjours et villégiatures', '3. Convivialité et fêtes', '7. Fonctionnement association', '8. Subvention et Adhésions'
BUDGET7 = ['1. Séjours et villégiatures', '2. Sorties et spectacles', '3. Convivialité et fêtes', '4. Loisirs et animations',
           '5. Culture, créativité et bien-être', '6. Informatique et apprentissages', '7. Fonctionnement association']


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

    def options(sel):
        return [o for o in page.eval_on_selector_all(sel + ' option', 'o => o.map(x => x.value)') if o]

    def aide(form):
        return page.inner_text(form + ' .descriptif-souscat') if page.is_visible(form + ' .descriptif-souscat') else ''

    print('\n1. Budget & Compta : formulaires')
    page.click('.nav-item[data-section="chantier-2"]'); page.wait_for_timeout(300)
    f = '#form-depense'
    verif(options(f + ' [data-champ="categorie"]') == BUDGET7, 'dépense : les 7 catégories de dépenses, dans l\'ordre du document')
    page.select_option(f + ' [data-champ="categorie"]', C7)
    sc = options(f + ' [data-champ="sousCategorie"]')
    verif([x.split(' ')[0] for x in sc] == ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7'], 'sous-catégories 7.1 à 7.7')
    titre = page.get_attribute(f + ' [data-champ="sousCategorie"] option[value="7.3 Communication et information"]', 'title')
    verif(titre and titre.startswith('Le Maillon'), 'descriptif au survol de chaque choix (7.3 : « ' + (titre or '')[:30] + '… »)')
    page.select_option(f + ' [data-champ="sousCategorie"]', '7.4 Gestion des adhérents')
    verif(aide(f) == "Ce qu'elle recouvre : Fleurs pour décès ou autres circonstances ; cadeaux divers (tombola, départs du CA, etc.).", 'descriptif affiché sous la liste : ' + aide(f)[:50])
    page.screenshot(path=str(CAPTURES / 'l6b_01_depense.png'), clip={'x': 240, 'y': 0, 'width': 1200, 'height': 900})
    page.select_option(f + ' [data-champ="categorie"]', '')
    verif(aide(f) == '', 'catégorie vidée : plus de descriptif')
    r = '#form-recette'
    verif(options(r + ' [data-champ="categorie"]') == BUDGET7 + [C8], 'recette : les 8 catégories (8 = subvention et adhésions)')
    page.select_option(r + ' [data-champ="categorie"]', C1)
    verif(len(options(r + ' [data-champ="sousCategorie"]')) == 3, 'recette d\'un séjour : sous-catégories 1.1 à 1.3 proposées (participation des adhérents)')
    # modification d'une dépense existante : le descriptif suit la sous-catégorie enregistrée
    dep = page.evaluate("APP.d.tables.Depenses.find(d => d.sousCategorie === '7.3 Communication et information' && d.origine === 'Saisie manuelle' && d.date.startsWith('2026'))")
    page.fill('#liste-depenses .liste-recherche', dep['id']); page.wait_for_timeout(150)
    page.click('#liste-depenses button[data-action="modifier"]'); page.wait_for_timeout(150)
    verif(aide(f).startswith("Ce qu'elle recouvre : Le Maillon"), 'modifier une dépense : descriptif de sa sous-catégorie (' + dep['libelle'] + ')')
    page.click('#dep-annuler') if page.is_visible('#dep-annuler') else None
    page.fill('#liste-depenses .liste-recherche', '')

    print('\n2. Budget & Compta : suivi et graphiques')
    lignes = page.eval_on_selector_all('#bud-form-lignes input[data-budget]', 'e => e.map(x => x.getAttribute("data-budget"))')
    verif(lignes == BUDGET7, 'budgets prévisionnels : une ligne par catégorie de dépenses (7), pas de ligne pour la catégorie 8')
    texte = page.inner_text('#chantier-2')
    verif(all(c in texte for c in [C1, C7]) and 'Villégiatures' not in texte and 'Divers' not in texte.replace('diverses', ''), 'les anciennes catégories ont disparu de la page')
    page.screenshot(path=str(CAPTURES / 'l6b_02_budget.png'), full_page=True)

    print('\n3. Activités')
    page.click('.nav-item[data-section="chantier-3"]'); page.wait_for_timeout(300)
    a = '#form-activite'
    verif(C8 not in options(a + ' [data-champ="categorie"]') and len(options(a + ' [data-champ="categorie"]')) == 7, 'fiche activité : 7 catégories (pas la 8)')
    page.select_option(a + ' [data-champ="categorie"]', C3)
    page.select_option(a + ' [data-champ="sousCategorie"]', '3.2 Journées printanières, barbecues')
    verif(aide(a).startswith("Ce qu'elle recouvre : Achats, repas, location"), 'fiche activité : descriptif affiché')
    page.screenshot(path=str(CAPTURES / 'l6b_03_activite.png'), clip={'x': 240, 'y': 0, 'width': 1200, 'height': 900})

    print('\n4. Administration → Catégories')
    page.click('.nav-item[data-section="administration"]'); page.wait_for_timeout(300)
    liste = '#liste-categories-table'
    verif(page.inner_text(liste + ' .liste-compteur strong') == '27', '27 lignes')
    premiere = page.inner_text(liste + ' tbody tr >> nth=0')
    verif('1.1 Séjours 7j. et +' in premiere and 'Transport, hébergement' in premiere, 'triées dans l\'ordre du document, avec la colonne « Ce qu\'elle recouvre »')
    page.fill(liste + ' .liste-recherche', '2.3 Randonnées'); page.wait_for_timeout(150)
    page.click(liste + ' button[data-action="modifier"]'); page.wait_for_timeout(150)
    fc = '#form-categorie'
    verif(page.input_value(fc + ' [data-champ="descriptif"]').startswith('Dépenses propres à l\'organisation des randonnées'), 'Modifier : le descriptif apparaît dans la fiche')
    page.fill(fc + ' [data-champ="descriptif"]', 'Car, guide et pique-nique des randonnées.')
    page.click('#cat-enregistrer'); fin()
    verif('Car, guide' in page.inner_text(liste + ' tbody') and page.evaluate("APP.d.tables.Categories.find(c => c.sousCategorie === '2.3 Randonnées').descriptif") == 'Car, guide et pique-nique des randonnées.', 'descriptif modifié et enregistré')
    page.fill(liste + ' .liste-recherche', '')
    page.screenshot(path=str(CAPTURES / 'l6b_04_admin.png'), full_page=False)

    print('\n5. Tableau de bord et calendrier')
    page.click('.nav-item[data-section="dashboard"]'); page.wait_for_timeout(600)
    leg = page.evaluate("Object.values(Chart.instances).map(c => c.data.labels || []).flat().join(' | ')")
    verif(C7 in leg and C3 in leg and 'Villégiatures' not in leg, 'graphiques : nouvelles catégories dans les légendes')
    page.click('.nav-item[data-section="chantier-4"]'); page.wait_for_timeout(300)
    verif(C3 in page.inner_text('#cal-legende'), 'calendrier : légende avec les nouvelles catégories')

    print('\n6. Téléphone')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("allerA('chantier-2')"); page.wait_for_timeout(300)
    page.select_option(f + ' [data-champ="categorie"]', C7)
    page.select_option(f + ' [data-champ="sousCategorie"]', '7.6 Administration courante (fonctionnement)')
    largeur = page.evaluate('document.documentElement.scrollWidth')
    verif(largeur <= 392, f'formulaire dépense avec descriptif sans défilement horizontal ({largeur} px)')
    page.locator(f).screenshot(path=str(CAPTURES / 'l6b_05_mobile.png'))

    verif(not erreurs, 'aucune erreur JavaScript' + (' : ' + ' | '.join(erreurs[:3]) if erreurs else ''))
    nav.close()

print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
