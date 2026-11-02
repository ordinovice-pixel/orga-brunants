#!/usr/bin/env python3
"""
test_interface.py — Teste l'interface du lot 1 dans un navigateur (Playwright)
sur l'aperçu local (vrai code + simulateur).
Usage : python3 outils/test_interface.py [dossier_captures]
"""
import pathlib
import sys
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = (RACINE / 'Apercu_local_Brunants.html').as_uri()
CAPTURES = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RACINE / 'captures'
CAPTURES.mkdir(parents=True, exist_ok=True)

ok = ko = 0
erreurs_console = []


def verif(cond, libelle):
    global ok, ko
    if cond:
        ok += 1; print('  ✔', libelle)
    else:
        ko += 1; print('  ✘', libelle)


def attendre_fin(page):
    page.wait_for_selector('#chargement', state='hidden', timeout=10000)
    page.wait_for_timeout(150)


def derniere_notif(page):
    return page.locator('.notification').last.inner_text()


with sync_playwright() as p:
    nav = p.chromium.launch()
    page = nav.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    page.on('console', lambda m: erreurs_console.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: erreurs_console.append(str(e)))
    page.route('**/cdnjs.cloudflare.com/**', lambda r: r.abort())   # hors ligne : Chart.js non nécessaire au lot 1
    page.goto(PAGE)
    attendre_fin(page)

    print('\n1. Ouverture')
    verif(page.locator('#bandeau-entrainement').is_visible(), 'bandeau MODE ENTRAÎNEMENT visible')
    verif('apercu.local@exemple.fr' in page.inner_text('#bandeau-entrainement'), 'bandeau : e-mail de test affiché')
    annees = page.eval_on_selector_all('#annee-select option', 'o => o.map(x => x.value)')
    verif(annees == ['2026', '2025'], f'années proposées {annees}, 2026 par défaut : {page.input_value("#annee-select")}')
    verif(page.inner_text('#topbar-title') == 'Tableau de bord', 'rubrique Tableau de bord ouverte')
    page.screenshot(path=str(CAPTURES / '01_tableau_de_bord.png'))

    print('\n2. Navigation et zones')
    for section, titre in [('chantier-1', 'Adhérents'), ('chantier-2', 'Budget & Compta'), ('chantier-3', 'Activités'),
                           ('prestataires', 'Prestataires'), ('chantier-4', 'Calendrier'), ('chantier-6', 'Assemblée Générale'),
                           ('administration', 'Administration')]:
        page.click(f'.nav-item[data-section="{section}"]')
        visible = page.locator(f'#{section}').is_visible()
        zones = page.eval_on_selector_all(f'#{section} .zone-titre', 'z => z.map(x => x.textContent)')
        verif(visible and page.inner_text('#topbar-title') == titre and zones[0] == 'Indicateurs',
              f'{titre} : zones {zones}')
    couleurs = page.eval_on_selector_all('#administration .zone', 'z => z.map(x => getComputedStyle(x).backgroundColor)')
    verif(couleurs == ['rgb(227, 242, 253)', 'rgb(232, 245, 233)', 'rgb(255, 248, 225)'], 'couleurs des 3 zones : ' + ', '.join(couleurs))
    page.screenshot(path=str(CAPTURES / '02_administration.png'), full_page=True)

    print('\n3. Indicateurs et sélecteur d\'année')
    def ligne_etat(onglet):
        return page.eval_on_selector_all('#adm-etat-tables tr', f'''r => r.map(x => [...x.cells].map(c => c.innerText))
            .find(c => c[0] === "{onglet}")''')
    verif(ligne_etat('Budgets')[2:4] == ['14', '7'], f'Budgets : 14 lignes dont 7 en 2026 → {ligne_etat("Budgets")}')
    verif(page.inner_text('#administration .panel-title >> nth=0').strip().endswith('2026'), 'titre d\'encart porte l\'année : ' + page.inner_text('#administration .panel-title >> nth=0'))
    page.select_option('#annee-select', '2025')
    page.wait_for_timeout(200)
    verif('2025' in page.inner_text('#administration .panel-title >> nth=0') and ligne_etat('Budgets')[3] == '7', 'année 2025 : titres et compteurs mis à jour')
    nb_journal = page.locator('#liste-journal tbody td.liste-vide').count()
    verif(nb_journal == 1, 'journal 2025 vide (installation faite en 2026)')
    page.select_option('#annee-select', '2026')
    page.wait_for_timeout(200)
    verif(page.inner_text('#adm-kpi-mode') == 'Entraînement', 'KPI mode : Entraînement')

    print('\n4. Liste générique : recherche, filtres, tri')
    liste = '#liste-categories-table'
    def nb_lignes():   # nombre de lignes filtrées (toutes pages confondues)
        return int(page.inner_text(f'{liste} .liste-compteur strong'))
    total = nb_lignes()
    verif(total == 27, f'{total} catégories affichées')
    page.fill(f'{liste} .liste-recherche', 'randonnees')
    page.wait_for_timeout(100)
    verif(nb_lignes() == 1 and '2.3 Randonnées' in page.inner_text(f'{liste} tbody'), 'recherche sans accent « randonnees » → 2.3 Randonnées')
    page.fill(f'{liste} .liste-recherche', '')
    page.select_option(f'{liste} .liste-filtre', 'Recette')
    page.wait_for_timeout(100)
    verif(nb_lignes() == 3, f'filtre Type = Recette → {nb_lignes()} lignes')
    page.select_option(f'{liste} .liste-filtre', '')
    page.select_option(f'{liste} .filtres-colonnes select[data-col="1"]', '7. Fonctionnement association')
    page.wait_for_timeout(100)
    verif(nb_lignes() == 7, f'filtre en tête de colonne Catégorie = 7. Fonctionnement → {nb_lignes()} lignes')
    page.fill(f'{liste} .filtres-colonnes input[data-col="2"]', 'adherents')
    page.wait_for_timeout(100)
    verif(nb_lignes() == 1, 'filtre texte en tête de colonne Sous-catégorie « adherents » → 1 ligne')
    page.click(f'{liste} .liste-raz')
    page.wait_for_timeout(100)
    verif(nb_lignes() == 27, 'bouton « Effacer les filtres »')
    page.click(f'{liste} th.triable[data-i="1"]')
    premiere = page.inner_text(f'{liste} tbody tr >> nth=0 >> td >> nth=1')
    page.click(f'{liste} th.triable[data-i="1"]')
    derniere = page.inner_text(f'{liste} tbody tr >> nth=0 >> td >> nth=1')
    verif(premiere < derniere and '▼' in page.inner_text(f'{liste} th.triable[data-i="1"]'), f'tri croissant « {premiere} » puis décroissant « {derniere} »')

    print('\n5. Saisie : création, contrôles, modification, suppression')
    form = '#form-categorie'
    page.click('#cat-enregistrer')
    verif(page.locator(f'{form} .form-erreurs').is_visible() and 'obligatoire' in page.inner_text(f'{form} .form-erreurs'),
          'contrôle : catégorie obligatoire (message en français)')
    verif(page.locator(f'{form} [data-champ="categorie"].champ-erreur').count() == 1, 'champ en erreur surligné')
    page.fill(f'{form} [data-champ="categorie"]', '7. Fonctionnement association')
    page.fill(f'{form} [data-champ="sousCategorie"]', 'Fève des rois')
    page.select_option(f'{form} [data-champ="type"]', 'Dépense')
    page.click('#cat-enregistrer')
    attendre_fin(page)
    verif('Catégorie CAT-028 créée' in derniere_notif(page), 'message : ' + derniere_notif(page))
    verif(nb_lignes() == 28 and page.locator(f'{liste} tr.ligne-surlignee').count() == 1, 'nouvelle ligne visible et surlignée')
    verif(page.locator('#liste-journal tbody tr >> nth=0').inner_text().find('Création') >= 0, 'journal mis à jour instantanément')
    page.fill(f'{form} [data-champ="categorie"]', '7. Fonctionnement association')
    page.fill(f'{form} [data-champ="sousCategorie"]', 'fève des rois')
    page.click('#cat-enregistrer')
    attendre_fin(page)
    verif('existe déjà' in page.inner_text(f'{form} .form-erreurs'), 'doublon refusé par le serveur, affiché dans le formulaire')
    page.fill(f'{liste} .liste-recherche', 'feve')
    page.click(f'{liste} button[data-action="modifier"]')
    verif(page.inner_text('#cat-form-titre') == 'Modifier CAT-028', 'Modifier ouvre la fiche dans la zone Saisie')
    page.fill(f'{form} [data-champ="sousCategorie"]', 'Fève')
    page.click('#cat-enregistrer')
    attendre_fin(page)
    verif('modifiée' in derniere_notif(page) and 'Fève' in page.inner_text(liste + ' tbody'), 'modification enregistrée')
    page.screenshot(path=str(CAPTURES / '03_saisie_categorie.png'), full_page=True)
    page.click(f'{liste} button[data-action="supprimer"]')
    verif(page.locator('.modale').is_visible() and 'CAT-028' in page.inner_text('.modale'), 'confirmation avant suppression')
    page.screenshot(path=str(CAPTURES / '04_confirmation.png'))
    page.click('.modale [data-r="oui"]')
    attendre_fin(page)
    verif('supprimée' in derniere_notif(page) and nb_lignes() == 0, 'suppression effectuée')
    page.fill(f'{liste} .liste-recherche', '4.3 Retransmissions')
    page.click(f'{liste} button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    attendre_fin(page)
    verif('CAT-' in derniere_notif(page) and 'supprimée' in derniere_notif(page), 'sous-catégorie supprimée (la catégorie garde d\'autres lignes) : ' + derniere_notif(page).split(chr(10))[0])
    page.fill(f'{liste} .liste-recherche', '')

    print('\n6. Export CSV')
    with page.expect_download() as dl:
        page.click(f'{liste} .liste-export')
    fichier = dl.value
    contenu = pathlib.Path(fichier.path()).read_text(encoding='utf-8-sig')
    verif(fichier.suggested_filename.startswith('categories_2026_') and contenu.splitlines()[0] == "ID;Catégorie;Sous-catégorie;Type;Ce qu'elle recouvre;Utilisée par",
          f'export « {fichier.suggested_filename} » : en-tête {contenu.splitlines()[0]}')

    print('\n7. Modification à la main + Actualiser')
    page.click('#sim-main')   # déclenche une alerte
    page.wait_for_timeout(100)
    page.click('#btn-actualiser')
    attendre_fin(page)
    verif(page.locator('#bandeau-avertissements').is_visible() and '1 ligne(s) ignorée(s)' in page.inner_text('#bandeau-avertissements'),
          'bandeau : ' + page.inner_text('#bandeau-avertissements').split('\n')[0])
    page.fill(f'{liste} .liste-recherche', 'CAT-900')
    page.wait_for_timeout(100)
    verif('CAT-900' in page.inner_text(liste + ' tbody'), 'ligne ajoutée à la main affichée')
    page.fill(f'{liste} .liste-recherche', '')
    verif('ID manquant' in page.inner_text('#liste-avertissements tbody'), 'liste « Lignes à corriger » : ID manquant')
    verif(page.inner_text('#adm-kpi-av') == '1', 'KPI lignes à corriger = 1')
    page.screenshot(path=str(CAPTURES / '05_lignes_a_corriger.png'), full_page=True)

    print('\n8. Paramètres et sauvegarde')
    page.fill('#form-parametres [data-champ="EMAIL_TEST"]', 'pas-un-mail')
    page.click('#param-enregistrer')
    verif('invalide' in page.inner_text('#form-parametres .form-erreurs'), 'e-mail de test invalide refusé')
    page.fill('#form-parametres [data-champ="EMAIL_TEST"]', 'tresoriere@exemple.fr')
    page.fill('#form-parametres [data-champ="AIDE_MOBILHOME"]', '65')
    page.click('#param-enregistrer')
    attendre_fin(page)
    verif('tresoriere@exemple.fr' in page.inner_text('#bandeau-entrainement'), 'bandeau mis à jour avec le nouvel e-mail de test')
    page.uncheck('#form-parametres [data-champ="MODE_ENTRAINEMENT"]')
    page.click('#param-enregistrer')
    verif(page.locator('.modale.danger').is_visible(), 'passage en mode réel : confirmation demandée')
    page.click('.modale [data-r="non"]')
    page.click('#param-annuler')
    verif(page.is_checked('#form-parametres [data-champ="MODE_ENTRAINEMENT"]'), 'annulation : mode entraînement conservé')
    page.click('#btn-sauvegarder')
    attendre_fin(page)
    verif('Sauvegarde « Sauvegarde_Brunants_' in derniere_notif(page), 'sauvegarde : ' + derniere_notif(page).replace('\n', ' '))
    verif(page.inner_text('#adm-kpi-sauv') != 'Aucune', 'KPI dernière sauvegarde : ' + page.inner_text('#adm-kpi-sauv'))
    page.click('#adm-mail-test')
    attendre_fin(page)
    verif('uniquement à tresoriere@exemple.fr' in derniere_notif(page), 'e-mail de test redirigé : ' + derniere_notif(page))
    nb_mails = page.evaluate('FauxGAS.mails.length')
    verif(nb_mails == 1 and page.evaluate('FauxGAS.mails[0].to') == 'tresoriere@exemple.fr', '1 seul e-mail parti, vers l\'adresse de test')

    print('\n9. Affichage mobile')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(200)
    largeur = page.evaluate('document.documentElement.scrollWidth')
    verif(largeur <= 392, f'pas de défilement horizontal de la page (largeur {largeur}px)')
    page.screenshot(path=str(CAPTURES / '06_mobile.png'), full_page=False)

    nav.close()

verif(not erreurs_console, 'aucune erreur JavaScript' + ('' if not erreurs_console else ' : ' + ' | '.join(erreurs_console[:5])))
print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
