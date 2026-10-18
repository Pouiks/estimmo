import { defineRouting } from "next-intl/routing";

/**
 * Locales du site public. Le français est servi sans préfixe (URLs
 * historiques inchangées), l'anglais sous /en/... La langue est dans l'URL
 * pour que les ~35 000 pages ISR restent statiques (pas de lecture de
 * header/cookie au rendu).
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function estLocale(valeur: unknown): valeur is Locale {
  return (
    typeof valeur === "string" &&
    (LOCALES as readonly string[]).includes(valeur)
  );
}

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  // Mémorise la langue choisie (sélecteur ou détection) pendant un an.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // Les hreflang sont émis par generateMetadata + sitemap (une seule source
  // de vérité, et rien sur les pages noindex).
  alternateLinks: false,
});
