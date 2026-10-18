import { describe, expect, it } from "vitest";
import type { LeadPayload } from "@/lib/leads/schema";
import type {
  EstimationLocation,
  EstimationVente,
} from "@/lib/estimation/types";
import { buildCrmPayload } from "./payload";

const lead: LeadPayload = {
  projet: "vente",
  locale: "en",
  horizon: "moins_3_mois",
  typeBien: "appartement",
  adresse: { libelle: "12 Avenue de la République, 06300 Nice", codeInsee: "06088", lat: 43.7, lon: 7.28 },
  surface: 62,
  pieces: 3,
  chambres: 2,
  etage: 2,
  etagesImmeuble: 5,
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
  prenom: "Sophie",
  nom: "Martin",
  email: "sophie@example.com",
  telephone: "+33 6 12 34 56 78",
  consentement: true,
  utm: { source: "google" },
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

const base = { lead, leadId: "lead-1", score: 80, dateConsentement: "2026-10-18T10:00:00Z" };

describe("buildCrmPayload", () => {
  it("vente : contrat complet, codes bruts jamais traduits, téléphone normalisé", () => {
    const p = buildCrmPayload({ ...base, estimation: vente });
    expect(p.contact).toEqual({
      prenom: "Sophie",
      nom: "Martin",
      email: "sophie@example.com",
      telephone: "0612345678",
      consentement_rgpd: true,
      date_consentement: "2026-10-18T10:00:00Z",
    });
    expect(p.bien.projet).toBe("vente");
    expect(p.bien.type).toBe("appartement");
    expect(p.bien.surface_type).toBe("carrez");
    expect(p.bien.etat_general).toBe("bon");
    expect(p.estimation).toMatchObject({
      mediane: 263000,
      nb_comparables: 211,
      rayon_m: 400,
      confiance: "haute",
      manuelle: false,
    });
    expect(p.meta).toMatchObject({ source: "estimateur_web", lead_id: "lead-1", score_lead: 80, utm: { source: "google" } });
    // La langue du prospect ne fait pas partie du contrat CRM.
    expect(JSON.stringify(p)).not.toContain('"locale"');
  });

  it("location : les loyers occupent les champs de fourchette", () => {
    const p = buildCrmPayload({
      ...base,
      lead: { ...lead, projet: "location", horizon: null, typeBien: "maison" },
      estimation: location,
    });
    expect(p.bien.surface_type).toBe("habitable");
    expect(p.estimation).toMatchObject({
      fourchette_basse: 850,
      mediane: 940,
      fourchette_haute: 1040,
      prix_m2_zone: 20.9,
      nb_comparables: 0,
      manuelle: false,
    });
  });

  it("manuelle : bloc estimation à zéro et manuelle=true", () => {
    const p = buildCrmPayload({ ...base, estimation: null });
    expect(p.estimation).toEqual({
      fourchette_basse: 0,
      mediane: 0,
      fourchette_haute: 0,
      prix_m2_zone: 0,
      nb_comparables: 0,
      rayon_m: 0,
      confiance: "",
      manuelle: true,
    });
  });
});
