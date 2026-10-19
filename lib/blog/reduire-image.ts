/**
 * Navigateur uniquement : réduit une photo avant l'envoi (une image générée
 * fait souvent 3 à 8 Mo ; l'envoi est plafonné à 4 Mo). Le recadrage final et
 * la conversion WebP sont faits par le serveur (lib/blog/optimisation.ts).
 */
const COTE_MAX = 2000;

export async function reduireImage(fichier: File): Promise<Blob> {
  if (fichier.size < 2.5 * 1024 * 1024 && fichier.type !== "image/png") return fichier;
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", 0.9)
  );
}
