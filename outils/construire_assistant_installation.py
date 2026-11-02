#!/usr/bin/env python3
"""
construire_assistant_installation.py — Génère « Assistant_installation.html » :
une page qui liste les 20 fichiers à créer dans Apps Script, avec pour chacun
le nom exact à taper, le type (Script ou HTML) et un bouton « Copier le contenu ».
Usage : python3 outils/construire_assistant_installation.py
"""
import json
import pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
GAS = RACINE / 'apps_script'
SORTIE = RACINE / 'Assistant_installation.html'

# (fichier, nom affiché dans Apps Script, type, action)
FICHIERS = [
    ('appsscript.json', 'appsscript.json', 'Manifeste', 'remplacer'),
    ('Code.gs', 'Code', 'Script', 'remplacer'),
    ('Donnees.gs', 'Donnees', 'Script', 'renommer:Script'),
    ('DonneesFictives.gs', 'DonneesFictives', 'Script', 'creer'),
    ('Automatisations.gs', 'Automatisations', 'Script', 'creer'),
    ('Import.gs', 'Import', 'Script', 'creer'),
    ('Index.html', 'Index', 'HTML', 'renommer:Html'),
    ('Styles.html', 'Styles', 'HTML', 'creer'),
    ('Logo.html', 'Logo', 'HTML', 'creer'),
    ('Js_Commun.html', 'Js_Commun', 'HTML', 'creer'),
    ('Js_TableauDeBord.html', 'Js_TableauDeBord', 'HTML', 'creer'),
    ('Js_Adherents.html', 'Js_Adherents', 'HTML', 'creer'),
    ('Js_Budget.html', 'Js_Budget', 'HTML', 'creer'),
    ('Js_Activites.html', 'Js_Activites', 'HTML', 'creer'),
    ('Js_Prestataires.html', 'Js_Prestataires', 'HTML', 'creer'),
    ('Js_Calendrier.html', 'Js_Calendrier', 'HTML', 'creer'),
    ('Js_Procedures.html', 'Js_Procedures', 'HTML', 'creer'),
    ('Js_AG.html', 'Js_AG', 'HTML', 'creer'),
    ('Js_NAS.html', 'Js_NAS', 'HTML', 'creer'),
    ('Js_Administration.html', 'Js_Administration', 'HTML', 'creer'),
    ('Js_Import.html', 'Js_Import', 'HTML', 'creer'),
]


def consigne(nom, typ, action):
    if action == 'remplacer':
        nom_complet = nom if nom.endswith('.json') else nom + '.gs'
        return (f'Le fichier <b>{nom_complet}</b> existe déjà : cliquez dessus, sélectionnez tout son contenu '
                f'(<kbd>Ctrl</kbd>+<kbd>A</kbd>), puis collez (<kbd>Ctrl</kbd>+<kbd>V</kbd>) pour le remplacer.')
    if action.startswith('renommer:'):
        ancien = action.split(':')[1]
        ext = '.gs' if typ == 'Script' else '.html'
        return (f'Réutilisez le fichier <b>{ancien}{ext}</b> que vous avez déjà créé : survolez-le, cliquez sur les '
                f'<b>⋮</b> à droite → <b>Renommer</b> → tapez <code>{nom}</code> → <kbd>Entrée</kbd>. '
                f'Puis cliquez dedans, <kbd>Ctrl</kbd>+<kbd>A</kbd> et <kbd>Ctrl</kbd>+<kbd>V</kbd>.')
    return (f'Cliquez sur le <b>+</b> à côté de « Fichiers » → <b>{typ}</b> → tapez <code>{nom}</code> '
            f'(sans extension) → <kbd>Entrée</kbd>. Dans le nouveau fichier : <kbd>Ctrl</kbd>+<kbd>A</kbd> '
            f'(pour effacer le modèle proposé) puis <kbd>Ctrl</kbd>+<kbd>V</kbd>.')


def main():
    donnees = []
    for fichier, nom, typ, action in FICHIERS:
        texte = (GAS / fichier).read_text(encoding='utf-8')
        affiche = nom if typ == 'Manifeste' else nom + ('.gs' if typ == 'Script' else '.html')
        donnees.append({'fichier': fichier, 'nom': nom, 'affiche': affiche, 'type': typ,
                        'consigne': consigne(nom, typ, action), 'contenu': texte,
                        'lignes': texte.count('\n') + (0 if texte.endswith('\n') else 1),
                        'taille': max(1, round(len(texte.encode('utf-8')) / 1024))})
    json_securise = json.dumps(donnees, ensure_ascii=False).replace('</', '<\\/')
    page = MODELE.replace('__DONNEES__', json_securise).replace('__NB__', str(len(donnees)))
    SORTIE.write_text(page, encoding='utf-8')
    print(f'{SORTIE.name} : {len(page) // 1024} Ko, {len(donnees)} fichiers')


MODELE = r'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Installation Brunants — installation complète</title>
<style>
  :root { --primary:#1A5276; --secondary:#2E86C1; --accent:#F39C12; --green:#27AE60; --red:#C0392B;
          --dark:#1C2833; --mid:#5D6D7E; --border:#DEE2E6; --bg:#F8F9FA; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:Calibri,'Segoe UI',Arial,sans-serif; font-size:16px; line-height:1.5; color:var(--dark); background:var(--bg); }
  header { background:var(--primary); color:#fff; padding:18px 24px; border-bottom:4px solid var(--accent); }
  header h1 { margin:0; font-size:24px; }
  header p { margin:4px 0 0; opacity:.85; }
  main { max-width:980px; margin:0 auto; padding:20px 16px 60px; }
  .etapes { background:#fff; border-left:4px solid var(--secondary); border-radius:6px; padding:14px 20px; margin-bottom:18px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  .etapes h2 { margin:0 0 6px; font-size:18px; color:var(--primary); }
  .etapes ol { margin:6px 0; padding-left:22px; }
  .etapes li { margin:4px 0; }
  .attention { background:#FEF5E7; border-left:4px solid var(--accent); border-radius:6px; padding:10px 16px; margin-bottom:18px; }
  .progression { position:sticky; top:0; z-index:5; background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 6px rgba(0,0,0,.06); }
  .barre { flex:1; height:10px; background:#EEF0F2; border-radius:5px; overflow:hidden; }
  .barre div { height:100%; width:0; background:var(--green); transition:width .2s; }
  .carte { background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:12px; border-left:4px solid var(--accent); padding:14px 18px; display:grid; grid-template-columns:44px 1fr auto; gap:6px 14px; align-items:start; }
  .carte.fait { border-left-color:var(--green); opacity:.72; }
  .num { width:36px; height:36px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
  .carte.fait .num { background:var(--green); }
  .titre { font-size:19px; font-weight:700; color:var(--primary); }
  .titre code { font-size:19px; }
  .type { display:inline-block; font-size:14px; font-weight:700; padding:1px 9px; border-radius:10px; margin-left:8px; vertical-align:middle; }
  .type.Script { background:#D6EAF8; color:var(--primary); }
  .type.HTML { background:#E8F8F5; color:#1E8449; }
  .type.Manifeste { background:#F4ECF7; color:#7D3C98; }
  .info { color:var(--mid); font-size:14px; }
  .consigne { grid-column:2 / 4; font-size:15px; }
  .actions { display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
  button.copier { font:inherit; font-size:15px; font-weight:700; padding:9px 16px; border:none; border-radius:6px; background:var(--primary); color:#fff; cursor:pointer; white-space:nowrap; }
  button.copier:hover { background:#144766; }
  button.copier.ok { background:var(--green); }
  label.fait { font-size:15px; display:flex; gap:6px; align-items:center; cursor:pointer; white-space:nowrap; }
  label.fait input { width:18px; height:18px; }
  code { background:#F2F3F4; padding:1px 6px; border-radius:4px; font-family:Consolas,monospace; font-size:15px; }
  kbd { background:#fff; border:1px solid #BFC5CA; border-bottom-width:2px; border-radius:4px; padding:0 5px; font-family:inherit; font-size:14px; }
  .fin { background:#E8F8F5; border-left:4px solid var(--green); border-radius:6px; padding:14px 20px; margin-top:18px; }
  .fin h2 { margin:0 0 6px; font-size:18px; color:#1E8449; }
  @media (max-width:640px) { .carte { grid-template-columns:36px 1fr; } .actions { grid-column:1 / 3; flex-direction:row; justify-content:space-between; } .consigne { grid-column:1 / 3; } }
</style>
</head>
<body>
<header>
  <h1>Installation complète de l'outil Les Brunants (version en cours)</h1>
  <p>Étape 4 du LISEZMOI : créer les __NB__ fichiers dans l'éditeur Apps Script</p>
</header>
<main>
  <div class="etapes">
    <h2>Le principe</h2>
    <ol>
      <li>Un fichier de la liste ci-dessous = <b>un fichier séparé</b> dans Apps Script, avec <b>exactement</b> le nom indiqué (majuscules comprises).</li>
      <li>Pour chaque fichier : cliquez sur <b>📋 Copier le contenu</b> ici, passez dans l'onglet Apps Script, puis collez avec <kbd>Ctrl</kbd>+<kbd>V</kbd> dans le fichier correspondant.</li>
      <li>Ne collez jamais les noms des fichiers dans un fichier : seulement le contenu copié par le bouton.</li>
      <li>Cochez <b>Fait</b> au fur et à mesure.</li>
      <li>À la fin, cliquez sur 💾 <b>Enregistrer le projet</b> : les points orange à côté des noms disparaissent.</li>
    </ol>
  </div>
  <div class="attention">
    <b>Pour <code>appsscript.json</code></b> : s'il n'apparaît pas dans la liste des fichiers, cliquez sur ⚙️ <b>Paramètres du projet</b> (roue dentée à gauche), cochez <b>« Afficher le fichier manifeste "appsscript.json" dans l'éditeur »</b>, puis revenez sur <b>&lt;&gt; Éditeur</b>.
  </div>
  <div class="progression"><strong id="compteur">0 / __NB__</strong><div class="barre"><div id="barre"></div></div><span class="info">fichiers faits</span></div>
  <div id="liste"></div>
  <div class="fin">
    <h2>Quand les __NB__ fichiers sont faits</h2>
    <ol>
      <li>Cliquez sur 💾 (<b>Enregistrer le projet</b>). Vérifiez qu'il ne reste <b>aucun point orange</b> dans la liste des fichiers.</li>
      <li>Vérifiez la liste à gauche : <code>appsscript.json</code>, <code>Code.gs</code> et 4 autres <code>.gs</code>, puis 15 fichiers <code>.html</code>. Aucun fichier en trop (pas de <code>Script.gs</code>, <code>Html.html</code> ni <code>Sans titre</code>).</li>
      <li>Ouvrez <code>Code.gs</code>, choisissez <b>setup</b> dans la liste à côté de « Débogage », puis cliquez sur <b>▶ Exécuter</b>. C'est l'étape 5 du LISEZMOI.</li>
    </ol>
  </div>
</main>
<script type="application/json" id="donnees">__DONNEES__</script>
<script>
(function () {
  var fichiers = JSON.parse(document.getElementById('donnees').textContent);
  var CLE = 'brunants-installation-lot1';
  var faits = {};
  try { faits = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) { faits = {}; }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(faits)); } catch (e) {} }

  var liste = document.getElementById('liste');
  fichiers.forEach(function (f, i) {
    var c = document.createElement('div');
    c.className = 'carte';
    c.innerHTML =
      '<div class="num">' + (i + 1) + '</div>' +
      '<div><span class="titre"><code></code></span><span class="type ' + f.type + '">' + f.type + '</span>' +
      '<div class="info">' + f.lignes + ' ligne(s) · ' + f.taille + ' Ko' + (f.fichier === 'Logo.html' ? ' · une seule ligne très longue (c\'est normal : c\'est l\'image du logo)' : '') + '</div></div>' +
      '<div class="actions"><button class="copier" type="button">📋 Copier le contenu</button>' +
      '<label class="fait"><input type="checkbox"> Fait</label></div>' +
      '<div class="consigne">' + f.consigne + '</div>';
    c.querySelector('code').textContent = f.affiche;
    var bouton = c.querySelector('button');
    var coche = c.querySelector('input');
    coche.checked = !!faits[f.fichier];
    c.classList.toggle('fait', coche.checked);
    coche.addEventListener('change', function () {
      faits[f.fichier] = coche.checked; sauver();
      c.classList.toggle('fait', coche.checked); majProgression();
    });
    bouton.addEventListener('click', function () {
      copier(f.contenu).then(function () {
        bouton.textContent = '✔ Copié — collez dans ' + f.affiche;
        bouton.classList.add('ok');
        setTimeout(function () { bouton.textContent = '📋 Copier le contenu'; bouton.classList.remove('ok'); }, 4000);
      }, function () {
        alert('La copie automatique a échoué. Ouvrez le fichier ' + f.fichier + ' du dossier apps_script avec le Bloc-notes, puis Ctrl+A et Ctrl+C.');
      });
    });
    liste.appendChild(c);
  });

  function copier(texte) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texte).catch(function () { return copierAncien(texte); });
    }
    return copierAncien(texte);
  }
  function copierAncien(texte) {
    return new Promise(function (ok, ko) {
      var t = document.createElement('textarea');
      t.value = texte; t.setAttribute('readonly', '');
      t.style.position = 'fixed'; t.style.top = '-1000px';
      document.body.appendChild(t); t.select();
      var reussi = false;
      try { reussi = document.execCommand('copy'); } catch (e) {}
      t.remove();
      reussi ? ok() : ko();
    });
  }
  function majProgression() {
    var n = fichiers.filter(function (f) { return faits[f.fichier]; }).length;
    document.getElementById('compteur').textContent = n + ' / ' + fichiers.length;
    document.getElementById('barre').style.width = (100 * n / fichiers.length) + '%';
  }
  majProgression();
})();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
