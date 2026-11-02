#!/usr/bin/env python3
"""
construire_modele_import.py — Fabrique Modele_import_adherents.xlsx à partir du schéma de l'outil :
  - un onglet par table importable (Adhérents, Activités, Prestataires, Catégories) avec les en-têtes
    exacts attendus par l'assistant d'import et une ligne d'exemple FICTIVE ;
  - un onglet « Aide » : pour chaque colonne, obligatoire ou non, format, valeurs autorisées.
Usage : python3 outils/construire_modele_import.py  →  Modele_import_adherents.xlsx
"""
import json
import pathlib
import subprocess

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'Modele_import_adherents.xlsx'

JS = r"""
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Buffer });
vm.runInContext(fs.readFileSync(path.join(process.argv[1], 'outils/faux_gas.js'), 'utf8'), ctx);
vm.runInContext('FauxGAS.installer(globalThis)', ctx);
['Donnees.gs', 'Code.gs', 'DonneesFictives.gs', 'Automatisations.gs', 'Import.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(process.argv[1], 'apps_script', f), 'utf8'), ctx));
const t = {};
['Adherents', 'Activites', 'Prestataires', 'Categories'].forEach(n => {
  t[n] = vm.runInContext(`SCHEMA.${n}.champs.filter(c => c.type !== 'calcule').map(c => ({ cle: c.cle, titre: c.titre, type: c.type,
    requis: !!c.requis, defaut: c.defaut === undefined ? null : c.defaut, defautParam: c.defautParam || null, valeurs: c.valeurs || null,
    table: c.table || null, min: c.min === undefined ? null : c.min, max: c.max === undefined ? null : c.max }))`, ctx);
});
t.categories = vm.runInContext('CATEGORIES_BUDGET', ctx);
process.stdout.write(JSON.stringify(t));
"""

ONGLETS = [('Adherents', 'Adhérents'), ('Activites', 'Activités'), ('Prestataires', 'Prestataires'), ('Categories', 'Catégories')]

# Exemples entièrement fictifs
EXEMPLES = {
    'Adherents': {'civilite': 'Mme', 'sexe': 'F', 'nom': 'EXEMPLE', 'prenom': 'Jeanne', 'dateNaissance': '14/07/1952', 'type': 'Titulaire',
                  'adresse': '1 rue de l\'Exemple', 'codePostal': '91610', 'ville': 'BALLANCOURT', 'mobile': '0600000000', 'email': 'jeanne.exemple@example.com',
                  'dateInscription': '01/09/2015', 'anneeEntreeJMB': 1975, 'dateSortieJMB': '31/12/2012', 'cotisation': 15, 'recoitMaillon': 'Oui', 'toutParMail': 'Non',
                  'commentaire': 'Ligne d\'exemple fictive : à supprimer'},
    'Activites': {'nom': 'Sortie d\'exemple', 'categorie': '2. Sorties et spectacles', 'sousCategorie': '2.2 Visites et découvertes 1 journée', 'dateDebut': '12/05/2027', 'lieu': 'Paris', 'maxParticipants': 40,
                  'prixParPersonne': 25, 'nbEcheances': 1, 'statut': 'En préparation', 'descriptif': 'Ligne d\'exemple fictive : à supprimer'},
    'Prestataires': {'raisonSociale': 'Autocars Exemple', 'activite': 'Transport', 'ville': 'EVRY', 'contact': 'M. Exemple', 'telephone': '0100000000',
                     'commentaire': 'Ligne d\'exemple fictive : à supprimer'},
    'Categories': {'categorie': '2. Sorties et spectacles', 'sousCategorie': '2.4 Exemple de sous-catégorie', 'type': 'Les deux', 'descriptif': 'Ce que l\'on met dans cette sous-catégorie (exemple fictif à supprimer).'},
}

FORMATS = {
    'id': 'Facultatif. Laisser vide : l\'outil attribue l\'ID. Un ID au bon format (ex. ADH-0012) est gardé s\'il est libre.',
    'texte': 'Texte libre', 'date': 'Date JJ/MM/AAAA (ou cellule de type date)', 'montant': 'Nombre (virgule acceptée), en euros',
    'nombre': 'Nombre', 'oui_non': 'Oui / Non (« x » = Oui ; vide = valeur par défaut)', 'liste': 'Une des valeurs autorisées',
    'email': 'Adresse e-mail', 'cp': 'Code postal à 5 chiffres (le 0 perdu par Excel est remis)', 'tel': 'Téléphone à 10 chiffres (le 0 perdu est remis)',
    'ref': 'ID d\'une fiche (ex. ADH-0012), ou ID d\'une autre ligne du même fichier', 'categorie': 'Une catégorie existante de l\'outil',
}

BLEU = PatternFill('solid', fgColor='1A5276')
ROUGE = PatternFill('solid', fgColor='C0392B')
GRIS = PatternFill('solid', fgColor='F2F4F4')


def main():
    schema = json.loads(subprocess.run(['node', '-e', JS, str(RACINE)], capture_output=True, text=True, check=True).stdout)
    wb = Workbook()
    wb.remove(wb.active)
    aide = []
    for table, nom in ONGLETS:
        champs = schema[table]
        ws = wb.create_sheet(nom)
        for j, c in enumerate(champs, 1):
            cell = ws.cell(row=1, column=j, value=c['titre'])
            obligatoire = c['requis'] and c['defaut'] is None and not c['defautParam']
            cell.font = Font(bold=True, color='FFFFFF')
            cell.fill = ROUGE if obligatoire else BLEU
            cell.alignment = Alignment(wrap_text=True, vertical='center')
            ws.column_dimensions[get_column_letter(j)].width = max(14, min(34, len(c['titre']) + 4))
            v = EXEMPLES[table].get(c['cle'])
            if v is not None:
                ws.cell(row=2, column=j, value=v).fill = GRIS
            valeurs = c['valeurs'] or (schema['categories'] if c['type'] == 'categorie' else None)
            if c['type'] == 'oui_non':
                valeurs = ['Oui', 'Non']
            if valeurs:
                dv = DataValidation(type='list', formula1='"' + ','.join(valeurs) + '"', allow_blank=True, showErrorMessage=False)
                ws.add_data_validation(dv)
                dv.add(f'{get_column_letter(j)}2:{get_column_letter(j)}2000')
            for col in ('cp', 'tel'):
                if c['type'] == col:
                    for i in range(2, 2001):
                        ws.cell(row=i, column=j).number_format = '@'   # texte : garde le 0 initial
            if c['type'] == 'date':
                for i in range(2, 2001):
                    ws.cell(row=i, column=j).number_format = '@'
            defaut = c['defaut']
            if defaut is True:
                defaut = 'Oui'
            elif defaut is False:
                defaut = 'Non'
            elif c['defautParam']:
                defaut = 'paramètre de l\'outil (' + c['defautParam'] + ')'
            aide.append([nom, c['titre'], 'Oui' if obligatoire else 'Non', FORMATS.get(c['type'], c['type']),
                         ', '.join(valeurs) if valeurs and c['type'] != 'oui_non' else '', '' if defaut is None else str(defaut)])
        ws.row_dimensions[1].height = 48
        ws.freeze_panes = 'A2'

    a = wb.create_sheet('Aide', 0)
    a['A1'] = 'Modèle d\'import — outil Les Brunants'
    a['A1'].font = Font(bold=True, size=14, color='1A5276')
    lignes = [
        'Un onglet par table : remplissez celui de la table à importer (Administration > Assistant d\'import). Les colonnes peuvent être dans n\'importe quel ordre, et les colonnes inutiles laissées vides ou supprimées.',
        'En-têtes en rouge : obligatoires. La ligne 2 (grisée) est un exemple fictif : supprimez-la avant l\'import.',
        'Dates en JJ/MM/AAAA. Codes postaux et téléphones : les colonnes sont au format texte pour garder le 0 initial (l\'outil le remet de toute façon).',
        'Toujours commencer par « Tester dans une copie » : le classeur de l\'outil n\'est pas modifié et un onglet « Rapport_import » détaille chaque ligne.',
        'Ne jamais enregistrer ce fichier rempli de vraies données dans un dossier partagé hors du bureau.',
    ]
    for i, t in enumerate(lignes, 3):
        a.cell(row=i, column=1, value='• ' + t).alignment = Alignment(wrap_text=True, vertical='top')
        a.merge_cells(start_row=i, start_column=1, end_row=i, end_column=6)
        a.row_dimensions[i].height = 32
    debut = 3 + len(lignes) + 1
    for j, t in enumerate(['Onglet', 'Colonne', 'Obligatoire', 'Format', 'Valeurs autorisées', 'Si vide'], 1):
        c = a.cell(row=debut, column=j, value=t)
        c.font = Font(bold=True, color='FFFFFF'); c.fill = BLEU
    for i, l in enumerate(aide, debut + 1):
        for j, v in enumerate(l, 1):
            c = a.cell(row=i, column=j, value=v)
            c.alignment = Alignment(wrap_text=True, vertical='top')
            if j == 3 and v == 'Oui':
                c.font = Font(bold=True, color='C0392B')
    for col, w in zip('ABCDEF', (14, 34, 12, 46, 50, 22)):
        a.column_dimensions[col].width = w
    a.freeze_panes = a.cell(row=debut + 1, column=1)
    wb.save(SORTIE)
    print(f'{SORTIE.name} : {len(aide)} colonnes décrites')


if __name__ == '__main__':
    main()
