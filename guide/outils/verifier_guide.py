#!/usr/bin/env python3
"""verifier_guide.py — Ouvre le guide dans Chromium : erreurs JS, 15 recherches types, ancres, rendu ordinateur et téléphone."""
import pathlib, sys
from playwright.sync_api import sync_playwright
GUIDE = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
REQ = [('rembourser', 'tuto-rembourser'), ('decede', 'tuto-deces'), ('cotisation', 'bud-recette'), ('mobil home', 'act-mh'),
       ('solde', 'bud-solde'), ('exporter excel', 'tuto-export'), ('fiche d inscription', 'act-fiche-inscription'),
       ('payer', 'tuto-payer'), ('quitter', 'tuto-desinscrire'), ('à compléter', 'adh-acompleter'), ('maillon', 'tuto-maillon'),
       ('facture prestataire', 'pre-factures'), ('retard', 'tdb-alertes'), ('budget prévisionnel', 'bud-budgets'), ('conjoint', 'adh-fiche'),
       ('participation association', 'glo-participation'), ('changer année', 'bases-annee'), ('mobilhome aide', 'act-mh')]
erreurs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--lang=fr-FR'])
    pg = b.new_page(viewport={'width': 1366, 'height': 860})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    pg.goto(GUIDE); pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / 'v-accueil.png'))
    print('Index :', pg.evaluate("document.querySelectorAll('#index-rubriques a').length"), 'liens ;',
          'sous-menus :', pg.evaluate("document.querySelectorAll('.sous-nav').length"))
    ok = 0
    for q, attendu in REQ:
        pg.fill('#champ-recherche', q); pg.wait_for_timeout(250)
        ids = pg.eval_on_selector_all('#recherche-haut .resultats a[data-i]', 'l => l.map(a => a.getAttribute("href").slice(1))')
        rang = ids.index(attendu) + 1 if attendu in ids else None
        bon = rang is not None and rang <= 3
        ok += bon
        print(('  ✔' if bon else '  ✘'), f'« {q} » → {attendu} rang {rang} ; top3 = {ids[:3]}')
    print(f'Recherches : {ok}/{len(REQ)} avec la bonne section dans les 3 premiers')
    pg.fill('#champ-recherche', 'rembourser'); pg.wait_for_timeout(250)
    pg.screenshot(path=str(OUT / 'v-recherche.png'))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
    print('Après Entrée :', pg.evaluate('location.hash'), '· mots surlignés :', pg.evaluate("document.querySelectorAll('mark.trouve').length"))
    pg.screenshot(path=str(OUT / 'v-cible.png'))
    pg.goto(GUIDE + '#act-suivi'); pg.wait_for_timeout(900)
    print('Ancre directe #act-suivi visible :', pg.evaluate("Math.round(document.getElementById('act-suivi').getBoundingClientRect().top)"))
    pg.screenshot(path=str(OUT / 'v-ancre.png'))
    # téléphone
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.goto(GUIDE); m.wait_for_timeout(700)
    print('Téléphone : largeur page', m.evaluate('document.documentElement.scrollWidth'), 'pour 390')
    m.screenshot(path=str(OUT / 'v-mobile.png'))
    m.click('#bouton-menu'); m.wait_for_timeout(400); m.screenshot(path=str(OUT / 'v-mobile-menu.png'))
    m.goto(GUIDE + '#bud-solde'); m.wait_for_timeout(700); m.screenshot(path=str(OUT / 'v-mobile-fiche.png'))
    b.close()
print('Erreurs JS :', erreurs or 'aucune')
