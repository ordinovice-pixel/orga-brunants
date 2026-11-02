#!/usr/bin/env python3
"""
construire_assistant_mise_a_jour.py — Génère « Assistant_mise_a_jour_LotN.html » :
la liste des SEULS fichiers modifiés depuis le lot précédent, avec un bouton
« Copier le contenu » pour chacun, puis les étapes de fin (setup, nouvelle version).

Usage : python3 outils/construire_assistant_mise_a_jour.py <numéro du lot> <dossier apps_script du lot précédent>
"""
import filecmp
import json
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
GAS = RACINE / 'apps_script'
LOT = sys.argv[1]
BASE = pathlib.Path(sys.argv[2])
# lot précédent : « 4b » vient après « 4 », « 5 » après « 4 » (ou « 4b » si on le précise en 3e argument)
LOTPREC = sys.argv[3] if len(sys.argv) > 3 else (LOT[:-1] if LOT[-1].isalpha() else str(int(LOT) - 1))
SORTIE = RACINE / f'Assistant_mise_a_jour_Lot{LOT}.html'

# Étapes propres à certains lots (insérées dans la partie « Quand les fichiers sont remplacés »)
ETAPES_LOT = {
    '6c': {
        'setup': '''
        <div class="attention" style="margin-top:8px">Dans le journal, vous devez voir : « Paramètres : nombre de sauvegardes conservées passé de 12 à 24 », « Catégories : sous-catégorie « 8.3 Dons » ajoutée » et « Catégories : descriptif de 7.2 mis à jour ». Aucune nouvelle autorisation n'est demandée.</div>''',
        'fin': '''
      <li>Suivez ensuite, dans <code>LISEZMOI_Lot6c.md</code>, la partie <b>« Importer vos vrais adhérents »</b>. <b>Ne lancez pas l'import avant d'avoir installé cette mise à jour</b> : c'est elle qui protège vos adhérents réels.</li>'''
    },
    '6b': {
        'setup': '''
        <div class="attention" style="margin-top:8px">Dans le journal, vous devez voir « colonne(s) ajoutée(s) : Ce qu'elle recouvre » (onglet Categories), puis l'avertissement <b>« ⚠️ ATTENTION : les catégories du classeur sont encore les anciennes… »</b>. C'est normal : l'étape suivante le règle. Aucune nouvelle autorisation n'est demandée.</div>''',
        'fin': '''
      <li><b>Indispensable</b> : <b>9. Administration → Outils → ↻ Réinitialiser les données d'entraînement</b>. Cela charge les 8 catégories du bureau et reclasse toutes les activités, recettes, dépenses et budgets d'entraînement. Déroulez ensuite les tests du fichier <code>LISEZMOI_Lot6b.md</code>.</li>'''
    },
    '6': {
        'setup': '''
        <div class="attention" style="margin-top:8px">Le lot 6 n'ajoute aucune colonne au classeur et ne demande aucune nouvelle autorisation : le journal affiche simplement « Installation terminée ».</div>''',
        'fin': '''
      <li>Ouvrez <b>9. Administration</b> : deux nouveaux panneaux apparaissent en bas, <b>📥 Assistant d'import des vraies données</b> et <b>🗄️ Sauvegardes et restauration</b>. Déroulez ensuite les tests du fichier <code>LISEZMOI_Lot6.md</code>.</li>'''
    },
    '5': {
        'setup': '''
        <div class="attention" style="margin-top:8px">Dans le journal, vous devez voir : « colonne(s) ajoutée(s) : Dates des échéances… » (onglet Activites) et « ID recette de remboursement » (onglet Echeances). Aucune nouvelle autorisation n'est demandée.</div>''',
        'fin': '''
      <li><i>Conseillé</i> : <b>9. Administration → Outils → ↻ Réinitialiser les données d'entraînement</b>. Le remboursement fictif devient alors une recette négative (nouvelle règle), et l'activité « Repas de fin d'année 2026 » reçoit des dates d'échéances personnalisées pour l'exemple. Sans réinitialisation, tout fonctionne : l'ancien remboursement reste une dépense.</li>'''
    },
    '4c': {
        'setup': '',
        'fin': '''
      <li><b>Relancez le test d'import</b> : 9. Administration → 🧪 Tester l'import des adhérents. Résultat attendu : <b>398 fiches importées sur 398, 0 refusée</b>. Vous pouvez mettre à la corbeille l'ancienne copie de test (dossier Outil_Brunants/Tests_import).</li>'''
    },
    '4b': {
        'setup': '''
        <div class="attention" style="margin-top:8px">Dans le journal, vous devez voir : « Onglet « Adherents » : colonne « Souhaite recevoir le Maillon » renommée « Souhaite recevoir le Maillon papier » » et
          « colonne(s) ajoutée(s) : Année entrée JMB, Date sortie JMB, Recevoir toutes les communications par mail ». Les 3 nouvelles colonnes sont ajoutées <b>à la fin</b> de l'onglet <code>Adherents</code> : c'est normal, l'outil retrouve les colonnes par leur titre.</div>''',
        'fin': '''
      <li><i>Facultatif</i> : <b>9. Administration → Outils → ↻ Réinitialiser les données d'entraînement</b> pour que le jeu d'essai remplisse aussi « Année entrée JMB », « Date sortie JMB » et « Recevoir toutes les communications par mail ». Sans cela, ces champs restent vides sur les fiches existantes (rien d'autre ne change).</li>'''
    },
    '4': {
        'setup': '''
        <div class="attention" style="margin-top:8px">🔐 <b>Nouvelle autorisation demandée</b> : le lot 4 crée des Google Docs (fiches d'inscription).
          Une fenêtre « Autorisation requise » s'ouvre : <b>Examiner les autorisations</b> → choisir le compte des Brunants →
          si Google affiche « Google n'a pas validé cette application » : <b>Paramètres avancés</b> → <b>Accéder à … (non sécurisé)</b> →
          <b>Autoriser</b>. Puis relancez <b>▷ Exécuter</b> sur <code>setup</code> si le journal ne montre pas « Installation terminée ».</div>''',
        'fin': '''
      <li><b>Rechargez les données d'entraînement</b> (indispensable au lot 4 : les échéances, les campings des locations et les recettes automatiques
        n'existaient pas dans les données du lot 3) : dans l'outil, <b>9. Administration → Outils → ↻ Réinitialiser les données d'entraînement</b>,
        puis confirmez deux fois. Une sauvegarde complète est faite juste avant. Comptez environ une minute.</li>
      <li>Chaque membre du bureau qui ouvre l'outil devra lui aussi <b>autoriser</b> une fois l'accès à Google Docs.</li>'''
    }
}

ORDRE = ['appsscript.json', 'Code.gs', 'Donnees.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs',
         'Index.html', 'Styles.html', 'Logo.html', 'Js_Commun.html', 'Js_TableauDeBord.html', 'Js_Adherents.html',
         'Js_Budget.html', 'Js_Activites.html', 'Js_Prestataires.html', 'Js_Calendrier.html', 'Js_Procedures.html',
         'Js_AG.html', 'Js_NAS.html', 'Js_Administration.html', 'Js_Import.html']


def main():
    donnees = []
    for fichier in ORDRE:
        ancien = BASE / fichier
        nouveau = GAS / fichier
        if ancien.exists() and filecmp.cmp(ancien, nouveau, shallow=False):
            continue
        texte = nouveau.read_text(encoding='utf-8')
        typ = 'Manifeste' if fichier.endswith('.json') else ('Script' if fichier.endswith('.gs') else 'HTML')
        nom = fichier if typ == 'Manifeste' else fichier.rsplit('.', 1)[0]
        if ancien.exists():
            consigne = (f'Cliquez sur <b>{fichier}</b> dans la liste des fichiers, sélectionnez tout son contenu '
                        f'(<kbd>Ctrl</kbd>+<kbd>A</kbd>), puis collez (<kbd>Ctrl</kbd>+<kbd>V</kbd>) pour le remplacer.')
        else:
            consigne = (f'Nouveau fichier : <b>+</b> à côté de « Fichiers » → <b>{typ}</b> → tapez <code>{nom}</code> '
                        f'→ <kbd>Entrée</kbd>, puis <kbd>Ctrl</kbd>+<kbd>A</kbd> et <kbd>Ctrl</kbd>+<kbd>V</kbd>.')
        donnees.append({'fichier': fichier, 'affiche': fichier, 'type': typ, 'consigne': consigne, 'contenu': texte,
                        'lignes': texte.count('\n') + (0 if texte.endswith('\n') else 1),
                        'taille': max(1, round(len(texte.encode('utf-8')) / 1024))})
    json_securise = json.dumps(donnees, ensure_ascii=False).replace('</', '<\\/')
    extra = ETAPES_LOT.get(LOT, {})
    page = (MODELE.replace('__EXTRA_SETUP__', extra.get('setup', '')).replace('__EXTRA_FIN__', extra.get('fin', ''))
            .replace('__DONNEES__', json_securise).replace('__NB__', str(len(donnees)))
            .replace('__LOT__', LOT).replace('__LOTPREC__', LOTPREC))
    SORTIE.write_text(page, encoding='utf-8')
    print(f'{SORTIE.name} : {len(donnees)} fichier(s) modifié(s) : ' + ', '.join(d['fichier'] for d in donnees))


MODELE = r'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mise à jour Brunants — Lot __LOT__</title>
<style>
  :root { --primary:#1A5276; --secondary:#2E86C1; --accent:#F39C12; --green:#27AE60; --red:#C0392B;
          --dark:#1C2833; --mid:#5D6D7E; --border:#DEE2E6; --bg:#F8F9FA; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:Calibri,'Segoe UI',Arial,sans-serif; font-size:16px; line-height:1.5; color:var(--dark); background:var(--bg); }
  header { background:var(--primary); color:#fff; padding:18px 24px; border-bottom:4px solid var(--accent); }
  header h1 { margin:0; font-size:24px; }
  header p { margin:4px 0 0; opacity:.85; }
  main { max-width:980px; margin:0 auto; padding:20px 16px 60px; }
  .bloc { background:#fff; border-left:4px solid var(--secondary); border-radius:6px; padding:14px 20px; margin-bottom:18px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  .bloc h2 { margin:0 0 6px; font-size:18px; color:var(--primary); }
  .bloc ol { margin:6px 0; padding-left:22px; }
  .bloc li { margin:5px 0; }
  .bloc.fin { border-left-color:var(--green); background:#E8F8F5; }
  .bloc.fin h2 { color:#1E8449; }
  .attention { background:#FEF5E7; border-left:4px solid var(--accent); border-radius:6px; padding:10px 16px; margin-bottom:18px; }
  .progression { position:sticky; top:0; z-index:5; background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 6px rgba(0,0,0,.06); }
  .barre { flex:1; height:10px; background:#EEF0F2; border-radius:5px; overflow:hidden; }
  .barre div { height:100%; width:0; background:var(--green); transition:width .2s; }
  .carte { background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:12px; border-left:4px solid var(--accent); padding:14px 18px; display:grid; grid-template-columns:44px 1fr auto; gap:6px 14px; align-items:start; }
  .carte.fait { border-left-color:var(--green); opacity:.72; }
  .num { width:36px; height:36px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
  .carte.fait .num { background:var(--green); }
  .titre code { font-size:19px; font-weight:700; color:var(--primary); }
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
  @media (max-width:640px) { .carte { grid-template-columns:36px 1fr; } .actions { grid-column:1 / 3; flex-direction:row; justify-content:space-between; } .consigne { grid-column:1 / 3; } }
</style>
</head>
<body>
<header>
  <h1>Mise à jour de l'outil Les Brunants — lot __LOTPREC__ → lot __LOT__</h1>
  <p>Seuls les __NB__ fichiers modifiés sont à recopier. Les autres ne changent pas.</p>
</header>
<main>
  <div class="bloc">
    <h2>Avant de commencer</h2>
    <ol>
      <li>Ouvrez le classeur <b>Brunants_Donnees</b>, puis <b>Extensions → Apps Script</b>, avec le compte des Brunants.</li>
      <li>Conseillé : dans l'outil, cliquez sur <b>💾 Sauvegarder maintenant</b>, pour pouvoir revenir en arrière.</li>
    </ol>
  </div>
  <div class="attention">Pour chaque carte : <b>📋 Copier le contenu</b> ici, puis dans Apps Script, cliquez dans le fichier du même nom, <kbd>Ctrl</kbd>+<kbd>A</kbd> et <kbd>Ctrl</kbd>+<kbd>V</kbd>. Cochez <b>Fait</b> au fur et à mesure.</div>
  <div class="progression"><strong id="compteur">0 / __NB__</strong><div class="barre"><div id="barre"></div></div><span class="info">fichiers remplacés</span></div>
  <div id="liste"></div>
  <div class="bloc fin">
    <h2>Quand les __NB__ fichiers sont remplacés</h2>
    <ol>
      <li>Cliquez sur 💾 <b>Enregistrer le projet</b> : plus aucun point orange à côté des noms.</li>
      <li><b>Exécutez <code>setup</code></b> :
        <ul>
          <li>cliquez sur <b>Code.gs</b> dans la liste des fichiers (le bouton « Exécuter » n'apparaît que sur un fichier <code>.gs</code>) ;</li>
          <li>dans la liste déroulante à côté de « Débogage », choisissez <b>setup</b> — <u>ni</u> <code>doGet</code>, <u>ni</u> <code>menuSetup</code> ;</li>
          <li>cliquez sur <b>▷ Exécuter</b> et attendez « Installation terminée » dans le journal d'exécution (30 secondes à 1 minute).</li>
        </ul>
        Il charge les nouvelles données d'entraînement dans les onglets encore vides, sans toucher au reste.__EXTRA_SETUP__</li>
      <li><b>Publiez la nouvelle version</b> du déploiement <b>existant</b> : <b>Déployer → Gérer les déploiements</b> → sélectionnez le déploiement actif → icône ✏️ (modifier) → <b>Version : Nouvelle version</b> → <b>Déployer</b>.
        <br>⚠️ N'utilisez <u>pas</u> « Nouveau déploiement » : cela créerait une deuxième adresse. L'adresse de l'outil ne doit jamais changer.</li>
      <li>Rechargez l'outil dans le navigateur (<kbd>F5</kbd>) : le bas de la barre latérale doit afficher « Lot __LOT__ ».</li>__EXTRA_FIN__
    </ol>
  </div>
</main>
<script type="application/json" id="donnees">__DONNEES__</script>
<script>
(function () {
  var fichiers = JSON.parse(document.getElementById('donnees').textContent);
  var CLE = 'brunants-mise-a-jour-lot__LOT__';
  var faits = {};
  try { faits = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) { faits = {}; }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(faits)); } catch (e) {} }
  var liste = document.getElementById('liste');
  fichiers.forEach(function (f, i) {
    var c = document.createElement('div');
    c.className = 'carte';
    c.innerHTML = '<div class="num">' + (i + 1) + '</div>' +
      '<div><span class="titre"><code></code></span><span class="type ' + f.type + '">' + f.type + '</span>' +
      '<div class="info">' + f.lignes + ' ligne(s) · ' + f.taille + ' Ko</div></div>' +
      '<div class="actions"><button class="copier" type="button">📋 Copier le contenu</button>' +
      '<label class="fait"><input type="checkbox"> Fait</label></div>' +
      '<div class="consigne">' + f.consigne + '</div>';
    c.querySelector('code').textContent = f.affiche;
    var bouton = c.querySelector('button'), coche = c.querySelector('input');
    coche.checked = !!faits[f.fichier];
    c.classList.toggle('fait', coche.checked);
    coche.addEventListener('change', function () { faits[f.fichier] = coche.checked; sauver(); c.classList.toggle('fait', coche.checked); maj(); });
    bouton.addEventListener('click', function () {
      copier(f.contenu).then(function () {
        bouton.textContent = '✔ Copié — collez dans ' + f.affiche; bouton.classList.add('ok');
        setTimeout(function () { bouton.textContent = '📋 Copier le contenu'; bouton.classList.remove('ok'); }, 4000);
      }, function () { alert('La copie automatique a échoué. Ouvrez ' + f.fichier + ' (dossier apps_script) avec le Bloc-notes, puis Ctrl+A et Ctrl+C.'); });
    });
    liste.appendChild(c);
  });
  function copier(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () { return ancien(t); });
    return ancien(t);
  }
  function ancien(t) {
    return new Promise(function (ok, ko) {
      var z = document.createElement('textarea'); z.value = t; z.setAttribute('readonly', '');
      z.style.position = 'fixed'; z.style.top = '-1000px'; document.body.appendChild(z); z.select();
      var r = false; try { r = document.execCommand('copy'); } catch (e) {}
      z.remove(); r ? ok() : ko();
    });
  }
  function maj() {
    var n = fichiers.filter(function (f) { return faits[f.fichier]; }).length;
    document.getElementById('compteur').textContent = n + ' / ' + fichiers.length;
    document.getElementById('barre').style.width = (100 * n / fichiers.length) + '%';
  }
  maj();
})();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
