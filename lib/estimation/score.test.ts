import { describe, expect, it } from "vitest";
import { calculerScoreLead } from "./score";

describe("calculerScoreLead", () => {
  it("score maximal : vente déjà en vente, tout renseigné → 100", () => {
    expect(
      calculerScoreLead({
        projet: "vente",
        horizon: "en_vente",
        telephoneValide: true,
        dpe: "C",
        atouts: ["lumineux"],
      })
    ).toBe(100);
  });

  it("pondère l'horizon de vente", () => {
    const base = {
      projet: "vente" as const,
      telephoneValide: false,
      dpe: null,
      atouts: [],
    };
    expect(calculerScoreLead({ ...base, horizon: "en_vente" })).toBe(60);
    expect(calculerScoreLead({ ...base, horizon: "moins_3_mois" })).toBe(55);
    expect(calculerScoreLead({ ...base, horizon: "3_6_mois" })).toBe(40);
    expect(calculerScoreLead({ ...base, horizon: "curiosite" })).toBe(25);
  });

  it("location sans horizon : projet 10 + téléphone 20", () => {
    expect(
      calculerScoreLead({
        projet: "location",
        horizon: null,
        telephoneValide: true,
        dpe: null,
        atouts: [],
      })
    ).toBe(30);
  });

  it("le DPE « ne sait pas » ne compte pas comme renseigné", () => {
    const avec = calculerScoreLead({
      projet: "vente",
      horizon: "curiosite",
      telephoneValide: true,
      dpe: "E",
      atouts: [],
    });
    const sans = calculerScoreLead({
      projet: "vente",
      horizon: "curiosite",
      telephoneValide: true,
      dpe: "ne_sait_pas",
      atouts: [],
    });
    expect(avec - sans).toBe(10);
  });
});
