import sharp from "sharp";

/**
 * Prépare une image pour le blog : orientation EXIF appliquée, métadonnées
 * retirées, recadrage ou réduction, WebP sous un poids cible (qualité
 * abaissée par paliers). Utilisé par l'admin (emplacements d'article et
 * bibliothèque).
 */

export const POSITIONS = ["auto", "haut", "centre", "bas"] as const;
export type Position = (typeof POSITIONS)[number];

/** Poids cible d'une image du blog (brief : moins de 200 Ko). */
export const POIDS_MAX = 200 * 1024;

const QUALITES = [82, 76, 70, 64, 58, 52, 46, 40];

export type Traitement =
  /** Dimensions exactes (emplacement d'article) : recadrage « cover ». */
  | { mode: "recadrer"; largeur: number; hauteur: number; position: Position }
  /** Bibliothèque : proportions conservées, largeur plafonnée. */
  | { mode: "limiter"; largeurMax: number };

export interface ImageOptimisee {
  donnees: Buffer;
  largeur: number;
  hauteur: number;
  qualite: number;
  /** L'original était plus petit que la cible : il a été agrandi (flou possible). */
  agrandie: boolean;
}

function positionSharp(position: Position): string {
  if (position === "auto") return sharp.strategy.attention as unknown as string;
  return { haut: "top", centre: "centre", bas: "bottom" }[position];
}

export async function optimiserImage(
  source: Buffer,
  traitement: Traitement,
  poidsMax = POIDS_MAX
): Promise<ImageOptimisee> {
  // failOn « error » : refuse ce qui n'est pas une image lisible.
  const meta = await sharp(source, { failOn: "error" }).metadata();
  if (!meta.width || !meta.height) throw new Error("Image illisible");
  // Dimensions après rotation EXIF (portrait photographié en paysage…)
  const tourne = (meta.orientation ?? 1) >= 5;
  const largeurSource = tourne ? meta.height : meta.width;
  const hauteurSource = tourne ? meta.width : meta.height;

  let largeur: number;
  let hauteur: number;
  let agrandie: boolean;
  let base: ReturnType<typeof sharp>;
  if (traitement.mode === "recadrer") {
    largeur = traitement.largeur;
    hauteur = traitement.hauteur;
    agrandie = largeurSource < largeur || hauteurSource < hauteur;
    base = sharp(source)
      .rotate()
      .resize(largeur, hauteur, { fit: "cover", position: positionSharp(traitement.position) });
  } else {
    largeur = Math.min(largeurSource, traitement.largeurMax);
    hauteur = Math.round((hauteurSource * largeur) / largeurSource);
    agrandie = false;
    base = sharp(source).rotate().resize({ width: largeur, withoutEnlargement: true });
  }

  let resultat: { donnees: Buffer; qualite: number } | null = null;
  for (const qualite of QUALITES) {
    const donnees = await base.clone().webp({ quality: qualite, effort: 5 }).toBuffer();
    resultat = { donnees, qualite };
    if (donnees.length <= poidsMax) break;
  }
  return { ...resultat!, largeur, hauteur, agrandie };
}
