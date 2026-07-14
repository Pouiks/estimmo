import { describe, expect, it } from "vitest";
import { calculerAjustement } from "./ajustements";
import type { CaracteristiquesBien } from "./types";

function bien(overrides: Partial<CaracteristiquesBien> = {}): CaracteristiquesBien {
  return { typeBien: "appartement", surface: 60, ...overrides };
}

describe("calculerAjustement", () => {
  it("vaut 0 sans information qualitative", () => {
    expect(calculerAjustement(bien())).toBe(0);
  });

  it("applique l'état général", () => {
    expect(calculerAjustement(bien({ etatGeneral: "a_renover" }))).toBe(-0.15);
    expect(calculerAjustement(bien({ etatGeneral: "a_rafraichir" }))).toBe(-0.07);
    expect(calculerAjustement(bien({ etatGeneral: "bon" }))).toBe(0);
    expect(calculerAjustement(bien({ etatGeneral: "refait_neuf" }))).toBe(0.08);
  });

  it("applique l'âge de la cuisine et de la salle de bain", () => {
    expect(calculerAjustement(bien({ ageCuisine: "moins_5" }))).toBe(0.03);
    expect(calculerAjustement(bien({ ageSdb: "plus_20" }))).toBe(-0.04);
    expect(
      calculerAjustement(bien({ ageCuisine: "10_20", ageSdb: "10_20" }))
    ).toBeCloseTo(-0.04);
  });

  it("applique le DPE", () => {
    expect(calculerAjustement(bien({ dpe: "A" }))).toBe(0.05);
    expect(calculerAjustement(bien({ dpe: "D" }))).toBe(0);
    expect(calculerAjustement(bien({ dpe: "G" }))).toBe(-0.12);
    expect(calculerAjustement(bien({ dpe: "ne_sait_pas" }))).toBe(0);
  });

  it("applique les règles d'étage aux appartements", () => {
    expect(calculerAjustement(bien({ etage: 0 }))).toBe(-0.05);
    expect(
      calculerAjustement(
        bien({ etage: 5, ascenseur: true, atouts: ["dernier_etage"] })
      )
    ).toBe(0.05);
    expect(calculerAjustement(bien({ etage: 3, ascenseur: false }))).toBe(-0.03);
    // Étage 1 sans ascenseur : pas de malus
    expect(calculerAjustement(bien({ etage: 1, ascenseur: false }))).toBe(0);
    // Dernier étage SANS ascenseur : pas de bonus, et malus si ≥ 2
    expect(
      calculerAjustement(
        bien({ etage: 4, ascenseur: false, atouts: ["dernier_etage"] })
      )
    ).toBe(-0.03);
  });

  it("ignore les règles d'étage pour les maisons", () => {
    expect(calculerAjustement(bien({ typeBien: "maison", etage: 0 }))).toBe(0);
  });

  it("ne cumule pas les extérieurs (prend le meilleur)", () => {
    expect(calculerAjustement(bien({ exterieur: ["balcon"] }))).toBe(0.03);
    expect(
      calculerAjustement(bien({ exterieur: ["balcon", "terrasse", "jardin"] }))
    ).toBe(0.06);
  });

  it("applique le stationnement", () => {
    expect(calculerAjustement(bien({ stationnement: "place" }))).toBe(0.02);
    expect(calculerAjustement(bien({ stationnement: "garage_box" }))).toBe(0.04);
    expect(calculerAjustement(bien({ stationnement: "aucun" }))).toBe(0);
  });

  it("plafonne la somme à −25 %", () => {
    // −15 −4 −4 −12 −5 = −40 % → plafonné à −25 %
    const pire = bien({
      etatGeneral: "a_renover",
      ageCuisine: "plus_20",
      ageSdb: "plus_20",
      dpe: "G",
      etage: 0,
    });
    expect(calculerAjustement(pire)).toBe(-0.25);
  });

  it("plafonne la somme à +25 % (cas au-dessus du plafond impossible à construire, borne vérifiée)", () => {
    // +8 +3 +3 +5 +5 +6 +4 = +34 % → plafonné à +25 %
    const meilleur = bien({
      etatGeneral: "refait_neuf",
      ageCuisine: "moins_5",
      ageSdb: "moins_5",
      dpe: "B",
      etage: 6,
      ascenseur: true,
      atouts: ["dernier_etage"],
      exterieur: ["jardin"],
      stationnement: "garage_box",
    });
    expect(calculerAjustement(meilleur)).toBe(0.25);
  });
});
