import { SITE } from "@/lib/config";
import { imagesCorps } from "./html";
import disponibles from "./images-disponibles.json";

/**
 * Images du blog. Un article éditorial désigne ses images par des chemins
 * logiques (/images/blog/<slug>/cover.webp…) ; au rendu, chacun est résolu :
 *  1. image envoyée depuis l'admin (Supabase Storage, colonne visuels) ;
 *  2. fichier livré dans public/images/blog/ (recensé dans
 *     images-disponibles.json par `pnpm blog:images`, relancé à chaque build :
 *     public/ n'est pas lisible depuis les fonctions serverless) ;
 *  3. sinon null → aplat neutre plutôt qu'une image cassée.
 */
const ENSEMBLE = new Set<string>(disponibles);

/** Chemin logique → URL Storage (colonne articles.visuels). */
export type Visuels = Record<string, string>;

export function imageDisponible(src: string | null | undefined): boolean {
  return !!src && ENSEMBLE.has(src);
}

/** URL à afficher pour une image, ou null si elle n'est pas encore fournie. */
export function resoudreImage(
  src: string | null | undefined,
  visuels: Visuels | null | undefined
): string | null {
  if (!src) return null;
  const envoyee = visuels?.[src];
  if (envoyee) return envoyee;
  // Couverture d'un article TipTap : URL Storage directe.
  if (/^https:\/\//.test(src)) return src;
  return ENSEMBLE.has(src) ? src : null;
}

/** URLs absolues des images réellement affichées d'un article (sitemap images). */
export function imagesPubliees(article: {
  image_cover: string | null;
  visuels: Visuels | null;
  contenu_html: string | null;
}): string[] {
  const sources = [
    article.image_cover,
    ...(article.contenu_html ? imagesCorps(article.contenu_html) : []),
  ];
  const urls = sources
    .map((s) => resoudreImage(s, article.visuels))
    .filter((u): u is string => !!u);
  return [...new Set(urls)].map((u) => new URL(u, SITE.url).toString());
}
