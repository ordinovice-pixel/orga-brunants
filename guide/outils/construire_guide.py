#!/usr/bin/env python3
"""
construire_guide.py — Assemble le guide d'utilisation en UN fichier HTML autonome (images et script intégrés).

Usage : python3 construire_guide.py <dossier_guide> <Logo.html de l'outil> <fichier_sortie.html>
  <dossier_guide>/source/guide_source.html  : squelette (accueil, bases, style)
  <dossier_guide>/source/rub_*.html          : une rubrique par fichier, insérées dans l'ordre à la place de <!--SUITE-->
  <dossier_guide>/source/guide.js            : navigation, index, recherche
  <dossier_guide>/captures/*.webp            : captures produites par captures_guide.py
"""
import base64
import pathlib
import re
import sys

from PIL import Image

DOSSIER = pathlib.Path(sys.argv[1])
LOGO = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8').strip()
SORTIE = pathlib.Path(sys.argv[3])

src = DOSSIER / 'source'
html = (src / 'guide_source.html').read_text(encoding='utf-8')
rubriques = ''.join(p.read_text(encoding='utf-8') + '\n' for p in sorted(src.glob('rub_*.html')))
html = html.replace('<!--SUITE-->', rubriques)
html = html.replace('/* SCRIPT */', (src / 'guide.js').read_text(encoding='utf-8'))
html = html.replace('LOGO_BRUNANTS', LOGO)

manquantes = []
utilisees = set()


def image(m):
    nom = m.group(1)
    f = DOSSIER / 'captures' / nom
    if not f.exists():
        manquantes.append(nom)
        return m.group(0)
    utilisees.add(nom)
    largeur, hauteur = Image.open(f).size   # dimensions connues d'avance : la page ne « saute » pas au chargement
    return f'width="{largeur}" height="{hauteur}" src="data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode() + '"'


html = re.sub(r'src="captures/([^"]+)"', image, html)

# contrôles : identifiants uniques, liens internes valides
ids = re.findall(r'\sid="([^"]+)"', html)
doublons = sorted({i for i in ids if ids.count(i) > 1})
liens = set(re.findall(r'href="#([^"]+)"', html.split('<script>')[0]))
casses = sorted(l for l in liens if l not in ids)
inutilisees = sorted(p.name for p in (DOSSIER / 'captures').glob('*.webp') if p.name not in utilisees)

SORTIE.write_text(html, encoding='utf-8')
print(f'Guide écrit : {SORTIE} ({SORTIE.stat().st_size / 1e6:.2f} Mo)')
print(f'  {len(utilisees)} captures intégrées, {len(ids)} ancres, {len(liens)} liens internes')
for titre, l in (('Captures manquantes', manquantes), ('Identifiants en double', doublons), ('Liens cassés', casses), ('Captures non utilisées', inutilisees)):
    if l:
        print(f'  ! {titre} : {l}')
if manquantes or doublons or casses:
    sys.exit(1)
