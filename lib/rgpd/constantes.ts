/**
 * Durées de conservation et délais RGPD - source unique pour la politique de
 * confidentialité (chiffres injectés dans les textes), l'admin et la purge.
 * Toute modification ici doit être reportée dans la migration `purger_rgpd`
 * (valeurs par défaut) et dans CHANGELOG.md.
 */
export const RGPD = {
  /** Conservation des prospects après le dernier contact (politique : « 3 ans »). */
  conservationLeadsAnnees: 3,
  /** Événements du formulaire (sans donnée personnelle), même borne que l'audience Google. */
  conservationEvenementsMois: 25,
  /** Journal des demandes d'exercice des droits (prescription). */
  conservationJournalAnnees: 5,
  /** Délai légal de réponse à une demande (art. 12.3 RGPD). */
  delaiReponseMois: 1,
  /** Prolongation possible pour une demande complexe (art. 12.3). */
  prolongationMois: 2,
  /** Préavis affiché dans l'admin avant anonymisation automatique. */
  preavisPurgeJours: 30,
  /** Date de la version en vigueur de la politique de confidentialité (AAAA-MM-JJ). */
  politiqueVersion: "2026-11-13",
} as const;

/** Statuts qui font d'un prospect un client : hors purge automatique. */
export const STATUTS_CLIENTS = ["mandat_simple", "mandat_exclusif"] as const;
