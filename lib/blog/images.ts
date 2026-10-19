import disponibles from "./images-disponibles.json";

/**
 * Images du blog livrées dans public/images/blog/<slug>/.
 *
 * Le dossier public/ n'est pas lisible depuis les fonctions serverless
 * (Vercel le sert depuis le CDN) : la liste est figée dans
 * images-disponibles.json par `pnpm blog:images`, relancé à chaque build.
 * Une image absente est remplacée par un aplat neutre plutôt qu'une image cassée.
 */
const ENSEMBLE = new Set<string>(disponibles);

export function imageDisponible(src: string | null | undefined): boolean {
  return !!src && ENSEMBLE.has(src);
}

/** Couverture affichable : image livrée dans public/ ou envoyée depuis l'admin (Storage). */
export function couvertureAffichable(src: string | null | undefined): src is string {
  return !!src && (/^https:\/\//.test(src) || ENSEMBLE.has(src));
}
