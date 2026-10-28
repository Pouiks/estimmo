import { slugify } from "@/lib/utils";

/** Nombre minimal de caractères utiles pour lancer une recherche. */
export const RECHERCHE_MIN = 2;
/** Nombre maximal de communes proposées. */
export const RECHERCHE_MAX_RESULTATS = 8;

export type Recherche =
  | { champ: "code_postal"; prefixe: string }
  | { champ: "slug"; prefixe: string };

/**
 * Interprète une saisie libre pour la recherche de commune (pages prix).
 * - chiffres ("06", "06 000") → préfixe de code postal ;
 * - texte ("Trécon", "St-Étienne") → préfixe du slug (minuscules sans accents,
 *   même règle que le slug des pages : « trecon-51582 », « saint-etienne-42000 ») ;
 * - moins de 2 caractères utiles → null (rien à chercher).
 * Le résultat ne contient que [a-z0-9-] : utilisable tel quel dans un motif LIKE.
 */
export function analyserRecherche(saisie: string): Recherche | null {
  const texte = saisie.trim().slice(0, 80);
  const chiffres = texte.replace(/\s+/g, "");
  if (/^\d+$/.test(chiffres)) {
    return chiffres.length >= RECHERCHE_MIN
      ? { champ: "code_postal", prefixe: chiffres.slice(0, 5) }
      : null;
  }
  const slug = slugify(texte);
  return slug.length >= RECHERCHE_MIN ? { champ: "slug", prefixe: slug } : null;
}

/** Motifs LIKE à essayer, du plus pertinent au moins pertinent. */
export function motifsRecherche(recherche: Recherche): string[] {
  if (recherche.champ === "code_postal") return [`${recherche.prefixe}%`];
  // Début du nom, puis début d'un mot du nom (« etienne » → Saint-Étienne).
  return [`${recherche.prefixe}%`, `%-${recherche.prefixe}%`];
}
