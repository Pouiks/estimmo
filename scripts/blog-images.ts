/**
 * Recense les images livrées dans public/images/blog/ et écrit
 * lib/blog/images-disponibles.json (lu au rendu des articles).
 * Lancé automatiquement par `pnpm build` ; à relancer après avoir déposé
 * des images si on veut les voir en local : pnpm blog:images
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const RACINE_IMAGES = path.join(process.cwd(), "public", "images", "blog");
export const FICHIER_LISTE = path.join(process.cwd(), "lib", "blog", "images-disponibles.json");

export function recenserImages(racine = RACINE_IMAGES): string[] {
  const trouvees: string[] = [];
  const parcourir = (dossier: string) => {
    let entrees: string[];
    try {
      entrees = readdirSync(dossier);
    } catch {
      return;
    }
    for (const nom of entrees) {
      const complet = path.join(dossier, nom);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (/\.(webp|avif|jpe?g|png)$/i.test(nom)) {
        trouvees.push(`/images/blog/${path.relative(racine, complet).split(path.sep).join("/")}`);
      }
    }
  };
  parcourir(racine);
  return trouvees.sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const images = recenserImages();
  writeFileSync(FICHIER_LISTE, `${JSON.stringify(images, null, 2)}\n`);
  console.log(`[blog:images] ${images.length} image(s) recensée(s)`);
}
