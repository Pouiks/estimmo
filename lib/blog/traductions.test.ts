import { describe, expect, it } from "vitest";
import {
  articleParSlug,
  cheminsBlog,
  inputVersVersion,
  languesEnLigne,
  slugPour,
  slugsPublics,
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

describe("slugs publics", () => {
  const avecSlugEn = { ...francais, traductions: { en: { ...anglaise, slug: "notary-fees" } } };
  const slugEnBrouillon = {
    ...francais,
    traductions: { en: { ...anglaise, statut: "brouillon" as const, slug: "notary-fees" } },
  };

  it("slug français partout tant que la traduction n'a pas de slug propre ou n'est pas publiée", () => {
    for (const article of [sansTraduction, brouillon, publiee, slugEnBrouillon]) {
      expect(slugPour(article, "fr")).toBe("frais-de-notaire");
      expect(slugPour(article, "en")).toBe("frais-de-notaire");
      expect(slugsPublics(article)).toEqual({ fr: "frais-de-notaire", en: "frais-de-notaire" });
    }
    // Un slug anglais vide ("" ou null) compte comme absent.
    expect(slugPour({ ...francais, traductions: { en: { ...anglaise, slug: "" } } }, "en")).toBe(
      "frais-de-notaire"
    );
  });

  it("slug anglais propre quand la traduction publiée en a un (brouillon sur demande)", () => {
    expect(slugPour(avecSlugEn, "en")).toBe("notary-fees");
    expect(slugPour(avecSlugEn, "fr")).toBe("frais-de-notaire");
    expect(slugsPublics(avecSlugEn)).toEqual({ fr: "frais-de-notaire", en: "notary-fees" });
    expect(slugPour(slugEnBrouillon, "en", { brouillons: true })).toBe("notary-fees");
  });

  it("versionPour expose slugs par langue et garde slug = identifiant français", () => {
    const en = versionPour(avecSlugEn, "en");
    expect(en.slug).toBe("frais-de-notaire");
    expect(en.slugs).toEqual({ fr: "frais-de-notaire", en: "notary-fees" });
    const fr = versionPour(avecSlugEn, "fr");
    expect(fr.slugs).toEqual({ fr: "frais-de-notaire", en: "notary-fees" });
    expect(versionPour(brouillon, "en").slugs).toEqual({ fr: "frais-de-notaire", en: "frais-de-notaire" });
  });

  it("cheminsBlog : chemins non préfixés par langue", () => {
    expect(cheminsBlog({ fr: "frais-de-notaire", en: "notary-fees" })).toEqual({
      fr: "/blog/frais-de-notaire",
      en: "/blog/notary-fees",
    });
  });

  describe("articleParSlug", () => {
    const autre = { ...francais, slug: "autre-article", traductions: null };
    const candidats = [autre, avecSlugEn];

    it("retrouve l'article par le slug public de la langue", () => {
      expect(articleParSlug(candidats, "notary-fees", "en")).toBe(avecSlugEn);
      expect(articleParSlug(candidats, "frais-de-notaire", "fr")).toBe(avecSlugEn);
      expect(articleParSlug(candidats, "autre-article", "en")).toBe(autre);
    });

    it("retrouve l'article par un slug d'une autre langue (la page redirigera)", () => {
      // Ancienne URL anglaise /en/blog/<slug fr> après ajout d'un slug anglais
      expect(articleParSlug(candidats, "frais-de-notaire", "en")).toBe(avecSlugEn);
      // /blog/<slug en> (sélecteur de langue depuis la page anglaise)
      expect(articleParSlug(candidats, "notary-fees", "fr")).toBe(avecSlugEn);
    });

    it("ignore un slug qui n'existe que dans une traduction en brouillon", () => {
      expect(articleParSlug([autre, slugEnBrouillon], "notary-fees", "en")).toBeNull();
      expect(articleParSlug([autre, slugEnBrouillon], "notary-fees", "fr")).toBeNull();
      expect(articleParSlug(candidats, "inconnu", "fr")).toBeNull();
    });

    it("en cas de collision, préfère l'article dont c'est le slug public dans la langue", () => {
      const collision = { ...francais, slug: "notary-fees", traductions: null };
      expect(articleParSlug([collision, avecSlugEn], "notary-fees", "en")).toBe(avecSlugEn);
      expect(articleParSlug([avecSlugEn, collision], "notary-fees", "fr")).toBe(collision);
    });
  });
});

describe("formulaire ↔ traduction stockée", () => {
  it("traductionDepuis copie le français en brouillon, meta title replié sur le titre", () => {
    const input = traductionDepuis({ ...francais, meta_title: null });
    expect(input.statut).toBe("brouillon");
    expect(input.slug).toBe("");
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
      slug: "",
      titre: "T",
      metaTitle: "",
      metaDescription: "",
      extrait: "",
      contenuHtml: "",
      faq: [],
      imageCoverAlt: "",
    });
    expect(inputVersVersion({ ...input, extrait: "  ", slug: " " })).toEqual({
      statut: "brouillon",
      slug: null,
      titre: "T",
      meta_title: null,
      meta_description: null,
      extrait: null,
      contenu_html: null,
      faq: [],
      image_cover_alt: null,
    });
  });

  it("aller-retour stable sur une traduction complète, slug compris", () => {
    expect(inputVersVersion(versionVersInput(anglaise))).toEqual({
      ...anglaise,
      slug: null,
      extrait: null,
    });
    const avecSlug = { ...anglaise, slug: "notary-fees" };
    expect(inputVersVersion(versionVersInput(avecSlug)).slug).toBe("notary-fees");
  });
});
