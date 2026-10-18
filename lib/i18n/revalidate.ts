import { revalidatePath } from "next/cache";
import { LOCALES } from "./routing";

/**
 * Revalide une page du site public dans toutes les langues.
 * Les routes vivent sous app/[locale] : le chemin interne de /blog est
 * /fr/blog (rewrite du proxy) et /en/blog.
 */
export function revaliderSite(cheminPublic: string): void {
  for (const locale of LOCALES) {
    const suffixe = cheminPublic === "/" ? "" : cheminPublic;
    revalidatePath(`/${locale}${suffixe}`);
  }
}
