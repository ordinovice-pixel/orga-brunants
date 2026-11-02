/**
 * =====================================================================
 *  Import.gs — Assistant d'import des vraies données
 * =====================================================================
 *  Prévu au lot 6 :
 *   - lecture du fichier CSV / XLSX dans le navigateur (SheetJS)
 *   - correspondance des colonnes avec suggestion automatique
 *   - contrôle avant écriture (dates, codes postaux, e-mails, doublons…)
 *   - import en « remplacer les données fictives » ou « ajouter »
 *   - rapport téléchargeable des lignes rejetées
 *
 *  Le socle (lot 1) fournit déjà ce dont l'import aura besoin :
 *  normaliserEntree_(), validerObjet_(), genererId_() et journaliser_()
 *  dans Donnees.gs.
 * =====================================================================
 */
