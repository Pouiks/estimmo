import { describe, expect, it } from "vitest";
import { analyserRecherche, motifsRecherche } from "./recherche";

describe("analyserRecherche", () => {
  it("transforme un nom en préfixe de slug, sans accents ni majuscules", () => {
    expect(analyserRecherche("Trécon")).toEqual({ champ: "slug", prefixe: "trecon" });
    expect(analyserRecherche("  Saint-Étienne ")).toEqual({
      champ: "slug",
      prefixe: "saint-etienne",
    });
    expect(analyserRecherche("Villiers en Désœuvre")).toEqual({
      champ: "slug",
      prefixe: "villiers-en-desoeuvre",
    });
  });

  it("reconnaît un code postal, même saisi avec des espaces", () => {
    expect(analyserRecherche("06000")).toEqual({ champ: "code_postal", prefixe: "06000" });
    expect(analyserRecherche("06 0")).toEqual({ champ: "code_postal", prefixe: "060" });
    expect(analyserRecherche("0600012")).toEqual({ champ: "code_postal", prefixe: "06000" });
  });

  it("ignore les saisies trop courtes ou vides", () => {
    expect(analyserRecherche("")).toBeNull();
    expect(analyserRecherche("   ")).toBeNull();
    expect(analyserRecherche("a")).toBeNull();
    expect(analyserRecherche("6")).toBeNull();
    expect(analyserRecherche("--")).toBeNull();
  });

  it("neutralise les caractères spéciaux (motif LIKE sûr)", () => {
    const r = analyserRecherche("Nice%'; drop _ table");
    expect(r?.champ).toBe("slug");
    expect(r?.prefixe).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("motifsRecherche", () => {
  it("cherche un nom au début puis au début d'un mot", () => {
    expect(motifsRecherche({ champ: "slug", prefixe: "etienne" })).toEqual([
      "etienne%",
      "%-etienne%",
    ]);
  });

  it("cherche un code postal uniquement par préfixe", () => {
    expect(motifsRecherche({ champ: "code_postal", prefixe: "06" })).toEqual(["06%"]);
  });
});
