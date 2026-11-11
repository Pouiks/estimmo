/**
 * Seuil de qualité des pages communes (fonctions pures, testées).
 *
 * Une page sans chiffres fiables n'a rien à offrir à Google ni au vendeur :
 * elle passe en noindex, follow et sort du sitemap (toujours accessible et
 * liée depuis la page département). Règle :
 *   - au moins un prix médian, et
 *   - au moins 10 ventes sur les 12 derniers mois (médianes 12 mois), ou
 *   - au moins 30 ventes sur 36 mois (la page affiche alors les médianes sur
 *     3 ans, étiquetées comme telles).
 *
 * Déployé département par département (`DEPARTEMENTS_PILOTES`) : hors
 * pilotes, les pages gardent leur régime d'origine (indexables, 12 mois).
 */

export const DEPARTEMENTS_PILOTES: readonly string[] = ["30", "34"];
export const SEUIL_VENTES_12M = 10;
export const SEUIL_VENTES_36M = 30;

export type Fenetre = "12m" | "36m";

export interface StatsIndexation {
  departement: string;
  nb_ventes_12m: number;
  nb_ventes_36m?: number | null;
  prix_m2_median_appartement: number | null;
  prix_m2_median_maison: number | null;
  prix_m2_median_36m_appartement?: number | null;
  prix_m2_median_36m_maison?: number | null;
}

export interface Regime {
  /** Département couvert par le nouveau gabarit enrichi. */
  pilote: boolean;
  /** Page indexable (meta robots, sitemap). */
  indexable: boolean;
  /** Fenêtre des prix affichés. */
  fenetre: Fenetre;
}

export function estPilote(departement: string): boolean {
  return DEPARTEMENTS_PILOTES.includes(departement);
}

/** Fenêtre dont les chiffres sont fiables : 12 mois si assez de ventes, sinon 36 mois. */
export function fenetrePour(stats: StatsIndexation): Fenetre {
  if (stats.nb_ventes_12m >= SEUIL_VENTES_12M) return "12m";
  const nb36 = stats.nb_ventes_36m ?? 0;
  const prix36 = stats.prix_m2_median_36m_appartement || stats.prix_m2_median_36m_maison;
  return nb36 >= SEUIL_VENTES_36M && prix36 ? "36m" : "12m";
}

export function regimeCommune(stats: StatsIndexation): Regime {
  const pilote = estPilote(stats.departement);
  if (!pilote) return { pilote, indexable: true, fenetre: "12m" };
  const fenetre = fenetrePour(stats);
  const prix =
    fenetre === "36m"
      ? stats.prix_m2_median_36m_appartement || stats.prix_m2_median_36m_maison
      : stats.prix_m2_median_appartement || stats.prix_m2_median_maison;
  const volume =
    fenetre === "36m"
      ? (stats.nb_ventes_36m ?? 0) >= SEUIL_VENTES_36M
      : stats.nb_ventes_12m >= SEUIL_VENTES_12M;
  return { pilote, indexable: Boolean(prix) && volume, fenetre };
}

export const estIndexable = (stats: StatsIndexation): boolean => regimeCommune(stats).indexable;
