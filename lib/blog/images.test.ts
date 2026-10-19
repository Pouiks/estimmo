import { describe, expect, it } from "vitest";
import { recenserImages } from "../../scripts/blog-images";
import disponibles from "./images-disponibles.json";
import { couvertureAffichable, imageDisponible } from "./images";

describe("images-disponibles.json", () => {
  it("est à jour avec public/images/blog (sinon : pnpm blog:images)", () => {
    expect(disponibles).toEqual(recenserImages());
  });
});

describe("imageDisponible / couvertureAffichable", () => {
  it("n'accepte qu'une image recensée, ou une couverture envoyée depuis l'admin", () => {
    expect(imageDisponible(null)).toBe(false);
    expect(imageDisponible("/images/blog/inexistant/cover.webp")).toBe(false);
    expect(couvertureAffichable("/images/blog/inexistant/cover.webp")).toBe(false);
    expect(
      couvertureAffichable("https://x.supabase.co/storage/v1/object/public/blog/articles/a.webp")
    ).toBe(true);
  });
});
