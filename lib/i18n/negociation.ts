import { DEFAULT_LOCALE, type Locale } from "./routing";

/**
 * Règle produit : un navigateur dont la langue principale est le français
 * voit le site en français ; toute autre langue (anglais, allemand,
 * espagnol...) voit la version anglaise. Sans en-tête, français.
 *
 * On lit la langue de plus forte priorité (q) de l'en-tête Accept-Language.
 */
export function localePreferee(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidats = acceptLanguage
    .split(",")
    .map((partie, index) => {
      const [tag, ...params] = partie.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const poids = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), poids: Number.isNaN(poids) ? 0 : poids, index };
    })
    .filter((c) => c.tag && c.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.index - b.index);

  const principal = candidats[0]?.tag;
  if (!principal || principal === "*") return DEFAULT_LOCALE;
  return principal === "fr" || principal.startsWith("fr-") ? "fr" : "en";
}
