import { describe, expect, it } from "vitest";
import fr from "@/messages/fr";
import { aplatirMessages, catalogue, NAMESPACES, texteDefaut } from "./catalogue";
import { appliquerSurcharges } from "./surcharges";

describe("appliquerSurcharges", () => {
  const messages = { home: { hero: { titre: "A", texte: "B" } }, nav: { blog: "Blog" } };

  it("remplace les feuilles ciblées sans muter l'original", () => {
    const resultat = appliquerSurcharges(messages, { "home.hero.titre": "Z" });
    expect(resultat.home.hero.titre).toBe("Z");
    expect(resultat.home.hero.texte).toBe("B");
    expect(messages.home.hero.titre).toBe("A");
  });

  it("ignore les clés inconnues ou qui visent un objet", () => {
    const resultat = appliquerSurcharges(messages, {
      "home.inconnu": "x",
      "home.hero": "x",
      "autre.cle": "x",
      "": "x",
    });
    expect(resultat).toEqual(messages);
  });

  it("renvoie l'objet d'origine sans surcharge", () => {
    expect(appliquerSurcharges(messages, {})).toBe(messages);
  });

  it("fonctionne sur les vrais messages", () => {
    const resultat = appliquerSurcharges(fr, { "nav.blog": "Actualités" });
    expect(resultat.nav.blog).toBe("Actualités");
    expect(fr.nav.blog).toBe("Blog");
  });
});

describe("catalogue", () => {
  it("aplatit les messages", () => {
    expect(aplatirMessages({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual({
      "a.b": "x",
      "a.c.d": "y",
      e: "z",
    });
  });

  it("liste les namespaces et les clés avec leurs deux textes", () => {
    expect(NAMESPACES).toContain("home");
    expect(NAMESPACES).toContain("validation");
    const home = catalogue("home");
    expect(home.length).toBeGreaterThan(20);
    expect(home.every((e) => e.namespace === "home" && e.defaut.fr && e.defaut.en)).toBe(true);
    expect(catalogue().length).toBeGreaterThan(home.length);
  });

  it("texteDefaut renvoie le texte d'origine ou null", () => {
    expect(texteDefaut("fr", "nav.blog")).toBe("Blog");
    expect(texteDefaut("en", "nav.accueil")).toBe("Home");
    expect(texteDefaut("fr", "nav.inconnue")).toBeNull();
  });
});
