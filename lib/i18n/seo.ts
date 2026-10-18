import type { Metadata } from "next";
import { SITE } from "@/lib/config";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./routing";

/** Chemin public d'une page pour une locale (fr sans préfixe, en sous /en). */
export function cheminLocalise(cheminFr: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return cheminFr;
  return cheminFr === "/" ? `/${locale}` : `/${locale}${cheminFr}`;
}

/**
 * Canonique + hreflang pour une page indexable. Les URLs sont relatives,
 * résolues par metadataBase. x-default pointe sur la version française.
 */
export function alternatesPour(
  cheminFr: string,
  locale: Locale
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = cheminLocalise(cheminFr, l);
  languages["x-default"] = cheminLocalise(cheminFr, DEFAULT_LOCALE);
  return { canonical: cheminLocalise(cheminFr, locale), languages };
}

/** URL absolue d'une page (JSON-LD, sitemap, emails). */
export function urlAbsolue(cheminFr: string, locale: Locale): string {
  const chemin = cheminLocalise(cheminFr, locale);
  // Racine française sans slash final (comme SITE.url, robots, JSON-LD).
  return chemin === "/" ? SITE.url : `${SITE.url}${chemin}`;
}

/** og:locale */
export function ogLocale(locale: Locale): string {
  return locale === "fr" ? "fr_FR" : "en_US";
}

/** schema.org inLanguage (BCP 47) */
export function inLanguage(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

/**
 * Bloc openGraph complet d'une page (remplace celui du layout : Next fusionne
 * les métadonnées en surface, un openGraph de page écrase tout l'objet).
 */
export function openGraphPour(params: {
  locale: Locale;
  cheminFr: string;
  title: string;
  description?: string;
  type?: "website" | "article";
}): NonNullable<Metadata["openGraph"]> {
  return {
    title: params.title,
    description: params.description,
    url: cheminLocalise(params.cheminFr, params.locale),
    siteName: SITE.name,
    locale: ogLocale(params.locale),
    type: params.type ?? "website",
  };
}
