/** Petites statistiques partagées par les scripts d'import (pures, testées). */

/** Médiane (interpolée, comme percentile_cont en SQL) ; null si vide. */
export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const milieu = (tri.length - 1) / 2;
  const bas = Math.floor(milieu);
  const haut = Math.ceil(milieu);
  return (tri[bas] + tri[haut]) / 2;
}

/**
 * Codes départements à partir d'une liste « 30,34 » ou « 30 34 » (PowerShell
 * remplace les virgules par des espaces) ; 2A/2B, DOM à 3 chiffres.
 */
export function parseDepartements(liste: string): string[] {
  return liste
    .split(/[\s,;]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean)
    .map((d) => (/^\d$/.test(d) ? `0${d}` : d));
}
