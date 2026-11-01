import { describe, expect, it } from "vitest";
import {
  CHAMPS,
  NOMS_CHAMPS,
  TAILLE_MAX_LOT,
  champsDeEtape,
  classerAppareil,
  estChamp,
  normaliserLot,
} from "./evenements";

const SESSION = "6f1c2b8e-3a4d-4f5e-9b6a-7c8d9e0f1a2b";

describe("normaliserLot", () => {
  it("accepte un lot complet", () => {
    const lot = normaliserLot({
      sessionId: SESSION,
      locale: "en",
      appareil: "mobile",
      page: "/en",
      evenements: [
        { etape: 1, event: "view", t: 0 },
        { etape: 1, event: "saisie", champ: "projet", valeur: "vente", t: 1200 },
      ],
    });
    expect(lot).not.toBeNull();
    expect(lot?.evenements).toHaveLength(2);
    expect(lot?.appareil).toBe("mobile");
  });

  it("convertit l'ancien format (un événement par requête)", () => {
    expect(normaliserLot({ sessionId: SESSION, step: 3, event: "complete" })).toEqual({
      sessionId: SESSION,
      evenements: [{ etape: 3, event: "complete", t: 0 }],
    });
  });

  it("refuse un identifiant, un champ, un appareil ou un événement inconnus", () => {
    const base = { sessionId: SESSION, evenements: [{ etape: 1, event: "view", t: 0 }] };
    expect(normaliserLot({ ...base, sessionId: "abc" })).toBeNull();
    expect(
      normaliserLot({
        ...base,
        evenements: [{ etape: 1, event: "saisie", champ: "motDePasse", t: 0 }],
      })
    ).toBeNull();
    expect(normaliserLot({ ...base, appareil: "montre" })).toBeNull();
    expect(
      normaliserLot({ ...base, evenements: [{ etape: 1, event: "clic", t: 0 }] })
    ).toBeNull();
    expect(normaliserLot({ ...base, evenements: [{ etape: 6, event: "view", t: 0 }] })).toBeNull();
    expect(normaliserLot(null)).toBeNull();
    expect(normaliserLot("texte")).toBeNull();
  });

  it("refuse un lot vide ou trop gros, une valeur ou une page trop longues", () => {
    const evenement = { etape: 1, event: "view", t: 0 };
    expect(normaliserLot({ sessionId: SESSION, evenements: [] })).toBeNull();
    expect(
      normaliserLot({
        sessionId: SESSION,
        evenements: Array.from({ length: TAILLE_MAX_LOT + 1 }, () => evenement),
      })
    ).toBeNull();
    expect(
      normaliserLot({
        sessionId: SESSION,
        evenements: [{ ...evenement, event: "saisie", champ: "dpe", valeur: "x".repeat(81) }],
      })
    ).toBeNull();
    expect(
      normaliserLot({ sessionId: SESSION, page: "/".repeat(121), evenements: [evenement] })
    ).toBeNull();
  });

  it("refuse une valeur sur un champ texte (jamais de donnée personnelle)", () => {
    const base = { sessionId: SESSION };
    expect(
      normaliserLot({
        ...base,
        evenements: [{ etape: 4, event: "saisie", champ: "email", valeur: "a@b.fr", t: 0 }],
      })
    ).toBeNull();
    expect(
      normaliserLot({
        ...base,
        evenements: [{ etape: 1, event: "erreur", champ: "adresse", valeur: "12 rue", t: 0 }],
      })
    ).toBeNull();
    // Sans valeur, le champ texte est accepté ; avec valeur, un champ à choix aussi.
    expect(
      normaliserLot({
        ...base,
        evenements: [
          { etape: 4, event: "saisie", champ: "email", t: 0 },
          { etape: 3, event: "saisie", champ: "dpe", valeur: "C", t: 0 },
        ],
      })?.evenements
    ).toHaveLength(2);
  });

  it("refuse une durée négative ou non entière", () => {
    expect(
      normaliserLot({ sessionId: SESSION, evenements: [{ etape: 1, event: "view", t: -1 }] })
    ).toBeNull();
    expect(
      normaliserLot({ sessionId: SESSION, evenements: [{ etape: 1, event: "view", t: 1.5 }] })
    ).toBeNull();
  });
});

describe("champs", () => {
  it("couvre les quatre étapes dans l'ordre du formulaire", () => {
    expect(champsDeEtape(1)).toEqual(["adresse", "projet", "horizon", "typeBien"]);
    expect(champsDeEtape(4)).toEqual(["prenom", "nom", "email", "telephone", "consentement"]);
    expect(champsDeEtape(5)).toEqual([]);
    const total = [1, 2, 3, 4].reduce((n, e) => n + champsDeEtape(e).length, 0);
    expect(total).toBe(NOMS_CHAMPS.length);
  });

  it("ne suit jamais le pot de miel ni les données du quartier", () => {
    expect(estChamp("website")).toBe(false);
    expect(estChamp("siteWeb")).toBe(false);
    expect(estChamp("quartierStats")).toBe(false);
    expect(estChamp("email")).toBe(true);
    expect(estChamp(42)).toBe(false);
  });

  it("ne transmet la valeur que pour les champs à choix", () => {
    for (const champ of ["adresse", "email", "telephone", "prenom", "nom", "surface"] as const) {
      expect(CHAMPS[champ].type).toBe("texte");
    }
  });
});

describe("classerAppareil", () => {
  it("suit les points de rupture du site", () => {
    expect(classerAppareil(390)).toBe("mobile");
    expect(classerAppareil(767)).toBe("mobile");
    expect(classerAppareil(768)).toBe("tablette");
    expect(classerAppareil(1023)).toBe("tablette");
    expect(classerAppareil(1024)).toBe("ordinateur");
    expect(classerAppareil(1920)).toBe("ordinateur");
  });
});
