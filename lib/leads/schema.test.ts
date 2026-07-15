import { describe, expect, it } from "vitest";
import {
  etape1Schema,
  etape2Schema,
  etape3Schema,
  leadPayloadSchema,
} from "./schema";

/**
 * Garde-fous du découpage par étape : chaque étape ne doit valider QUE les
 * champs qu'elle affiche (un champ exigé mais absent de l'écran bloque
 * l'utilisateur sans explication, bug déjà rencontré deux fois).
 */

const bienAppartement = {
  surface: 62,
  pieces: 3,
  chambres: 2,
  etage: 1,
  etagesImmeuble: 5,
  ascenseur: false,
  surfaceTerrain: null,
  anneeConstruction: undefined,
};

describe("etape1Schema", () => {
  it("valide adresse + projet + type", () => {
    const parsed = etape1Schema.safeParse({
      projet: "vente",
      horizon: "moins_3_mois",
      typeBien: "appartement",
      adresse: {
        libelle: "12 Avenue de la République, 06300 Nice",
        codeInsee: "06088",
        lat: 43.7,
        lon: 7.28,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("exige l'horizon pour une vente", () => {
    const parsed = etape1Schema.safeParse({
      projet: "vente",
      horizon: null,
      typeBien: "appartement",
      adresse: { libelle: "x y z", codeInsee: "06088", lat: 43.7, lon: 7.28 },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("etape2Schema", () => {
  it("passe pour un appartement complet, ascenseur sur off compris", () => {
    const parsed = etape2Schema("appartement").safeParse(bienAppartement);
    expect(parsed.success).toBe(true);
  });

  it("n'exige PAS extérieur/stationnement (posés à l'étape 3)", () => {
    const parsed = etape2Schema("appartement").safeParse(bienAppartement);
    expect(parsed.success).toBe(true);
  });

  it("exige le nombre d'étages de l'immeuble pour un appartement", () => {
    const parsed = etape2Schema("appartement").safeParse({
      ...bienAppartement,
      etagesImmeuble: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("refuse un immeuble plus bas que l'étage saisi", () => {
    const parsed = etape2Schema("appartement").safeParse({
      ...bienAppartement,
      etage: 7,
      etagesImmeuble: 5,
    });
    expect(parsed.success).toBe(false);
  });

  it("maison : ni étage ni étages d'immeuble requis", () => {
    const parsed = etape2Schema("maison").safeParse({
      ...bienAppartement,
      etage: null,
      etagesImmeuble: null,
      ascenseur: null,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("etape3Schema", () => {
  const etatComplet = {
    etatGeneral: "bon",
    exterieur: ["balcon"],
    stationnement: "place",
    ageCuisine: "5_10",
    ageSdb: "10_20",
    dpe: "D",
    atouts: [],
  };

  it("valide un état complet", () => {
    expect(etape3Schema.safeParse(etatComplet).success).toBe(true);
  });

  it("exige le stationnement (posé à cette étape)", () => {
    const sans = { ...etatComplet, stationnement: undefined };
    expect(etape3Schema.safeParse(sans).success).toBe(false);
  });
});

describe("leadPayloadSchema", () => {
  it("accepte le payload complet du formulaire", () => {
    const parsed = leadPayloadSchema.safeParse({
      projet: "vente",
      horizon: "moins_3_mois",
      typeBien: "appartement",
      adresse: {
        libelle: "12 Avenue de la République, 06300 Nice",
        codeInsee: "06088",
        codePostal: "06300",
        lat: 43.7,
        lon: 7.28,
      },
      ...bienAppartement,
      etatGeneral: "bon",
      exterieur: ["balcon"],
      stationnement: "place",
      ageCuisine: "5_10",
      ageSdb: "10_20",
      dpe: "D",
      atouts: ["lumineux"],
      prenom: "Sophie",
      nom: "Martin",
      email: "sophie@example.com",
      telephone: "06 12 34 56 78",
      consentement: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepte une maison sans étages d'immeuble ni année", () => {
    const parsed = leadPayloadSchema.safeParse({
      projet: "location",
      horizon: null,
      typeBien: "maison",
      adresse: { libelle: "1 rue du Port, Nice", codeInsee: "06088", lat: 43.7, lon: 7.28 },
      surface: 100,
      pieces: 4,
      chambres: 3,
      etage: null,
      etagesImmeuble: null,
      ascenseur: null,
      surfaceTerrain: null,
      anneeConstruction: null,
      etatGeneral: "bon",
      exterieur: [],
      stationnement: "aucun",
      ageCuisine: "5_10",
      ageSdb: "5_10",
      dpe: "ne_sait_pas",
      atouts: [],
      prenom: "Karim",
      nom: "Ben",
      email: "karim@example.com",
      telephone: "0611223344",
      consentement: true,
    });
    expect(parsed.success).toBe(true);
  });
});
