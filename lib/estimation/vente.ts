/**
 * Estimation VENTE - fonctions pures.
 *
 * Méthode (cf. starter.md) :
 *  1. comparables DVF (même type, surface ×0,7–1,3, < 30 mois) par paliers
 *     400 m → 800 m → 1 500 m → 3 000 m → commune → département ;
 *     premier palier avec ≥ 8 comparables retenu
 *  2. prix/m² de référence = médiane pondérée
 *     poids = 1/(1+distance_km) × 1/(1+ancienneté_mois/12)
 *  3. ajustements qualitatifs (somme plafonnée ±25 %)
 *  4. fourchette = médiane ± pct fonction de la dispersion (IQR), 5–10 %
 *  5. confiance : haute (≥15 comp., rayon ≤800 m), moyenne (≥8, ≤3 km), faible sinon
 */
import { calculerAjustement } from "./ajustements";
import { arrondi, clamp, iqr, moisEntre, weightedMedian } from "./stats";
import type {
  CaracteristiquesBien,
  Comparable,
  Confiance,
  EstimationVente,
  Palier,
} from "./types";

export const RAYONS_M = [400, 800, 1500, 3000] as const;
export const MIN_COMPARABLES = 8;
export const MOIS_MAX_MUTATION = 30;
export const RATIO_SURFACE_MIN = 0.7;
export const RATIO_SURFACE_MAX = 1.3;

/** Comparables collectés par la couche data (repository) pour chaque palier. */
export interface ComparablesParPalier {
  /** Toutes les ventes ≤ 3 000 m (avec distance) - filtrées par palier ici. */
  rayon3000: Comparable[];
  commune: Comparable[];
  departement: Comparable[];
}

export function choisirPalier(
  comparables: ComparablesParPalier
): { retenus: Comparable[]; palier: Palier } | null {
  for (const rayon of RAYONS_M) {
    const retenus = comparables.rayon3000.filter(
      (c) => c.distance_m <= rayon
    );
    if (retenus.length >= MIN_COMPARABLES) {
      return { retenus, palier: { type: "rayon", rayonM: rayon } };
    }
  }
  if (comparables.commune.length >= MIN_COMPARABLES) {
    return { retenus: comparables.commune, palier: { type: "commune" } };
  }
  if (comparables.departement.length >= MIN_COMPARABLES) {
    return {
      retenus: comparables.departement,
      palier: { type: "departement" },
    };
  }
  return null;
}

export function poidsComparable(comparable: Comparable, now: Date): number {
  const distanceKm = comparable.distance_m / 1000;
  const ancienneteMois = moisEntre(comparable.date_mutation, now);
  return (1 / (1 + distanceKm)) * (1 / (1 + ancienneteMois / 12));
}

function confiancePour(nb: number, palier: Palier): Confiance {
  if (palier.type === "rayon") {
    if (nb >= 15 && palier.rayonM <= 800) return "haute";
    if (nb >= MIN_COMPARABLES) return "moyenne";
  }
  return "faible";
}

/**
 * Calcule l'estimation de vente. Retourne null si aucun palier n'atteint
 * 8 comparables → fallback estimation manuelle.
 */
export function estimerVente(
  bien: CaracteristiquesBien,
  comparables: ComparablesParPalier,
  now: Date = new Date()
): EstimationVente | null {
  const selection = choisirPalier(comparables);
  if (!selection) return null;

  const { retenus, palier } = selection;

  const prixM2Zone = weightedMedian(
    retenus.map((c) => ({
      value: c.prix_m2,
      weight: poidsComparable(c, now),
    }))
  );

  const ajustement = calculerAjustement(bien);
  const prixM2Ajuste = prixM2Zone * (1 + ajustement);
  const mediane = prixM2Ajuste * bien.surface;

  // Dispersion → demi-largeur de fourchette : IQR relatif rapporté à la
  // médiane, borné entre 5 % et 10 %. Le brief prévoyait 6-15 % mais un écart
  // de ±15 % (60 k€ sur 200 k€) a été jugé peu crédible par le client :
  // resserré, l'affinage se fait lors de l'avis de valeur sur place.
  const dispersion = iqr(retenus.map((c) => c.prix_m2)) / prixM2Zone;
  const fourchettePct = clamp(dispersion * 40, 5, 10);

  return {
    projet: "vente",
    fourchetteBasse: arrondi(mediane * (1 - fourchettePct / 100), 1000),
    mediane: arrondi(mediane, 1000),
    fourchetteHaute: arrondi(mediane * (1 + fourchettePct / 100), 1000),
    prixM2Zone: Math.round(prixM2Zone),
    prixM2Ajuste: Math.round(prixM2Ajuste),
    nbComparables: retenus.length,
    rayonM: palier.type === "rayon" ? palier.rayonM : null,
    palier: palier.type,
    confiance: confiancePour(retenus.length, palier),
    ajustementPct: Math.round(ajustement * 100),
    fourchettePct: Math.round(fourchettePct),
  };
}
