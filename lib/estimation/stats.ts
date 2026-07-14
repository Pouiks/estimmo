/** Petites primitives statistiques du moteur (pures). */

/**
 * Médiane pondérée : première valeur (triées croissantes) dont le cumul des
 * poids atteint la moitié du poids total.
 */
export function weightedMedian(
  items: { value: number; weight: number }[]
): number {
  if (items.length === 0) {
    throw new Error("weightedMedian : liste vide");
  }
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  let cumul = 0;
  for (const item of sorted) {
    cumul += item.weight;
    if (cumul >= total / 2) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

/** Quantile avec interpolation linéaire (q ∈ [0, 1]). */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) {
    throw new Error("quantile : liste vide");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/** Écart interquartile (Q3 − Q1). */
export function iqr(values: number[]): number {
  return quantile(values, 0.75) - quantile(values, 0.25);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Arrondi au pas donné (ex. arrondi(123 456, 1000) → 123 000). */
export function arrondi(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Nombre de mois (fractionnaires) entre une date ISO et maintenant. */
export function moisEntre(dateIso: string, now: Date): number {
  const then = new Date(dateIso).getTime();
  const ms = now.getTime() - then;
  return Math.max(0, ms / (30.44 * 24 * 3600 * 1000));
}
