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
 * `langues` : langues où la page existe (article sans version anglaise publiée :
 * `["fr"]`) ; une seule langue → canonique sans hreflang.
 */
export function alternatesPour(
  cheminFr: string,
  locale: Locale,
  langues: readonly Locale[] = LOCALES
): NonNullable<Metadata["alternates"]> {
  const canonical = cheminLocalise(cheminFr, locale);
  if (langues.length < 2) return { canonical };
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    if (langues.includes(l)) languages[l] = cheminLocalise(cheminFr, l);
  }
  languages["x-default"] = cheminLocalise(cheminFr, DEFAULT_LOCALE);
  return { canonical, languages };
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

export type ImagesOg = NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;

/**
 * Image de partage générée pour une page (app/og.png/route.tsx) : marque,
 * titre et sous-titre (baseline par défaut). 1200×630, absolue via metadataBase.
 */
export function imageOgPour(params: {
  locale: Locale;
  title: string;
  sousTitre?: string;
}): ImagesOg {
  const q = new URLSearchParams({ t: params.title, l: params.locale });
  if (params.sousTitre) q.set("s", params.sousTitre);
  return [{ url: `/og.png?${q}`, width: 1200, height: 630, alt: params.title }];
}

/**
 * Bloc openGraph complet d'une page (remplace celui du layout : Next fusionne
 * les métadonnées en surface, un openGraph de page écrase tout l'objet).
 * Toujours avec une image : celle fournie, sinon l'image générée.
 */
export function openGraphPour(params: {
  locale: Locale;
  cheminFr: string;
  title: string;
  description?: string;
  type?: "website" | "article";
  /** Sous-titre de l'image générée (baseline par défaut). */
  sousTitre?: string;
  images?: ImagesOg;
}): NonNullable<Metadata["openGraph"]> {
  return {
    title: params.title,
    description: params.description,
    url: cheminLocalise(params.cheminFr, params.locale),
    siteName: SITE.name,
    locale: ogLocale(params.locale),
    type: params.type ?? "website",
    images:
      params.images ??
      imageOgPour({ locale: params.locale, title: params.title, sousTitre: params.sousTitre }),
  };
}
