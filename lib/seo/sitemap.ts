import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/routing";
import { cheminDe, urlAbsolue, type Chemins } from "@/lib/i18n/seo";
import { escapeHtml } from "@/lib/security/html";
import { DEPARTEMENTS } from "./departements";

/**
 * Construction des sitemaps multilingues (fonctions pures, testées).
 * Chaque version de langue est une entrée à part entière, portant les
 * alternates hreflang de toutes les versions (recommandation Google).
 *
 * Fichiers servis par les route handlers :
 *  - /sitemap.xml                   index (app/sitemap.xml/route.ts)
 *  - /sitemaps/pages.xml            pages fixes, départements, blog
 *  - /sitemaps/communes-<dept>.xml  communes d'un département (ex. communes-30.xml,
 *                                   communes-2a.xml) : un fichier par département,
 *                                   quelques centaines d'URLs chacun, lastmod réel
 */

export type EntreeSitemap = MetadataRoute.Sitemap[number];
type Extra = Pick<EntreeSitemap, "lastModified" | "changeFrequency" | "priority" | "images">;

/**
 * Date de la dernière modification du gabarit des pages communes (contenu,
 * structure, balisage). Le lastmod d'une commune est le plus récent entre
 * cette date et la date de modification de ses chiffres : quand le gabarit
 * change, toutes les pages ont réellement changé.
 */
export const GABARIT_COMMUNE_MODIFIE_LE = new Date("2026-11-12T12:00:00Z");

/** lastmod d'une page commune. */
export function lastmodCommune(contenuModifieLe: string | Date): Date {
  const chiffres = new Date(contenuModifieLe);
  return chiffres > GABARIT_COMMUNE_MODIFIE_LE ? chiffres : GABARIT_COMMUNE_MODIFIE_LE;
}

/**
 * Alternates hreflang d'une page existant dans toutes les langues. `chemins` :
 * même chemin partout, ou un chemin par langue (article au slug anglais propre).
 */
export function alternatesSitemap(chemins: Chemins): NonNullable<EntreeSitemap["alternates"]> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = urlAbsolue(cheminDe(chemins, locale), locale);
  languages["x-default"] = urlAbsolue(cheminDe(chemins, DEFAULT_LOCALE), DEFAULT_LOCALE);
  return { languages };
}

/** Une entrée par langue, chacune avec les alternates complets. */
export function entreesBilingues(chemins: Chemins, extra: Extra): EntreeSitemap[] {
  const alternates = alternatesSitemap(chemins);
  return LOCALES.map((locale) => ({
    url: urlAbsolue(cheminDe(chemins, locale), locale),
    alternates,
    ...extra,
  }));
}

/** Entrée d'une page n'existant que dans une langue (article sans version anglaise publiée). */
export function entreeMonolingue(
  cheminFr: string,
  locale: Locale,
  extra: Extra
): EntreeSitemap {
  return { url: urlAbsolue(cheminFr, locale), ...extra };
}

/** « 30 » → « communes-30.xml », « 2A » → « communes-2a.xml ». */
export function nomFichierCommunes(departement: string): string {
  return `communes-${departement.toLowerCase()}.xml`;
}

/** Noms des fichiers : pages.xml puis un fichier par département présent en base. */
export function nomsFichiersSitemap(departements: readonly string[]): string[] {
  return [
    "pages.xml",
    ...departements.filter((d) => d in DEPARTEMENTS).map(nomFichierCommunes),
  ];
}

/** « communes-30.xml » → « 30 », « communes-2a.xml » → « 2A » ; autre chose → null. */
export function departementDuFichier(nom: string): string | null {
  const m = /^communes-([0-9]{2,3}|2[ab])\.xml$/i.exec(nom);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return code in DEPARTEMENTS ? code : null;
}

const ENTETE = `<?xml version="1.0" encoding="UTF-8"?>\n`;

/** XML d'index listant les fichiers (servi sur /sitemap.xml). */
export function sitemapIndexXml(base: string, departements: readonly string[]): string {
  const lignes = nomsFichiersSitemap(departements)
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
      // Sitemap images (Google Images) : images de la page, URLs absolues.
      for (const image of e.images ?? []) {
        lignes.push(`    <image:image><image:loc>${escapeHtml(image)}</image:loc></image:image>`);
      }
      return `  <url>\n${lignes.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `${ENTETE}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

export function reponseXml(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
