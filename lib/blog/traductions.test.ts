import { describe, expect, it } from "vitest";
import {
  inputVersVersion,
  languesEnLigne,
  traductionDepuis,
  traductionPour,
  versionEnLigne,
  versionPour,
  versionVersInput,
  type ChampsTraduisibles,
  type VersionTraduite,
} from "./traductions";

const francais: ChampsTraduisibles & { slug: string } = {
  slug: "frais-de-notaire",
  titre: "Frais de notaire : le guide",
  meta_title: "Frais de notaire 2026",
  meta_description: "Tout comprendre des frais de notaire.",
  extrait: "Un extrait français.",
  contenu_html: "<p>Texte français</p>",
  faq: [{ question: "Combien ?", answer: "Environ 8 %." }],
  image_cover_alt: "Acte notarié",
};

const anglaise: VersionTraduite = {
  statut: "publie",
  titre: "Notary fees: the guide",
  meta_title: null,
  meta_description: "Understanding notary fees.",
  extrait: "",
  contenu_html: "<p>English text</p>",
  faq: [],
  image_cover_alt: "Notarial deed",
};

const sansTraduction = { ...francais, traductions: null };
const brouillon = { ...francais, traductions: { en: { ...anglaise, statut: "brouillon" as const } } };
const publiee = { ...francais, traductions: { en: anglaise } };

describe("traductionPour / versionEnLigne / languesEnLigne", () => {
  it("le français existe toujours, l'anglais seulement si la traduction est publiée", () => {
    expect(versionEnLigne(sansTraduction, "fr")).toBe(true);
    expect(versionEnLigne(sansTraduction, "en")).toBe(false);
    expect(versionEnLigne(brouillon, "en")).toBe(false);
    expect(versionEnLigne(publiee, "en")).toBe(true);
    expect(languesEnLigne(sansTraduction)).toEqual(["fr"]);
    expect(languesEnLigne(brouillon)).toEqual(["fr"]);
    expect(languesEnLigne(publiee)).toEqual(["fr", "en"]);
  });

  it("un brouillon n'est renvoyé que sur demande (aperçu admin)", () => {
    expect(traductionPour(brouillon, "en")).toBeNull();
    expect(traductionPour(brouillon, "en", { brouillons: true })?.titre).toBe(anglaise.titre);
    expect(traductionPour(publiee, "fr")).toBeNull();
  });
});

describe("versionPour", () => {
  it("renvoie le français tel quel, sans la colonne traductions", () => {
    const v = versionPour(publiee, "fr");
    expect(v.langue).toBe("fr");
    expect(v.langues).toEqual(["fr", "en"]);
    expect(v.titre).toBe(francais.titre);
    expect("traductions" in v).toBe(false);
  });

  it("applique la traduction publiée, un champ vide retombant sur le français", () => {
    const v = versionPour(publiee, "en");
    expect(v.langue).toBe("en");
    expect(v.titre).toBe("Notary fees: the guide");
    expect(v.contenu_html).toBe("<p>English text</p>");
    expect(v.image_cover_alt).toBe("Notarial deed");
    // meta_title null et extrait vide → valeurs françaises
    expect(v.meta_title).toBe(francais.meta_title);
    expect(v.extrait).toBe(francais.extrait);
    // FAQ anglaise vide = pas de FAQ (jamais la FAQ française)
    expect(v.faq).toEqual([]);
    expect(v.slug).toBe("frais-de-notaire");
  });

  it("replie sur le français quand la traduction manque ou n'est pas publiée", () => {
    for (const article of [sansTraduction, brouillon]) {
      const v = versionPour(article, "en");
      expect(v.langue).toBe("fr");
      expect(v.titre).toBe(francais.titre);
      expect(v.faq).toEqual(francais.faq);
    }
  });

  it("montre un brouillon sur demande", () => {
    const v = versionPour(brouillon, "en", { brouillons: true });
    expect(v.langue).toBe("en");
    expect(v.titre).toBe(anglaise.titre);
  });

  it("ne traduit que les champs présents sur l'objet (carte sans FAQ)", () => {
    const carte = { slug: "x", titre: "Titre", extrait: "Extrait", traductions: { en: anglaise } };
    const v = versionPour(carte, "en");
    expect(v.titre).toBe(anglaise.titre);
    expect("faq" in v).toBe(false);
    expect("contenu_html" in v).toBe(false);
  });
});

describe("formulaire ↔ traduction stockée", () => {
  it("traductionDepuis copie le français en brouillon, meta title replié sur le titre", () => {
    const input = traductionDepuis({ ...francais, meta_title: null });
    expect(input.statut).toBe("brouillon");
    expect(input.titre).toBe(francais.titre);
    expect(input.metaTitle).toBe(francais.titre);
    expect(input.contenuHtml).toBe(francais.contenu_html);
    expect(input.faq).toEqual(francais.faq);
    expect(input.faq).not.toBe(francais.faq);
  });

  it("versionVersInput affiche les champs absents vides, inputVersVersion les enregistre en null", () => {
    const input = versionVersInput({ statut: "brouillon", titre: "T" });
    expect(input).toEqual({
      statut: "brouillon",
      titre: "T",
      metaTitle: "",
      metaDescription: "",
      extrait: "",
      contenuHtml: "",
      faq: [],
      imageCoverAlt: "",
    });
    expect(inputVersVersion({ ...input, extrait: "  " })).toEqual({
      statut: "brouillon",
      titre: "T",
      meta_title: null,
      meta_description: null,
      extrait: null,
      contenu_html: null,
      faq: [],
      image_cover_alt: null,
    });
  });

  it("aller-retour stable sur une traduction complète", () => {
    expect(inputVersVersion(versionVersInput(anglaise))).toEqual({
      ...anglaise,
      extrait: null,
    });
  });
});
