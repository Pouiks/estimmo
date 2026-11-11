import { slugify } from "@/lib/utils";
import { DEPARTEMENTS } from "./departements";

/**
 * Référentiel statique des régions (code INSEE → nom, départements). Sert aux
 * pages hub /prix-immobilier/region/[region] de l'arborescence
 * région > département > commune (maillage interne, fil d'Ariane).
 */
export interface Region {
  code: string;
  nom: string;
  departements: readonly string[];
}

export const REGIONS: readonly Region[] = [
  { code: "84", nom: "Auvergne-Rhône-Alpes", departements: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"] },
  { code: "27", nom: "Bourgogne-Franche-Comté", departements: ["21", "25", "39", "58", "70", "71", "89", "90"] },
  { code: "53", nom: "Bretagne", departements: ["22", "29", "35", "56"] },
  { code: "24", nom: "Centre-Val de Loire", departements: ["18", "28", "36", "37", "41", "45"] },
  { code: "94", nom: "Corse", departements: ["2A", "2B"] },
  { code: "44", nom: "Grand Est", departements: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"] },
  { code: "32", nom: "Hauts-de-France", departements: ["02", "59", "60", "62", "80"] },
  { code: "11", nom: "Île-de-France", departements: ["75", "77", "78", "91", "92", "93", "94", "95"] },
  { code: "28", nom: "Normandie", departements: ["14", "27", "50", "61", "76"] },
  { code: "75", nom: "Nouvelle-Aquitaine", departements: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"] },
  { code: "76", nom: "Occitanie", departements: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"] },
  { code: "52", nom: "Pays de la Loire", departements: ["44", "49", "53", "72", "85"] },
  { code: "93", nom: "Provence-Alpes-Côte d'Azur", departements: ["04", "05", "06", "13", "83", "84"] },
  { code: "01", nom: "Guadeloupe", departements: ["971"] },
  { code: "02", nom: "Martinique", departements: ["972"] },
  { code: "03", nom: "Guyane", departements: ["973"] },
  { code: "04", nom: "La Réunion", departements: ["974"] },
  { code: "06", nom: "Mayotte", departements: ["976"] },
];

const PAR_DEPARTEMENT = new Map<string, Region>();
for (const region of REGIONS) {
  for (const d of region.departements) PAR_DEPARTEMENT.set(d, region);
}

/** « Provence-Alpes-Côte d'Azur » → « provence-alpes-cote-d-azur » */
export function slugRegion(region: Region): string {
  return slugify(region.nom);
}

export function regionDuDepartement(codeDepartement: string): Region | null {
  return PAR_DEPARTEMENT.get(codeDepartement) ?? null;
}

export function regionDepuisSlug(slug: string): Region | null {
  return REGIONS.find((r) => slugRegion(r) === slug) ?? null;
}

export function hrefRegion(region: Region): string {
  return `/prix-immobilier/region/${slugRegion(region)}`;
}

/** Chaque département connu appartient à une région et réciproquement. */
export function coherenceRegions(): { sansRegion: string[]; inconnus: string[] } {
  const sansRegion = Object.keys(DEPARTEMENTS).filter((d) => !PAR_DEPARTEMENT.has(d));
  const inconnus = [...PAR_DEPARTEMENT.keys()].filter((d) => !(d in DEPARTEMENTS));
  return { sansRegion, inconnus };
}
