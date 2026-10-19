import { describe, expect, it } from "vitest";
import { recenserImages } from "../../scripts/blog-images";
import disponibles from "./images-disponibles.json";
import { imageDisponible, imagesPubliees, resoudreImage } from "./images";

describe("imagesPubliees", () => {
  it("liste en URL absolue les images résolues, sans doublon ni image manquante", () => {
    const storage = "https://x.supabase.co/storage/v1/object/public/blog/visuels/a-cover-1.webp";
    const article = {
      image_cover: "/images/blog/a/cover.webp",
      visuels: { "/images/blog/a/cover.webp": storage },
      contenu_html:
        '<img src="/images/blog/a/image-1.webp" alt=""><img src="/images/blog/a/cover.webp" alt="">',
    };
    expect(imagesPubliees(article)).toEqual([storage]);
    expect(imagesPubliees({ image_cover: null, visuels: null, contenu_html: null })).toEqual([]);
  });
});

describe("images-disponibles.json", () => {
  it("est à jour avec public/images/blog (sinon : pnpm blog:images)", () => {
    expect(disponibles).toEqual(recenserImages());
  });
});

describe("resoudreImage", () => {
  const storage = "https://x.supabase.co/storage/v1/object/public/blog/visuels/a/cover-abcd1234.webp";

  it("préfère l'image envoyée depuis l'admin", () => {
    expect(resoudreImage("/images/blog/a/cover.webp", { "/images/blog/a/cover.webp": storage })).toBe(storage);
  });

  it("garde une URL Storage directe (couverture d'un article TipTap)", () => {
    expect(resoudreImage(storage, {})).toBe(storage);
  });

  it("renvoie null pour une image ni envoyée ni livrée dans public/", () => {
    expect(resoudreImage(null, {})).toBeNull();
    expect(imageDisponible("/images/blog/inexistant/cover.webp")).toBe(false);
    expect(resoudreImage("/images/blog/inexistant/cover.webp", null)).toBeNull();
  });
});
