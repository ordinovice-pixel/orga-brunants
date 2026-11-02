#!/usr/bin/env python3
"""
construire_apercu.py — Assemble une page HTML autonome qui fait tourner le VRAI code
de l'outil (fichiers .gs + .html) dans un navigateur, sans Google, grâce au simulateur
faux_gas.js. Les données vivent en mémoire : rien n'est enregistré.

Usage : python3 outils/construire_apercu.py  →  Apercu_local_Brunants.html
"""
import json
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
GAS = RACINE / 'apps_script'
SORTIE = RACINE / 'Apercu_local_Brunants.html'
FICHIERS_GS = ['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs']

INCLUDE = re.compile(r"<\?!=\s*include\('([^']+)'\);?\s*\?>")


def resoudre(nom: str) -> str:
    texte = (GAS / f'{nom}.html').read_text(encoding='utf-8')
    return INCLUDE.sub(lambda m: resoudre(m.group(1)), texte)


def serveur() -> str:
    code = '\n'.join((GAS / f).read_text(encoding='utf-8') for f in FICHIERS_GS)
    noms = sorted(set(re.findall(r'^function\s+([A-Za-z0-9_]+)\s*\(', code, re.M)))
    exports = ', '.join(f'{n}: {n}' for n in noms)
    return f"""
<script>
/* ===== Simulateur Apps Script (aperçu local uniquement) ===== */
{(RACINE / 'outils' / 'faux_gas.js').read_text(encoding='utf-8')}
FauxGAS.installer(window);
FauxGAS.utilisateur = 'apercu.local@exemple.fr';
var SERVEUR = (function () {{
{code}
  setup();
  return {{ {exports} }};
}})();

/* google.script.run simulé : JSON uniquement, Date interdite, fonctions « _ » privées */
(function () {{
  function contientDate(o) {{
    if (Object.prototype.toString.call(o) === '[object Date]') return true;
    if (o && typeof o === 'object') return Object.keys(o).some(function (k) {{ return contientDate(o[k]); }});
    return false;
  }}
  function coureur(succes, echec) {{
    return new Proxy({{}}, {{
      get: function (_, nom) {{
        if (nom === 'withSuccessHandler') return function (h) {{ return coureur(h, echec); }};
        if (nom === 'withFailureHandler') return function (h) {{ return coureur(succes, h); }};
        if (nom === 'withUserObject') return function () {{ return coureur(succes, echec); }};
        return function () {{
          var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
          setTimeout(function () {{
            try {{
              if (/_$/.test(nom) || typeof SERVEUR[nom] !== 'function') throw new Error('Script function not found: ' + nom);
              var r = SERVEUR[nom].apply(null, args);
              if (contientDate(r)) throw new Error('Valeur Date renvoyée par ' + nom + ' (refusée par google.script.run)');
              r = r === undefined ? null : JSON.parse(JSON.stringify(r));
              if (succes) succes(r);
            }} catch (e) {{
              console.warn('[serveur simulé] ' + e.message);
              if (echec) echec(e);
            }}
          }}, 250);
        }};
      }}
    }});
  }}
  window.google = {{ script: {{ run: coureur(null, null) }} }};
}})();

/* Bandeau de l'aperçu + simulation d'une saisie à la main dans le classeur */
document.addEventListener('DOMContentLoaded', function () {{
  var b = document.createElement('div');
  b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:130;background:#1C2833;color:#fff;font:14px Calibri,Arial;padding:8px 12px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.3);max-width:330px';
  b.innerHTML = '<strong>Aperçu local</strong> — simulateur en mémoire, rien n\\'est enregistré sur Google.<br>' +
    '<button id="sim-main" style="margin-top:6px;font:14px Calibri;padding:3px 8px;cursor:pointer">Simuler 2 lignes saisies à la main</button>';
  document.body.appendChild(b);
  document.getElementById('sim-main').onclick = function () {{
    var f = FauxGAS.classeurLie.brut('Categories');
    var n = f.getLastRow();
    f.d[n] = ['CAT-900', 'Divers', 'Ajout à la main', 'les deux'];
    f.d[n + 1] = ['', 'Divers', 'Ligne sans ID', 'Recette'];
    alert('Deux lignes ont été ajoutées « à la main » dans l\\'onglet Categories.\\nCliquez sur « Actualiser » pour les relire.');
  }};
}});
</script>
"""


def main():
    page = resoudre('Index')
    page = page.replace('</head>', serveur() + '\n</head>', 1)
    page = page.replace('<title>Les Brunants — Outil de gestion</title>',
                        '<title>Les Brunants — Aperçu local (lot 5)</title>', 1)
    SORTIE.write_text(page, encoding='utf-8')
    print(f'{SORTIE.name} : {len(page) // 1024} Ko')


if __name__ == '__main__':
    main()
