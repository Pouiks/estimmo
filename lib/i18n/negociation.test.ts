import { describe, expect, it } from "vitest";
import { localePreferee } from "./negociation";

describe("localePreferee", () => {
  it("français quand la langue principale est le français", () => {
    expect(localePreferee("fr-FR,fr;q=0.9,en;q=0.5")).toBe("fr");
    expect(localePreferee("fr")).toBe("fr");
    expect(localePreferee("fr-CA,en-CA;q=0.8")).toBe("fr");
    expect(localePreferee("en;q=0.8,fr;q=0.9")).toBe("fr");
  });

  it("anglais pour l'anglais et toute autre langue", () => {
    expect(localePreferee("en-US,en;q=0.9")).toBe("en");
    expect(localePreferee("de-DE,de;q=0.9,en;q=0.7")).toBe("en");
    expect(localePreferee("es-ES")).toBe("en");
    expect(localePreferee("zh-CN,zh;q=0.9")).toBe("en");
    expect(localePreferee("en-US,fr;q=0.8")).toBe("en");
  });

  it("français par défaut sans en-tête, en-tête vide ou joker", () => {
    expect(localePreferee(null)).toBe("fr");
    expect(localePreferee(undefined)).toBe("fr");
    expect(localePreferee("")).toBe("fr");
    expect(localePreferee("*")).toBe("fr");
  });

  it("ignore les langues à poids nul ou malformées", () => {
    expect(localePreferee("fr;q=0,en")).toBe("en");
    expect(localePreferee("en;q=abc,fr;q=0.5")).toBe("fr");
  });
});
