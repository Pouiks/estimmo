import { createFormatter, createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import fr from "@/messages/fr";
import { formats } from "@/lib/i18n/formats";
import type { Locale } from "@/lib/i18n/routing";
import type { LeadPayload } from "@/lib/leads/schema";
import type {
  EstimationLocation,
  EstimationVente,
} from "@/lib/estimation/types";
import { prenomPropre, renderEmailProspect } from "./template";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

function outils(locale: Locale) {
  const messages = locale === "fr" ? fr : en;
  return {
    t: createTranslator({ locale, messages, formats, timeZone: "Europe/Paris" }),
    format: createFormatter({ locale, formats, timeZone: "Europe/Paris" }),
  };
}

const lead: LeadPayload = {
  projet: "vente",
  locale: "fr",
  horizon: "moins_3_mois",
  typeBien: "appartement",
  adresse: {
    libelle: "12 Avenue de la République, 06300 Nice",
    codeInsee: "06088",
    codePostal: "06300",
    lat: 43.706,
    lon: 7.283,
  },
  surface: 62,
  pieces: 3,
  chambres: 2,
  etage: 2,
  ascenseur: true,
  surfaceTerrain: null,
  anneeConstruction: "1950_1975",
  exterieur: ["balcon"],
  stationnement: "aucun",
  etatGeneral: "bon",
  ageCuisine: "5_10",
  ageSdb: "10_20",
  dpe: "D",
  atouts: ["lumineux"],
  prenom: "sophie",
  nom: "Martin <script>",
  email: "sophie.martin@example.com",
  telephone: "0612345678",
  consentement: true,
};

const vente: EstimationVente = {
  projet: "vente",
  fourchetteBasse: 224000,
  mediane: 263000,
  fourchetteHaute: 303000,
  prixM2Zone: 4206,
  prixM2Ajuste: 4248,
  nbComparables: 211,
  rayonM: 400,
  palier: "rayon",
  confiance: "haute",
  ajustementPct: 1,
  fourchettePct: 10,
};

const location: EstimationLocation = {
  projet: "location",
  loyerBas: 850,
  loyerMedian: 940,
  loyerHaut: 1040,
  loyerM2Zone: 20.9,
  typologie: "t3_plus",
  millesime: 2025,
  ajustementPct: 0,
  confiance: "indicative",
  dpeAlerte: null,
};

describe("prenomPropre", () => {
  it("capitalise le prénom saisi en minuscules", () => {
    expect(prenomPropre("virgile")).toBe("Virgile");
    expect(prenomPropre("  jean-pierre ")).toBe("Jean-Pierre");
    expect(prenomPropre("MARIE LOUISE")).toBe("Marie Louise");
    expect(prenomPropre("élodie")).toBe("Élodie");
  });
});

describe("renderEmailProspect (fr)", () => {
  const { t, format } = outils("fr");

  it("vente : sujet chiffré, blocs traduits, libellé de confiance lisible", () => {
    const { subject, html } = renderEmailProspect({
      lead,
      estimation: vente,
      locale: "fr",
      t,
      format,
      rappelUrl: "https://x/rappel?lead=1&t=2",
    });
    expect(nbsp(subject)).toBe(
      "Sophie, votre appartement vaut entre 224 000 € et 303 000 €"
    );
    expect(html).toContain('<html lang="fr"');
    expect(html).toContain("Bonjour Sophie,");
    expect(html).toContain("Appartement · 62 m² · 3 pièces");
    expect(nbsp(html)).toContain("Prix de votre zone : <strong");
    expect(html).toContain("211 ventes comparables dans un rayon de 400 m");
    expect(html).toContain("confiance élevée.");
    expect(html).not.toContain("confiance haute");
    expect(html).toContain("Je souhaite être rappelé(e)");
    expect(html).toContain('href="https://x/rappel?lead=1&t=2"');
    expect(html).toContain("/politique-confidentialite");
    expect(nbsp(html)).toContain("à partir de 3 %");
    expect(html).toContain("Source : DVF - data.gouv.fr");
  });

  it("location : loyer dans le sujet, pas de bloc honoraires", () => {
    const { subject, html } = renderEmailProspect({
      lead: { ...lead, projet: "location", horizon: null },
      estimation: location,
      locale: "fr",
      t,
      format,
    });
    expect(nbsp(subject)).toBe("Sophie, votre appartement se loue autour de 940 €/mois");
    expect(html).toContain("Loyer mensuel estimé (charges comprises)");
    expect(html).not.toContain("mandat exclusif");
    expect(html).toContain("mise en location");
  });

  it("manuelle : promesse 24 h", () => {
    const { subject, html } = renderEmailProspect({
      lead: { ...lead, prenom: "karim" },
      estimation: null,
      locale: "fr",
      t,
      format,
    });
    expect(subject).toBe("Karim, votre estimation personnalisée arrive sous 24 h");
    expect(html).toContain("Votre estimation personnalisée arrive sous 24 h");
    expect(html).toContain("<strong>Carenza Brown</strong>");
  });

  it("échappe les valeurs saisies par le prospect", () => {
    const { html } = renderEmailProspect({
      lead: { ...lead, adresse: { ...lead.adresse, libelle: "<img src=x>" } },
      estimation: vente,
      locale: "fr",
      t,
      format,
    });
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;img src=x&gt;");
  });
});

describe("renderEmailProspect (en)", () => {
  const { t, format } = outils("en");

  it("vente en anglais : sujet, libellés, lien /en et montants en format anglais", () => {
    const { subject, html } = renderEmailProspect({
      lead: { ...lead, locale: "en", typeBien: "maison" },
      estimation: vente,
      locale: "en",
      t,
      format,
    });
    expect(subject).toBe("Sophie, your house is worth between €224,000 and €303,000");
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("Hello Sophie,");
    expect(html).toContain("House · 62 m² · 3 rooms");
    expect(html).toContain("211 comparable sales within 400 m");
    expect(html).toContain("confidence: high.");
    expect(html).toContain("I would like a call back");
    expect(html).toContain("/en/politique-confidentialite");
    expect(html).toContain("from 3%");
  });

  it("manuelle en anglais", () => {
    const { subject } = renderEmailProspect({
      lead: { ...lead, locale: "en" },
      estimation: null,
      locale: "en",
      t,
      format,
    });
    expect(subject).toBe("Sophie, your personalised valuation is on its way within 24 h");
  });
});
