import { describe, expect, it } from "vitest";
import {
  alerteDpeLocation,
  choisirLoyerM2,
  estimerLocation,
} from "./location";
import type { CaracteristiquesBien, LoyersCommune } from "./types";

const LOYERS: LoyersCommune = {
  loyer_m2_appartement: 15,
  loyer_m2_appt_t1_t2: 18,
  loyer_m2_appt_t3_plus: 13.5,
  loyer_m2_maison: 12,
  millesime: 2025,
};

function bien(overrides: Partial<CaracteristiquesBien> = {}): CaracteristiquesBien {
  return { typeBien: "appartement", surface: 45, pieces: 2, ...overrides };
}

describe("choisirLoyerM2", () => {
  it("T1-T2 pour un appartement ≤ 2 pièces", () => {
    expect(choisirLoyerM2(bien({ pieces: 1 }), LOYERS)).toEqual({
      loyerM2: 18,
      typologie: "t1_t2",
    });
  });

  it("T3+ pour un appartement ≥ 3 pièces", () => {
    expect(choisirLoyerM2(bien({ pieces: 4 }), LOYERS)).toEqual({
      loyerM2: 13.5,
      typologie: "t3_plus",
    });
  });

  it("toutes typologies si le nombre de pièces est inconnu", () => {
    expect(choisirLoyerM2(bien({ pieces: null }), LOYERS)).toEqual({
      loyerM2: 15,
      typologie: "toutes",
    });
  });

  it("replie sur toutes typologies si la colonne fine est vide", () => {
    expect(
      choisirLoyerM2(bien({ pieces: 1 }), { ...LOYERS, loyer_m2_appt_t1_t2: null })
    ).toEqual({ loyerM2: 15, typologie: "toutes" });
  });

  it("maison → indicateur maison, sans repli appartement", () => {
    expect(choisirLoyerM2(bien({ typeBien: "maison" }), LOYERS)).toEqual({
      loyerM2: 12,
      typologie: "maison",
    });
    expect(
      choisirLoyerM2(bien({ typeBien: "maison" }), {
        ...LOYERS,
        loyer_m2_maison: null,
      })
    ).toBeNull();
  });
});

describe("alerteDpeLocation (loi Climat & Résilience)", () => {
  it("signale le calendrier d'interdiction", () => {
    expect(alerteDpeLocation("G")).toBe("interdit_depuis_2025");
    expect(alerteDpeLocation("F")).toBe("interdit_2028");
    expect(alerteDpeLocation("E")).toBe("interdit_2034");
    expect(alerteDpeLocation("D")).toBeNull();
    expect(alerteDpeLocation(null)).toBeNull();
  });
});

describe("estimerLocation", () => {
  it("calcule loyer médian et fourchette ±10 % (arrondis à 10 €)", () => {
    const estimation = estimerLocation(bien(), LOYERS)!;
    // 18 €/m² × 45 m² = 810 €
    expect(estimation.loyerMedian).toBe(810);
    expect(estimation.loyerBas).toBe(730); // 729 → 730
    expect(estimation.loyerHaut).toBe(890); // 891 → 890
    expect(estimation.typologie).toBe("t1_t2");
    expect(estimation.confiance).toBe("indicative");
    expect(estimation.millesime).toBe(2025);
  });

  it("applique état général et malus DPE passoire", () => {
    const estimation = estimerLocation(
      bien({ etatGeneral: "a_renover", dpe: "G" }),
      LOYERS
    )!;
    // 810 × (1 − 0,08 − 0,08) = 810 × 0,84 = 680,4 → 680
    expect(estimation.ajustementPct).toBe(-16);
    expect(estimation.loyerMedian).toBe(680);
    expect(estimation.dpeAlerte).toBe("interdit_depuis_2025");
  });

  it("bonus limité à +5 % pour un bien refait à neuf", () => {
    const estimation = estimerLocation(bien({ etatGeneral: "refait_neuf" }), LOYERS)!;
    expect(estimation.ajustementPct).toBe(5);
  });

  it("retourne null sans indicateur ANIL → estimation manuelle", () => {
    expect(estimerLocation(bien(), null)).toBeNull();
    expect(
      estimerLocation(bien({ typeBien: "maison" }), {
        ...LOYERS,
        loyer_m2_maison: null,
      })
    ).toBeNull();
  });
});
