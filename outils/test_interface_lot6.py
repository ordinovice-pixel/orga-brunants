#!/usr/bin/env python3
"""
test_interface_lot6.py — Assistant d'import (CSV et Excel), sauvegardes (liste, vérification, restauration)
et liens vers les justificatifs dans Budget & Compta, dans le navigateur (aperçu local).
Usage : python3 outils/test_interface_lot6.py <dossier_npm> [dossier_captures]
  <dossier_npm> contient cj/package (Chart.js), dl/package (datalabels) et xl/package (SheetJS 0.18.5).
"""
import datetime
import io
import pathlib
import re
import sys
from openpyxl import Workbook
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = (RACINE / 'Apercu_local_Brunants.html').as_uri()
NPM = pathlib.Path(sys.argv[1])
CAPTURES = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RACINE / 'captures'
CAPTURES.mkdir(parents=True, exist_ok=True)
CJ = (NPM / 'cj/package/dist/chart.umd.js').read_text()
DL = (NPM / 'dl/package/dist/chartjs-plugin-datalabels.min.js').read_text()
XL = (NPM / 'xl/package/dist/xlsx.full.min.js').read_text()
ok = ko = 0
erreurs = []
appels_sheetjs = []


def verif(cond, libelle):
    global ok, ko
    if cond:
        ok += 1; print('  ✔', libelle)
    else:
        ko += 1; print('  ✘', libelle)


def route(r):
    u = r.request.url
    if 'xlsx' in u:
        appels_sheetjs.append(u)
    r.fulfill(status=200, content_type='application/javascript', body=XL if 'xlsx' in u else (CJ if 'Chart.js' in u else DL))


# Fichier CSV comme l'enregistre Excel : Windows-1252, « ; », deux lignes de titre avant les en-têtes
CSV = '\r\n'.join([
    'Liste des adhérents;;;',
    'Export du 18/10/2026;;',
    'Titre;NOM;Prénom;Sexe;Date de naissance;Adresse1;Adresse2;CP;Ville;Portable;Téléphone Domicile;email;Date Entrée Brunants;Remarques;Colonne inutile',
    "M.;Lambert;Gérard;H;14/02/1948;12 rue des Lilas;Bât. B;6700;Nice;612345678;100000102;g.lambert@exemple.fr;01/09/2005;Vient de l'ancien fichier;zz",
    'Mme;Lambert;Hélène;F;03/03/1950;12 rue des Lilas;;06700;Nice;;;;01/09/2005;;',
    'M.;Sansdate;Luc;H;;;;91610;Ballancourt;;;luc@;;;',
    'Mme;"Dupont; dite ""Lulu""";Lucienne;F;;;;91100;Corbeil;;;;15/03/2019;;',
    'M.;Lambert;Gérard;H;14/02/1948;;;;;;;;01/01/2010;;',
]).encode('cp1252')

PRESTA = 'Raison sociale;Activité;Contact\r\nCamping Les Pins;hébergement / mobil-home;M. Pin\r\nAutocars du Sud;transport;Mme Car\r\n'.encode('utf-8')


def classeur_xlsx():
    wb = Workbook()
    n = wb.active; n.title = 'Notes'
    n['A1'] = 'Fichier de test : voir l\'onglet Adhérents'
    a = wb.create_sheet('Adhérents')
    a.append(['Civilité', 'Nom', 'Prénom', 'Sexe (H/F)', 'Date de naissance', 'Code postal', 'Ville', 'Mobile', "Date d'inscription", 'Souhaite recevoir le Maillon'])
    a.append(['Mme', 'Excel', 'Sophie', 'F', datetime.datetime(1955, 7, 14), 6700, 'Nice', 612121212, datetime.datetime(2012, 1, 1), 'Non'])
    a.append(['M.', 'Excel', 'Bruno', 'H', datetime.datetime(1952, 12, 31), 91610, 'Ballancourt', '', datetime.datetime(2015, 9, 15), 'x'])
    b = io.BytesIO(); wb.save(b)
    return b.getvalue()


with sync_playwright() as p:
    nav = p.chromium.launch()
    page = nav.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
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

    def telecharge(sel):
        with page.expect_download() as dl:
            page.click(sel)
        d = dl.value
        return d.suggested_filename, pathlib.Path(d.path()).read_bytes().decode('utf-8')

    def mapping():
        return page.evaluate("""() => { var o = {}; document.querySelectorAll('#imp-correspondance select[data-cle]').forEach(s => {
            o[s.getAttribute('data-cle')] = s.value === '' ? '' : s.options[s.selectedIndex].text.replace(/^[A-Z]+ · /, ''); }); return o; }""")

    initial = T()
    print('\n1. Administration : panneaux du lot 6')
    page.click('.nav-item[data-section="administration"]')
    page.wait_for_timeout(300)
    verif(page.is_visible('#panneau-import') and page.is_visible('#panneau-sauvegardes'), 'panneaux « Assistant d\'import » et « Sauvegardes et restauration » présents')
    verif(page.is_hidden('#imp-etape-2') and page.is_hidden('#imp-etape-3'), 'étapes 2 et 3 masquées tant qu\'aucun fichier n\'est choisi')
    nom, contenu = telecharge('#imp-modele')
    verif(nom == 'modele_import_adherents.csv' and contenu.startswith('﻿ID;Civilité;Sexe (H/F);Nom;Prénom') and 'Région' not in contenu, 'modèle CSV : ' + nom + ' (titres des champs, sans le champ calculé)')

    print('\n2. Fichier CSV (Windows-1252, titres avant les en-têtes)')
    page.set_input_files('#imp-fichier', files=[{'name': 'export_ancien.csv', 'mimeType': 'text/csv', 'buffer': CSV}])
    page.wait_for_selector('#imp-etape-2:not(.hidden)')
    verif(page.input_value('#imp-ligne-entetes') == '3', 'ligne des en-têtes détectée : 3')
    verif(txt('#imp-resume-fichier') == '5 ligne(s) · 15 colonne(s)', 'contenu lu : ' + txt('#imp-resume-fichier'))
    m = mapping()
    attendu = {'civilite': 'Titre', 'nom': 'NOM', 'prenom': 'Prénom', 'sexe': 'Sexe', 'dateNaissance': 'Date de naissance', 'adresse': 'Adresse1', 'complementAdresse': 'Adresse2',
               'codePostal': 'CP', 'ville': 'Ville', 'mobile': 'Portable', 'telFixe': 'Téléphone Domicile', 'email': 'email', 'dateInscription': 'Date Entrée Brunants', 'commentaire': 'Remarques'}
    faux = {k: (m.get(k), v) for k, v in attendu.items() if m.get(k) != v}
    verif(not faux, 'correspondance proposée pour les 14 colonnes utiles (accents lus en Windows-1252)' + (' — écarts : ' + str(faux) if faux else ''))
    autres = [k for k, v in m.items() if v and k not in attendu]
    verif(not autres and 'Colonne inutile' not in m.values(), 'colonnes sans équivalent ignorées' + (' — en trop : ' + str(autres) if autres else ''))
    verif('Gérard' in page.inner_text('#imp-correspondance') and 'Hélène' in page.inner_text('#imp-correspondance'), 'exemples lus affichés')
    page.screenshot(path=str(CAPTURES / 'l6_01_correspondance.png'), full_page=False)

    page.select_option('#imp-correspondance select[data-cle="nom"]', '')
    verif(page.locator('#imp-correspondance tr.ligne-manquante').count() == 1, 'champ obligatoire sans colonne surligné')
    page.click('#imp-verifier')
    page.wait_for_timeout(200)
    verif('obligatoires : Nom' in notif(), 'contrôle refusé : ' + notif().split('\n')[0])
    page.select_option('#imp-correspondance select[data-cle="nom"]', label='B · NOM')

    print('\n3. Contrôle')
    page.click('#imp-verifier')
    fin()
    stats = page.eval_on_selector_all('#imp-stats .kpi-value', 'e => e.map(x => x.textContent)')
    verif(stats == ['5', '3', '0', '2'], 'lues 5, valides 3, à corriger 0, rejetées 2 (' + '/'.join(stats) + ')')
    verif(page.input_value('#imp-filtre-statut') == 'Rejetée' and txt('#imp-compteur') == '2 ligne(s)', 'filtre ouvert sur les rejets')
    lignes = page.eval_on_selector_all('#imp-lignes tr', 'e => e.map(r => Array.from(r.cells).map(c => c.textContent))')
    verif([l[0] for l in lignes] == ['6', '8'], 'n° des lignes = lignes du fichier (6 et 8)')
    verif('obligatoire' in lignes[0][3] and 'invalide' in lignes[0][3], 'ligne 6 : ' + lignes[0][3])
    verif('Doublon : ligne 4 du fichier' in lignes[1][3], 'ligne 8 : ' + lignes[1][3])
    page.select_option('#imp-filtre-statut', '')
    verif(txt('#imp-compteur') == '5 ligne(s)' and 'DUPONT; DITE "LULU" Lucienne' in page.inner_text('#imp-lignes'), 'toutes les lignes : « ; » et guillemets du CSV bien lus')
    nom, contenu = telecharge('#imp-rapport')
    verif(nom == 'rapport_import_adherents.csv' and contenu.startswith('﻿Ligne du fichier;Résultat') and contenu.count('Rejetée') == 2, 'rapport CSV des rejets téléchargé')
    page.screenshot(path=str(CAPTURES / 'l6_02_controle.png'), full_page=False)

    print('\n4. Tester dans une copie')
    verif('copie' in txt('#imp-mode-aide') and txt('#imp-importer') == 'Tester dans une copie', 'mode « test » par défaut')
    page.click('#imp-importer')
    verif('3 ligne(s)' in page.inner_text('.modale-texte'), 'confirmation : ' + page.inner_text('.modale-texte'))
    oui()
    fin()
    res = txt('#imp-resultat')
    verif('Test terminé' in res and 'Ouvrir la copie' in res and page.get_attribute('#imp-resultat a', 'target') == '_blank', 'résultat avec lien vers la copie')
    verif(len(T()['Adherents']) == len(initial['Adherents']), 'classeur de l\'outil inchangé')

    print('\n5. Ajouter')
    page.check('input[name="imp-mode"][value="ajouter"]')
    fin()
    verif(txt('#imp-importer') == 'Ajouter les lignes' and 'ajoutées' in txt('#imp-mode-aide'), 'mode « ajouter » : contrôle relancé contre les données existantes')
    page.click('#imp-importer'); oui(); fin()
    t = T()
    verif(len(t['Adherents']) == len(initial['Adherents']) + 3, '3 adhérents ajoutés')
    g = next(a for a in t['Adherents'] if a['nom'] == 'LAMBERT' and a['prenom'] == 'Gérard')
    verif(g['codePostal'] == '06700' and g['mobile'] == '0612345678' and g['telFixe'] == '0100000102' and g['complementAdresse'] == 'Bât. B'
          and g['commentaire'] == "Vient de l'ancien fichier" and g['dateInscription'] == '2005-09-01' and g['civilite'] == 'M.', g['id'] + ' : zéros initiaux remis, champs bien affectés')
    verif(t and 'Sauvegarde faite juste avant' in notif(), 'sauvegarde faite avant l\'ajout')
    page.click('#imp-verifier'); fin()
    lignes = page.eval_on_selector_all('#imp-lignes tr', 'e => e.map(r => Array.from(r.cells).map(c => c.textContent))')
    verif(any('Doublon : ' + g['id'] in l[3] for l in lignes), 'nouveau contrôle en mode « ajouter » : doublon avec ' + g['id'] + ' détecté')

    print('\n6. Remplacer (prestataires)')
    page.select_option('#imp-table', 'Prestataires')
    page.set_input_files('#imp-fichier', files=[{'name': 'prestataires.csv', 'mimeType': 'text/csv', 'buffer': PRESTA}])
    page.wait_for_selector('#imp-etape-2:not(.hidden)')
    verif(page.is_hidden('#imp-etape-3') and mapping().get('raisonSociale') == 'Raison sociale' and mapping().get('contact') == 'Contact', 'nouveau fichier : correspondance refaite, contrôle à relancer')
    page.click('#imp-verifier'); fin()
    page.check('input[name="imp-mode"][value="remplacer"]'); fin()
    verif('vidée puis remplacée' in txt('#imp-mode-aide') and '« Autre » est conservé' in txt('#imp-mode-aide') and txt('#imp-importer') == 'Remplacer la table', 'mode « remplacer » : avertissement et dépendances affichés')
    page.click('#imp-importer')
    verif(page.locator('.modale.danger').count() == 1, 'confirmation en rouge')
    oui()
    page.wait_for_timeout(150)
    verif('seconde fois' in page.inner_text('.modale-texte'), 'seconde confirmation demandée')
    oui(); fin()
    t = T()
    verif(sorted(x['raisonSociale'] for x in t['Prestataires']) == ['Autocars du Sud', 'Autre', 'Camping Les Pins'], 'prestataires remplacés, « Autre » conservé')

    print('\n7. Fichier Excel (.xlsx)')
    page.select_option('#imp-table', 'Adherents')
    page.set_input_files('#imp-fichier', files=[{'name': 'adherents.xlsx', 'mimeType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'buffer': classeur_xlsx()}])
    page.wait_for_selector('#imp-etape-2:not(.hidden)', timeout=10000)
    verif(appels_sheetjs and 'xlsx/0.18.5/xlsx.full.min.js' in appels_sheetjs[0], 'SheetJS chargé à la demande depuis cdnjs')
    verif(page.input_value('#imp-onglet') == 'Adhérents' and page.eval_on_selector_all('#imp-onglet option', 'o => o.length') == 2, 'onglet « Adhérents » choisi automatiquement parmi 2')
    verif(page.input_value('#imp-ligne-entetes') == '1' and mapping().get('recoitMaillon') == 'Souhaite recevoir le Maillon', 'en-têtes en ligne 1 ; ancien titre « Souhaite recevoir le Maillon » reconnu')
    ex = page.inner_text('#imp-correspondance')
    verif('14/07/1955' in ex and '01/01/2012' in ex and '6700' in ex, 'dates Excel lues en JJ/MM/AAAA')
    page.click('#imp-verifier'); fin()
    stats = page.eval_on_selector_all('#imp-stats .kpi-value', 'e => e.map(x => x.textContent)')
    verif(stats == ['2', '2', '0', '0'], 'Excel : 2 lignes valides (' + '/'.join(stats) + ')')
    page.check('input[name="imp-mode"][value="test"]'); fin()
    page.click('#imp-importer'); oui(); fin()
    verif('Test terminé' in txt('#imp-resultat'), 'test dans une copie : ' + txt('#imp-resultat').split('\n')[0][:90])

    print('\n7 bis. Modèle Modele_import_adherents.xlsx')
    modele = (RACINE / 'Modele_import_adherents.xlsx').read_bytes()
    for table, onglet, nb in (('Adherents', 'Adhérents', 30), ('Activites', 'Activités', 19)):
        page.select_option('#imp-table', table)
        page.set_input_files('#imp-fichier', files=[{'name': 'Modele_import_adherents.xlsx', 'mimeType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'buffer': modele}])
        page.wait_for_function("document.getElementById('imp-onglet').options.length === 5")
        page.wait_for_selector('#imp-etape-2:not(.hidden)')
        mm = mapping()
        verif(page.input_value('#imp-onglet') == onglet and sum(1 for v in mm.values() if v) == nb == len(mm), f'{table} : onglet « {onglet} » choisi, {nb} colonnes sur {len(mm)} associées')
        page.click('#imp-verifier'); fin()
        verif(page.eval_on_selector_all('#imp-stats .kpi-value', 'e => e.map(x => x.textContent)')[:2] == ['1', '1'], f'{table} : la ligne d\'exemple est valide')
    page.select_option('#imp-table', 'Adherents')

    print('\n8. Sauvegardes')
    page.click('#sav-actualiser'); fin()
    noms = page.eval_on_selector_all('#sav-liste tr td:first-child', 'e => e.map(x => x.textContent)')
    verif(len(noms) >= 2 and all(n.startswith('Sauvegarde_Brunants_') for n in noms), str(len(noms)) + ' sauvegardes listées')
    verif(page.locator('#sav-liste a[target="_blank"]').count() >= 2 * len(noms), 'liens vers la copie et le .xlsx')
    page.click('#sav-liste [data-sav="verifier"][data-i="0"]'); fin()
    ver = page.eval_on_selector_all('#sav-verification tbody tr', 'e => e.map(r => Array.from(r.cells).map(c => c.textContent))')
    pres = next(r for r in ver if r[0] == 'Prestataires')
    verif(len(ver) == 10 and pres[1] == str(len(initial['Prestataires'])) and pres[2] == '3' and 'lisible' in txt('#sav-verification'), 'vérifier : 10 tables comparées (Prestataires ' + pres[1] + ' → ' + pres[2] + ')')
    page.screenshot(path=str(CAPTURES / 'l6_03_sauvegardes.png'), full_page=False)
    page.click('#sav-liste [data-sav="restaurer"][data-i="0"]')
    verif('remplacées par celles de la sauvegarde' in page.inner_text('.modale-texte'), 'confirmation de restauration explicite')
    oui(); page.wait_for_timeout(150); oui(); fin()
    t = T()
    verif(len(t['Prestataires']) == len(initial['Prestataires']) and len(t['Adherents']) == len(initial['Adherents']) + 3, 'restauré : prestataires d\'origine, adhérents ajoutés en 5 conservés')
    verif('Restauration terminée' in notif() and len(page.eval_on_selector_all('#sav-liste tr', 'e => e')) == len(noms) + 1, 'liste actualisée : la sauvegarde de sécurité apparaît')

    print('\n9. Budget & Compta : liens vers les justificatifs')
    page.click('.nav-item[data-section="chantier-2"]')
    page.wait_for_timeout(300)
    f = '#form-depense'
    page.fill(f + ' [data-champ="montant"]', '18')
    page.fill(f + ' [data-champ="libelle"]', 'Affranchissement')
    page.select_option(f + ' [data-champ="categorie"]', '7. Fonctionnement association')
    page.select_option(f + ' [data-champ="sousCategorie"]', [o for o in page.eval_on_selector_all(f + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)') if o][0])
    page.fill(f + ' [data-champ="justificatif"]', 'https://drive.google.com/file/d/abc123/view')
    verif(page.get_attribute(f + ' .lien-justif-form a', 'href') == 'https://drive.google.com/file/d/abc123/view', 'formulaire : lien « Ouvrir le document » sous le champ')
    page.click('#dep-enregistrer'); fin()
    idd = re.search(r'DEP-\d{4}-\d{4}', notif()).group(0)
    verif(page.locator(f + ' .lien-justif-form a').count() == 0 and 'Collez le lien' in page.inner_text(f + ' .lien-justif-form'), 'formulaire vidé après l\'enregistrement : l\'aide revient')
    page.fill('#liste-depenses .liste-recherche', idd); page.wait_for_timeout(200)
    a = page.locator('#liste-depenses tbody a.lien-justif')
    verif(a.count() == 1 and a.get_attribute('href') == 'https://drive.google.com/file/d/abc123/view' and a.get_attribute('target') == '_blank' and 'noopener' in a.get_attribute('rel'),
          'liste des dépenses : « 📎 Ouvrir » ouvre le fichier dans un nouvel onglet')
    page.fill('#liste-depenses .liste-recherche', '')
    r = '#form-recette'
    for just, attendu in (('drive.google.com/file/d/xyz789/view', 'https://drive.google.com/file/d/xyz789/view'), ('Reçu n° 12', None)):
        page.fill(r + ' [data-champ="montant"]', '30')
        page.fill(r + ' [data-champ="libelle"]', 'Don ' + just[:5])
        page.select_option(r + ' [data-champ="categorie"]', '7. Fonctionnement association')
        page.select_option(r + ' [data-champ="sousCategorie"]', [o for o in page.eval_on_selector_all(r + ' [data-champ="sousCategorie"] option', 'o => o.map(x => x.value)') if o][0])
        page.fill(r + ' [data-champ="justificatif"]', just)
        page.click('#rec-enregistrer'); fin()
        idr = re.search(r'REC-\d{4}-\d{4}', notif()).group(0)
        page.fill('#liste-recettes .liste-recherche', idr); page.wait_for_timeout(200)
        if attendu:
            verif(page.get_attribute('#liste-recettes tbody a.lien-justif', 'href') == attendu, 'liste des recettes : lien sans « https:// » complété (' + attendu + ')')
        else:
            verif(page.locator('#liste-recettes tbody a.lien-justif').count() == 0 and 'Reçu n° 12' in page.inner_text('#liste-recettes tbody .texte-justif'), 'n° de reçu (pas un lien) : affiché en texte, sans lien')
    page.fill('#liste-recettes .liste-recherche', '')
    page.screenshot(path=str(CAPTURES / 'l6_04_justificatifs.png'), full_page=False)

    print('\n10. Téléphone')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.click('.nav-item[data-section="administration"]') if page.is_visible('.nav-item[data-section="administration"]') else page.evaluate("allerA('administration')")
    page.wait_for_timeout(300)
    largeur = page.evaluate('document.documentElement.scrollWidth')
    verif(largeur <= 392, 'Administration sans défilement horizontal sur téléphone (' + str(largeur) + ' px)')
    page.locator('#panneau-import').screenshot(path=str(CAPTURES / 'l6_05_mobile_import.png'))

    verif(not erreurs, 'aucune erreur JavaScript' + (' : ' + ' | '.join(erreurs[:3]) if erreurs else ''))
    nav.close()

print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
