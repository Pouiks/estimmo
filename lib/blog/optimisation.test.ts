import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimiserImage, POIDS_MAX } from "./optimisation";

/** Image de test « photographique » (bruit) : difficile à compresser. */
async function imageBruitee(largeur: number, hauteur: number): Promise<Buffer> {
  const pixels = Buffer.alloc(largeur * hauteur * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7919) % 251;
  return sharp(pixels, { raw: { width: largeur, height: hauteur, channels: 3 } })
    .png()
    .toBuffer();
}

describe("optimiserImage", () => {
  it("recadre aux dimensions exactes d'une couverture, en WebP sous 200 Ko", async () => {
    const source = await imageBruitee(2400, 1800);
    const r = await optimiserImage(source, { mode: "recadrer", largeur: 1200, hauteur: 630, position: "auto" });
    const meta = await sharp(r.donnees).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([1200, 630]);
    expect(r.donnees.length).toBeLessThanOrEqual(POIDS_MAX);
    expect(r.agrandie).toBe(false);
  });

  it("signale un original trop petit (agrandi)", async () => {
    const source = await imageBruitee(800, 600);
    const r = await optimiserImage(source, { mode: "recadrer", largeur: 1200, hauteur: 800, position: "centre" });
    expect(r.agrandie).toBe(true);
    expect([r.largeur, r.hauteur]).toEqual([1200, 800]);
  });

  it("bibliothèque : conserve les proportions et plafonne la largeur", async () => {
    const source = await imageBruitee(3000, 1500);
    const r = await optimiserImage(source, { mode: "limiter", largeurMax: 1600 });
    const meta = await sharp(r.donnees).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 800]);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    await expect(
      optimiserImage(Buffer.from("pas une image"), { mode: "limiter", largeurMax: 1600 })
    ).rejects.toThrow();
  });
});
