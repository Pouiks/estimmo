import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/routing";
import { urlAbsolue } from "@/lib/i18n/seo";
import { escapeHtml } from "@/lib/security/html";

/**
 * Construction des sitemaps multilingues (fonctions pures, testées).
 * Chaque version de langue est une entrée à part entière, portant les
 * alternates hreflang de toutes les versions (recommandation Google).
 *
 * Fichiers servis par les route handlers :
 *  - /sitemap.xml                 index (app/sitemap.xml/route.ts)
 *  - /sitemaps/pages.xml          pages fixes, départements, blog
 *  - /sitemaps/communes-N.xml     communes par tranches (fr + en)
 */

/** Communes par fichier : 2 langues × 20 000 = 40 000 URLs < 50 000 (limite). */
export const COMMUNES_PAR_SITEMAP = 20_000;

export type EntreeSitemap = MetadataRoute.Sitemap[number];
type Extra = Pick<EntreeSitemap, "lastModified" | "changeFrequency" | "priority">;

/** Alternates hreflang d'une page existant dans toutes les langues. */
export function alternatesSitemap(
  cheminFr: string
): NonNullable<EntreeSitemap["alternates"]> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = urlAbsolue(cheminFr, locale);
  languages["x-default"] = urlAbsolue(cheminFr, DEFAULT_LOCALE);
  return { languages };
}

/** Une entrée par langue, chacune avec les alternates complets. */
export function entreesBilingues(cheminFr: string, extra: Extra): EntreeSitemap[] {
  const alternates = alternatesSitemap(cheminFr);
  return LOCALES.map((locale) => ({
    url: urlAbsolue(cheminFr, locale),
    alternates,
    ...extra,
  }));
}

/** Entrée d'une page n'existant que dans une langue (article de blog). */
export function entreeMonolingue(
  cheminFr: string,
  locale: Locale,
  extra: Extra
): EntreeSitemap {
  return { url: urlAbsolue(cheminFr, locale), ...extra };
}

/** Nombre de fichiers « communes » pour n communes (au moins 1). */
export function nombreTranchesCommunes(nbCommunes: number): number {
  return Math.max(1, Math.ceil(nbCommunes / COMMUNES_PAR_SITEMAP));
}

/** Noms des fichiers : pages.xml puis communes-1.xml … communes-n.xml. */
export function nomsFichiersSitemap(nbCommunes: number): string[] {
  const tranches = nombreTranchesCommunes(nbCommunes);
  return [
    "pages.xml",
    ...Array.from({ length: tranches }, (_, i) => `communes-${i + 1}.xml`),
  ];
}

/** « communes-2.xml » → 2 ; autre chose → null. */
export function trancheDuFichier(nom: string): number | null {
  const m = /^communes-([1-9]\d*)\.xml$/.exec(nom);
  return m ? Number(m[1]) : null;
}

/** Indices [début, fin) des communes couvertes par la tranche n (≥ 1). */
export function trancheCommunes(n: number): { debut: number; fin: number } {
  const debut = (n - 1) * COMMUNES_PAR_SITEMAP;
  return { debut, fin: debut + COMMUNES_PAR_SITEMAP };
}

const ENTETE = `<?xml version="1.0" encoding="UTF-8"?>\n`;

/** XML d'index listant les fichiers (servi sur /sitemap.xml). */
export function sitemapIndexXml(base: string, nbCommunes: number): string {
  const lignes = nomsFichiersSitemap(nbCommunes)
    .map((nom) => `  <sitemap><loc>${base}/sitemaps/${nom}</loc></sitemap>`)
    .join("\n");
  return `${ENTETE}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lignes}\n</sitemapindex>\n`;
}

/** XML d'un sitemap (format MetadataRoute.Sitemap, avec xhtml:link hreflang). */
export function sitemapXml(entrees: EntreeSitemap[]): string {
  const urls = entrees
    .map((e) => {
      const lignes = [`    <loc>${escapeHtml(e.url)}</loc>`];
      if (e.lastModified) {
        const d =
          e.lastModified instanceof Date ? e.lastModified : new Date(e.lastModified);
        lignes.push(`    <lastmod>${d.toISOString()}</lastmod>`);
      }
      if (e.changeFrequency) lignes.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) lignes.push(`    <priority>${e.priority}</priority>`);
      for (const [lang, href] of Object.entries(e.alternates?.languages ?? {})) {
        lignes.push(
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeHtml(String(href))}"/>`
        );
      }
      return `  <url>\n${lignes.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `${ENTETE}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function reponseXml(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
