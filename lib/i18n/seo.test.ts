import { describe, expect, it } from "vitest";
import { alternatesPour, cheminLocalise, inLanguage, ogLocale } from "./seo";

describe("cheminLocalise", () => {
  it("laisse le français sans préfixe", () => {
    expect(cheminLocalise("/", "fr")).toBe("/");
    expect(cheminLocalise("/prix-immobilier/nice-06000", "fr")).toBe(
      "/prix-immobilier/nice-06000"
    );
  });

  it("préfixe l'anglais", () => {
    expect(cheminLocalise("/", "en")).toBe("/en");
    expect(cheminLocalise("/estimation", "en")).toBe("/en/estimation");
  });
});

describe("alternatesPour", () => {
  it("canonique sur la langue courante, hreflang fr/en et x-default vers le français", () => {
    expect(alternatesPour("/estimation", "en")).toEqual({
      canonical: "/en/estimation",
      languages: {
        fr: "/estimation",
        en: "/en/estimation",
        "x-default": "/estimation",
      },
    });
    expect(alternatesPour("/", "fr")).toEqual({
      canonical: "/",
      languages: { fr: "/", en: "/en", "x-default": "/" },
    });
  });
});

describe("ogLocale / inLanguage", () => {
  it("retourne les codes attendus", () => {
    expect(ogLocale("fr")).toBe("fr_FR");
    expect(ogLocale("en")).toBe("en_US");
    expect(inLanguage("fr")).toBe("fr-FR");
    expect(inLanguage("en")).toBe("en-US");
  });
});

describe("urlAbsolue", () => {
  it("racine française sans slash final, anglais sous /en", async () => {
    const { urlAbsolue } = await import("./seo");
    const { SITE } = await import("@/lib/config");
    expect(urlAbsolue("/", "fr")).toBe(SITE.url);
    expect(urlAbsolue("/", "en")).toBe(`${SITE.url}/en`);
    expect(urlAbsolue("/estimation", "fr")).toBe(`${SITE.url}/estimation`);
    expect(urlAbsolue("/estimation", "en")).toBe(`${SITE.url}/en/estimation`);
  });
});
