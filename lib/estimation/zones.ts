/**
 * Zones non couvertes par DVF → estimation manuelle obligatoire.
 * Alsace-Moselle (Livre foncier) : 57 Moselle, 67 Bas-Rhin, 68 Haut-Rhin.
 * Mayotte (976) : absente de DVF et de la Carte des loyers ANIL.
 */
export const DEPARTEMENTS_NON_COUVERTS = new Set(["57", "67", "68", "976"]);

/** "75056" → "75" ; "97411" → "974" ; "2A004" → "2A". */
export function deptFromInsee(codeInsee: string): string {
  return codeInsee.startsWith("97")
    ? codeInsee.slice(0, 3)
    : codeInsee.slice(0, 2);
}

export function isZoneNonCouverte(codeInsee: string): boolean {
  return DEPARTEMENTS_NON_COUVERTS.has(deptFromInsee(codeInsee));
}
