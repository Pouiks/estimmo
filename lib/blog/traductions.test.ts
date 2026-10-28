import { describe, expect, it } from "vitest";
import {
  cheminDeRepli,
  cheminsParLangue,
  correspondances,
  slugTraduction,
  versionDans,
  type ArticleVersion,
} from "./traductions";

const fr1: ArticleVersion = { id: "a", slug: "frais-de-notaire", lang: "fr", traduction_de: null };
const en1: ArticleVersion = { id: "b", slug: "notary-fees", lang: "en", traduction_de: "a" };
const fr2: ArticleVersion = { id: "c", slug: "home-staging", lang: "fr", traduction_de: null };
const enSeul: ArticleVersion = { id: "d", slug: "english-only", lang: "en", traduction_de: null };
const tous = [fr1, en1, fr2, enSeul];

describe("slugTraduction", () => {
  it("suffixe le slug par la langue, sans doublon", () => {
    expect(slugTraduction("frais-de-notaire", "en")).toBe("frais-de-notaire-en");
    expect(slugTraduction("frais-de-notaire-en", "en")).toBe("frais-de-notaire-en");
  });
});

describe("versionDans", () => {
  it("trouve la traduction d'un original et l'original d'une traduction", () => {
    expect(versionDans(fr1, "en", tous)).toBe(en1);
    expect(versionDans(en1, "fr", tous)).toBe(fr1);
  });

  it("ne renvoie rien sans version dans cette langue, ni pour la langue de l'article", () => {
    expect(versionDans(fr2, "en", tous)).toBeNull();
    expect(versionDans(enSeul, "fr", tous)).toBeNull();
    expect(versionDans(fr1, "fr", tous)).toBeNull();
  });
});

describe("correspondances", () => {
  it("associe le slug de l'autre langue au slug de la langue demandée", () => {
    expect([...correspondances(tous, "en")]).toEqual([["frais-de-notaire", "notary-fees"]]);
    expect([...correspondances(tous, "fr")]).toEqual([["notary-fees", "frais-de-notaire"]]);
  });
});

describe("cheminsParLangue", () => {
  it("déclare chaque langue où l'article existe", () => {
    expect(cheminsParLangue(fr1, "fr", tous)).toEqual({
      fr: "/blog/frais-de-notaire",
      en: "/blog/notary-fees",
    });
    expect(cheminsParLangue(en1, "en", tous)).toEqual({
      fr: "/blog/frais-de-notaire",
      en: "/blog/notary-fees",
    });
    expect(cheminsParLangue(fr2, "fr", tous)).toEqual({ fr: "/blog/home-staging" });
  });
});

describe("cheminDeRepli", () => {
  it("envoie vers la version dans la langue demandée quand elle est en ligne", () => {
    expect(cheminDeRepli("frais-de-notaire", "en", tous)).toBe("/blog/notary-fees");
    expect(cheminDeRepli("notary-fees", "fr", tous)).toBe("/blog/frais-de-notaire");
  });

  it("envoie vers la liste du blog quand l'article n'a pas de version dans cette langue", () => {
    expect(cheminDeRepli("home-staging", "en", tous)).toBe("/blog");
  });

  it("laisse la 404 pour un slug inconnu ou déjà dans la bonne langue", () => {
    expect(cheminDeRepli("inconnu", "en", tous)).toBeNull();
    expect(cheminDeRepli("home-staging", "fr", tous)).toBeNull();
  });
});
