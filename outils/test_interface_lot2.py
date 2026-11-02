#!/usr/bin/env python3
"""
test_interface_lot2.py — Teste la rubrique Adhérents dans un navigateur (aperçu local)
et recalcule les indicateurs de façon indépendante, en Python, à partir des données.
Usage : python3 outils/test_interface_lot2.py [dossier_captures]
"""
import datetime as dt
import pathlib
import re
import sys
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = (RACINE / 'Apercu_local_Brunants.html').as_uri()
CAPTURES = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RACINE / 'captures'
CAPTURES.mkdir(parents=True, exist_ok=True)
ok = ko = 0
erreurs = []


def verif(cond, libelle):
    global ok, ko
    if cond:
        ok += 1; print('  ✔', libelle)
    else:
        ko += 1; print('  ✘', libelle)


def fin(page):
    page.wait_for_selector('#chargement', state='hidden', timeout=10000)
    page.wait_for_timeout(150)


def notif(page):
    return page.locator('.notification').last.inner_text()


def txt(page, sel):
    return page.inner_text(sel).strip()


# ---------- recalcul indépendant (Python) ----------
def actif(a, n):
    fin_ = a['dateFin'] or (a['dateDeces'] if a['deces'] else '')
    return bool(a['dateInscription']) and a['dateInscription'] <= f'{n}-12-31' and (not fin_ or fin_ >= f'{n}-01-01')


def age(naiss, ref):
    if not naiss:
        return None
    n = int(ref[:4]) - int(naiss[:4])
    if ref[5:] < naiss[5:]:
        n -= 1
    return n


def indicateurs(tables, n, auj):
    A = tables['Adherents']
    act = [a for a in A if actif(a, n)]
    ref = auj if n >= int(auj[:4]) else f'{n}-12-31'

    def obs(a):
        f = a['dateFin'] or (a['dateDeces'] if a['deces'] else '')
        return f if f and f < ref else ref
    ages = [age(a['dateNaissance'], obs(a)) for a in act if a['dateNaissance']]
    activites = {x['id']: x for x in tables['Activites']}
    part = set()
    for i in tables['Inscriptions']:
        if i['statut'] != 'Désinscrit' and i['activiteId'] in activites and activites[i['activiteId']]['dateDebut'][:4] == str(n):
            part.add(i['adherentId'])
    for m in tables['MobilHome']:
        if int(m['annee']) == n:
            part.add(m['adherentId'])
    non = [a for a in act if a['id'] not in part]
    return {
        'effectif': len(act),
        'tit': sum(a['type'] == 'Titulaire' for a in act),
        'nouveaux': sum(a['dateInscription'][:4] == str(n) for a in A),
        'deces': sum(bool(a['deces']) and a['dateDeces'][:4] == str(n) for a in A),
        'age': round(sum(ages) / len(ages), 1),
        'h': sum(a['sexe'] == 'H' for a in act), 'f': sum(a['sexe'] == 'F' for a in act),
        'idf': sum(a['region'] == 'Île-de-France' for a in act), 'prov': sum(a['region'] == 'Province' for a in act),
        'tranche85': sum(x >= 85 for x in ages), 'tranche80': sum(80 <= x <= 84 for x in ages),
        'participants': len([a for a in act if a['id'] in part]), 'non': len(non),
        'nonIdf': sum(a['region'] == 'Île-de-France' for a in non),
    }


def participation(tables, adh_id, n):
    activites = {x['id']: x for x in tables['Activites']}
    total = 0
    for i in tables['Inscriptions']:
        a = activites.get(i['activiteId'])
        if i['adherentId'] == adh_id and i['statut'] != 'Désinscrit' and a and a['dateDebut'][:4] == str(n):
            total += max(0, a['coutReelParPersonne'] - (i['montantDu'] if i['montantDu'] != '' else a['prixParPersonne']))
    for m in tables['MobilHome']:
        if m['adherentId'] == adh_id and int(m['annee']) == n:
            total += m['aideAsso']
    return total


def nombre(s):
    return float(re.sub(r'[^\d,]', '', s).replace(',', '.'))


with sync_playwright() as p:
    nav = p.chromium.launch()
    page = nav.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' and 'Failed to load' not in m.text else None)
    page.route('**/cdnjs.cloudflare.com/**', lambda r: r.abort())
    page.goto(PAGE)
    fin(page)
    page.click('.nav-item[data-section="chantier-1"]')
    page.wait_for_timeout(200)
    auj = page.evaluate('APP.d.aujourdhui')

    def tables():
        return page.evaluate('APP.d.tables')

    def kpis():
        return {
            'effectif': int(txt(page, '#adh-kpi-effectif')),
            'tit': int(txt(page, '#adh-kpi-ts').split('/')[0]),
            'nouveaux': int(txt(page, '#adh-kpi-nouveaux')),
            'deces': int(txt(page, '#adh-kpi-deces')),
            'age': nombre(txt(page, '#adh-kpi-age')),
            'h': int(txt(page, '#adh-kpi-hf').split('/')[0]), 'f': int(txt(page, '#adh-kpi-hf').split('/')[1]),
            'idf': int(txt(page, '#adh-kpi-region').split('/')[0]), 'prov': int(txt(page, '#adh-kpi-region').split('/')[1]),
            'tranche85': int(page.inner_text('#adh-tranches tr >> nth=5 >> td >> nth=1')),
            'tranche80': int(page.inner_text('#adh-tranches tr >> nth=4 >> td >> nth=1')),
            'participants': int(txt(page, '#adh-kpi-participants').split('/')[0]),
            'non': int(txt(page, '#adh-kpi-nonpart')),
            'nonIdf': int(txt(page, '#adh-kpi-nonpart-idf')),
        }

    print('\n1. Indicateurs recalculés indépendamment')
    for annee in ('2026', '2025'):
        page.select_option('#annee-select', annee)
        page.wait_for_timeout(250)
        attendu = indicateurs(tables(), int(annee), auj)
        obtenu = kpis()
        ecarts = {k: (obtenu[k], attendu[k]) for k in attendu if obtenu[k] != attendu[k]}
        verif(not ecarts, f'{annee} : {len(attendu)} indicateurs identiques au recalcul' + (f' — écarts {ecarts}' if ecarts else
              f' (effectif {attendu["effectif"]}, âge moyen {attendu["age"]}, participants {attendu["participants"]})'))
        verif(txt(page, '#chantier-1 .kpi-label >> nth=0') == f'EFFECTIF TOTAL {annee}' or txt(page, '#chantier-1 .kpi-label >> nth=0').lower() == f'effectif total {annee}',
              'titre « Effectif total ' + annee + ' »')
    page.select_option('#annee-select', '2026')
    page.wait_for_timeout(250)
    page.screenshot(path=str(CAPTURES / 'l2_01_indicateurs.png'))

    print('\n2. Participation Association : cas vérifié à la main')
    t = tables()
    acts = {a['id']: a for a in t['Activites']}
    # un adhérent inscrit à au moins deux activités 2026
    compte = {}
    for i in t['Inscriptions']:
        if i['statut'] == 'Inscrit' and acts[i['activiteId']]['dateDebut'][:4] == '2026':
            compte[i['adherentId']] = compte.get(i['adherentId'], 0) + 1
    cible = sorted(compte, key=lambda k: (-compte[k], k))[0]
    attendu = participation(t, cible, 2026)
    page.fill('#liste-adherents .liste-recherche', cible)
    page.wait_for_timeout(150)
    montant = nombre(page.inner_text('#liste-adherents tbody tr >> nth=0 >> .lien-bouton'))
    verif(abs(montant - attendu) < 0.01, f'{cible} : Participation 2026 de la liste {montant} € = recalcul {attendu} €')
    page.click('#liste-adherents tbody tr >> nth=0 >> .lien-bouton')
    page.wait_for_timeout(300)
    total_hist = nombre(page.inner_text('#hist-resultat tr.ligne-total td >> nth=3'))
    nb_lignes = page.locator('#hist-resultat tbody tr:not(.ligne-total)').count()
    verif(abs(total_hist - attendu) < 0.01 and nb_lignes >= 2, f'historique ouvert par le montant : {nb_lignes} lignes, cumul {total_hist} €')
    # contrôle ligne par ligne : PA = coût − payé, % = PA / coût
    lignes_ok = True
    for k in range(nb_lignes):
        cells = page.eval_on_selector_all(f'#hist-resultat tbody tr >> nth={k} >> td', 'c => c.map(x => x.innerText)')
        paye = 0 if cells[4] == 'Gratuit' else nombre(cells[4])
        cout, pa, pc = nombre(cells[5]), nombre(cells[6]), nombre(cells[7])
        if abs(cout - paye - pa) > 0.01 or abs(round(100 * pa / cout) - pc) > 0.5:
            lignes_ok = False
    verif(lignes_ok, 'chaque ligne : Participation = coût − payé, % = participation / coût')
    page.select_option('#hist-periode', 'toutes')
    page.wait_for_timeout(150)
    verif(page.locator('#hist-resultat tbody tr:not(.ligne-total)').count() >= nb_lignes, 'période « Toutes les années »')
    page.locator('#panneau-historique').screenshot(path=str(CAPTURES / 'l2_02_historique.png'))
    page.fill('#liste-adherents .liste-recherche', '')

    print('\n3. Création d\'un adhérent : indicateurs et listes mis à jour aussitôt')
    avant = kpis()
    f = '#form-adherent'
    page.click('#adh-enregistrer')
    verif('obligatoire' in page.inner_text(f + ' .form-erreurs'), 'champs obligatoires signalés')
    page.select_option(f + ' [data-champ="civilite"]', 'Mme')
    verif(page.input_value(f + ' [data-champ="sexe"]') == 'F', 'civilité Mme → sexe F proposé')
    page.fill(f + ' [data-champ="nom"]', 'Nouvelle')
    page.fill(f + ' [data-champ="prenom"]', 'Agnès')
    page.fill(f + ' [data-champ="dateNaissance"]', '1938-05-20')
    page.fill(f + ' [data-champ="codePostal"]', '9116')
    page.fill(f + ' [data-champ="email"]', 'agnes@')
    page.click('#adh-enregistrer')
    err = page.inner_text(f + ' .form-erreurs')
    verif('5 chiffres' in err and 'e-mail invalide' in err, 'code postal et e-mail contrôlés en français')
    page.fill(f + ' [data-champ="codePostal"]', '45000')
    verif(page.input_value('#adh-region') == 'Province', 'région calculée en direct : Province')
    page.fill(f + ' [data-champ="codePostal"]', '91160')
    verif(page.input_value('#adh-region') == 'Île-de-France', 'région calculée en direct : Île-de-France')
    page.fill(f + ' [data-champ="email"]', 'agnes.nouvelle@example.org')
    page.fill('#adh-rattache-saisie', 'BERNARD Suzanne — ADH-0001')
    page.dispatch_event('#adh-rattache-saisie', 'change')
    verif(page.input_value(f + ' [data-champ="rattacheA"]') == 'ADH-0001', 'conjoint choisi par recherche → ID ADH-0001')
    page.click('#adh-enregistrer')
    fin(page)
    message = page.locator('.notification').last.inner_text()
    nid = re.search(r'ADH-\d{4}', message).group(0)
    verif('créé' in message, 'message : ' + message.split('\n')[0])
    apres = kpis()
    verif(apres['effectif'] == avant['effectif'] + 1 and apres['nouveaux'] == avant['nouveaux'] + 1 and apres['f'] == avant['f'] + 1
          and apres['tranche85'] == avant['tranche85'] + 1 and apres['non'] == avant['non'] + 1,
          'effectif, nouveaux, femmes, plus de 85 ans et non-participants +1 instantanément')
    verif(page.locator('#liste-adherents tr.ligne-surlignee').count() == 1 and nid in page.inner_text('#liste-adherents tr.ligne-surlignee'),
          'nouvelle fiche surlignée (page de la liste ajustée automatiquement)')
    verif(int(txt(page, '#adh-kpi-age').split(',')[0]) >= 70 and page.input_value(f + ' [data-champ="nom"]') == '', 'formulaire remis à zéro')
    page.fill('#liste-adherents .liste-recherche', 'nouvelle agnes')
    page.wait_for_timeout(150)
    ligne = page.inner_text('#liste-adherents tbody tr >> nth=0')
    verif('NOUVELLE' in ligne and int(page.inner_text('#liste-adherents .liste-compteur strong')) == 1, 'recherche sans accent « nouvelle agnes » → 1 ligne')
    page.fill('#liste-adherents .liste-recherche', '')

    print('\n4. Modification et doublon')
    page.fill('#liste-adherents .liste-recherche', nid)
    page.wait_for_timeout(100)
    page.click('#liste-adherents button[data-action="modifier"]')
    verif(page.inner_text('#adh-form-titre').startswith('Modifier ' + nid), 'Modifier ouvre la fiche dans la zone Saisie')
    verif(page.input_value('#adh-rattache-saisie').endswith('ADH-0001'), 'conjoint affiché dans la fiche')
    page.fill(f + ' [data-champ="cotisation"]', '40')
    page.click('#adh-enregistrer')
    fin(page)
    verif('modifié' in notif(page) and '40 €' in page.inner_text('#liste-adherents tbody tr >> nth=0'), 'cotisation modifiée à 40 € (don)')
    page.click('#adh-nouveau')
    page.fill(f + ' [data-champ="nom"]', 'nouvelle')
    page.fill(f + ' [data-champ="prenom"]', 'agnès')
    page.fill(f + ' [data-champ="dateNaissance"]', '1938-05-20')
    page.select_option(f + ' [data-champ="sexe"]', 'F')
    page.click('#adh-enregistrer')
    fin(page)
    verif('Doublon' in page.inner_text(f + ' .form-erreurs'), 'doublon (nom, prénom, date de naissance) refusé')
    page.click('#adh-annuler')

    print('\n5. Désinscription depuis la liste → archives → réinscription')
    effectif_avant = kpis()['effectif']
    nb_arch = page.locator('#liste-archives').inner_text().count('ADH-')
    page.fill('#liste-adherents .liste-recherche', nid)
    page.wait_for_timeout(100)
    page.click(f'#liste-adherents input[data-action="desinscrire"][data-id="{nid}"]')
    verif(page.locator('.modale').is_visible() and not page.is_checked(f'#liste-adherents input[data-action="desinscrire"]'), 'case « Désinscrit » : fenêtre de date et motif, case pas encore cochée')
    page.click('.modale [data-r="oui"]')
    verif('motif' in page.inner_text('.modale .form-erreurs').lower(), 'motif obligatoire')
    page.select_option('.modale [data-champ="motifFin"]', 'Déménagement')
    page.screenshot(path=str(CAPTURES / 'l2_03_desinscription.png'))
    page.click('.modale [data-r="oui"]')
    fin(page)
    verif('archives' in notif(page), 'message : ' + notif(page).split('\n')[0])
    verif('Désinscrit' in page.inner_text('#liste-adherents tbody tr >> nth=0'), 'reste dans la liste 2026, marqué « Désinscrit » (il était adhérent cette année)')
    verif(kpis()['effectif'] == effectif_avant, 'effectif 2026 inchangé (règle : actif à un moment de l\'année)')
    page.fill('#liste-archives .liste-recherche', nid)
    page.wait_for_timeout(100)
    verif('Déménagement' in page.inner_text('#liste-archives tbody'), 'fiche présente dans « Anciens adhérents (archives) »')
    page.click('#adh-arch-autres')
    page.wait_for_timeout(100)
    verif(page.input_value('#liste-archives .liste-filtre >> nth=0') == "Autre fin d'adhésion", 'bouton « Autres fins d\'adhésion de 2026 » : filtres appliqués')
    page.click('#adh-arch-deces')
    page.wait_for_timeout(100)
    deces_affiches = page.locator('#liste-archives tbody tr:not(:has(.liste-vide))').count()
    page.fill('#liste-archives .liste-recherche', '')
    page.wait_for_timeout(100)
    deces_affiches = page.locator('#liste-archives tbody tr:not(:has(.liste-vide))').count()
    verif(deces_affiches == kpis()['deces'], f'bouton « Décès de 2026 » : {deces_affiches} fiche(s) = indicateur Décès 2026')
    page.click('#adh-arch-toutes')
    page.fill('#liste-archives .liste-recherche', nid)
    page.wait_for_timeout(100)
    page.click('#liste-archives button[data-action="reinscrire"]')
    verif('Réinscrire' in page.inner_text('.modale-titre'), 'fenêtre de réinscription')
    page.click('.modale [data-r="oui"]')
    fin(page)
    verif('réinscrit' in notif(page), 'message : ' + notif(page).split('\n')[0])
    page.fill('#liste-adherents .liste-recherche', nid)
    page.wait_for_timeout(100)
    verif(page.locator(f'#liste-adherents input[data-action="desinscrire"][data-id="{nid}"]').count() == 1, 'de retour dans la liste active')
    page.click('#liste-adherents button[data-action="modifier"]')
    verif('Adhésion précédente' in page.input_value(f + ' [data-champ="commentaire"]'), 'ancienne période notée dans le commentaire')
    page.click('#adh-annuler')

    print('\n6. Décès depuis la fiche')
    page.click('#liste-adherents button[data-action="modifier"]')
    page.check(f + ' [data-champ="deces"]')
    verif(page.locator('#adh-bloc-fin').is_visible() and page.input_value(f + ' [data-champ="motifFin"]') == 'Décès', 'case Décès : date et motif « Décès » affichés')
    page.click('#adh-enregistrer')
    verif('Date du décès' in page.inner_text(f + ' .form-erreurs'), 'date du décès obligatoire')
    page.fill(f + ' [data-champ="dateDeces"]', auj)
    page.click('#adh-enregistrer')
    fin(page)
    verif(kpis()['deces'] == apres['deces'] + 1, 'indicateur Décès 2026 +1')
    page.screenshot(path=str(CAPTURES / 'l2_04_apres_deces.png'))

    print('\n7. Suppression')
    page.fill('#liste-adherents .liste-recherche', 'ADH-0001')
    page.wait_for_timeout(100)
    page.click('#liste-adherents button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    fin(page)
    verif('Suppression impossible' in notif(page), 'adhérent utilisé : suppression refusée (' + notif(page).split('\n')[0][:70] + '…)')
    page.fill('#liste-adherents .liste-recherche', nid)
    page.wait_for_timeout(100)
    page.click('#liste-adherents button[data-action="supprimer"]')
    page.click('.modale [data-r="oui"]')
    fin(page)
    verif('supprimé' in notif(page), 'fiche sans lien supprimée : ' + notif(page).split('\n')[0])
    page.fill('#liste-adherents .liste-recherche', '')

    print('\n8. Listes : pagination, tri, filtres, export')
    page.wait_for_timeout(100)
    verif(page.locator('#liste-adherents tbody tr').count() == 25 and 'Page 1 / ' in page.inner_text('#liste-adherents .liste-page'), '25 lignes par page')
    page.select_option('#liste-adherents .liste-parpage', '0')
    verif(page.locator('#liste-adherents tbody tr').count() == kpis()['effectif'], 'option « Toutes »')
    page.select_option('#liste-adherents .liste-parpage', '25')
    page.click('#liste-adherents th.triable[data-i="5"]')   # Âge
    page.click('#liste-adherents th.triable[data-i="5"]')
    plus_age = int(page.inner_text('#liste-adherents tbody tr >> nth=0 >> td >> nth=5'))
    t = tables()
    max_age = max(age(a['dateNaissance'], min(auj, a['dateFin'] or (a['dateDeces'] if a['deces'] else '') or auj))
                  for a in t['Adherents'] if actif(a, 2026) and a['dateNaissance'])
    verif(plus_age == max_age, f'tri par âge décroissant : {plus_age} ans en tête = âge maximum recalculé {max_age}')
    page.select_option('#liste-adherents .liste-filtre >> nth=0', 'Sympathisant')
    page.select_option('#liste-adherents .liste-filtre >> nth=1', 'Province')
    n_sp = int(page.inner_text('#liste-adherents .liste-compteur strong'))
    t = tables()
    attendu_sp = sum(1 for a in t['Adherents'] if actif(a, 2026) and a['type'] == 'Sympathisant' and a['region'] == 'Province')
    verif(n_sp == attendu_sp, f'filtres Type + Région : {n_sp} = {attendu_sp}')
    page.select_option('#liste-adherents .filtres-colonnes select >> nth=1', 'Décédé')
    verif(int(page.inner_text('#liste-adherents .liste-compteur strong')) <= n_sp, 'filtre en tête de colonne « Désinscrit »')
    page.click('#liste-adherents .liste-raz')
    with page.expect_download() as d:
        page.click('#liste-adherents .liste-export')
    contenu = pathlib.Path(d.value.path()).read_text(encoding='utf-8-sig').splitlines()
    verif(contenu[0].split(';')[:8] == ['N°', 'Nom', 'Prénom', 'Type', 'Adresse postale', 'Âge', 'Téléphone', 'Téléphone fixe'] and 'E-mail' in contenu[0]
          and len(contenu) == kpis()['effectif'] + 1, f'export CSV : {len(contenu) - 1} lignes (toutes les pages), téléphone et e-mail séparés')
    page.locator('#chantier-1 .zone-listes').screenshot(path=str(CAPTURES / 'l2_05_listes.png'))

    print('\n9. Changement d\'année et téléphone')
    page.select_option('#annee-select', '2025')
    page.wait_for_timeout(250)
    verif('Liste des adhérents 2025' in page.inner_text('#chantier-1') and int(page.inner_text('#liste-adherents .liste-compteur strong')) == indicateurs(tables(), 2025, auj)['effectif'],
          'liste 2025 = effectif 2025')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(200)
    verif(page.evaluate('document.documentElement.scrollWidth') <= 392, 'mobile : pas de défilement horizontal de la page')
    page.screenshot(path=str(CAPTURES / 'l2_06_mobile.png'))
    nav.close()

verif(not erreurs, 'aucune erreur JavaScript' + ('' if not erreurs else ' : ' + ' | '.join(erreurs[:4])))
print(f'\n{ok} vérification(s) réussie(s), {ko} échec(s).')
sys.exit(1 if ko else 0)
