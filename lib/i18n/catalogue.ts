import en from "@/messages/en";
import fr from "@/messages/fr";
import type { Locale } from "./routing";

/**
 * Catalogue des clés de traduction (fichiers JSON embarqués), à plat :
 * « home.hero.titre » → textes fr et en. Sert à l'admin des surcharges et
 * aux tests.
 */
export type Arbre = { [cle: string]: string | Arbre };

/** { a: { b: "x" } } → { "a.b": "x" } */
export function aplatirMessages(arbre: Arbre, prefixe = ""): Record<string, string> {
  const plat: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(arbre)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof valeur === "string") plat[chemin] = valeur;
    else Object.assign(plat, aplatirMessages(valeur, chemin));
  }
  return plat;
}

export interface EntreeCatalogue {
  cle: string;
  namespace: string;
  defaut: Record<Locale, string>;
}

const PLAT_FR = aplatirMessages(fr);
const PLAT_EN = aplatirMessages(en);

/** Namespaces (clés racines des fichiers fr), triés. */
export const NAMESPACES: readonly string[] = Object.keys(fr).sort();

/** Toutes les clés avec leurs textes d'origine, triées. */
export function catalogue(namespace?: string): EntreeCatalogue[] {
  return Object.keys(PLAT_FR)
    .filter((cle) => !namespace || cle.startsWith(`${namespace}.`))
    .sort()
    .map((cle) => ({
      cle,
      namespace: cle.split(".")[0],
      defaut: { fr: PLAT_FR[cle], en: PLAT_EN[cle] ?? PLAT_FR[cle] },
    }));
}

/** Texte d'origine d'une clé, ou null si la clé n'existe pas. */
export function texteDefaut(locale: Locale, cle: string): string | null {
  const plat = locale === "fr" ? PLAT_FR : PLAT_EN;
  return plat[cle] ?? null;
}
