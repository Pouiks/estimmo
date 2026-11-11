import { describe, expect, it } from "vitest";
import {
  DEPARTEMENTS_PILOTES,
  SEUIL_VENTES_12M,
  SEUIL_VENTES_36M,
  estIndexable,
  fenetrePour,
  regimeCommune,
} from "./indexation";

const base = {
  departement: "30",
  nb_ventes_12m: 15,
  nb_ventes_36m: 45,
  prix_m2_median_appartement: null,
  prix_m2_median_maison: 2764,
  prix_m2_median_36m_appartement: null,
  prix_m2_median_36m_maison: 2650,
};

describe("regimeCommune", () => {
  it("le Gard et l'Hérault sont pilotes", () => {
    expect(DEPARTEMENTS_PILOTES).toEqual(["30", "34"]);
    expect(regimeCommune(base).pilote).toBe(true);
    expect(regimeCommune({ ...base, departement: "06" }).pilote).toBe(false);
  });

  it("hors pilotes : toujours indexable, fenêtre 12 mois (statu quo)", () => {
    expect(regimeCommune({ ...base, departement: "06", nb_ventes_12m: 2 })).toEqual({
      pilote: false,
      indexable: true,
      fenetre: "12m",
    });
  });

  it("pilote : indexable dès 10 ventes sur 12 mois avec un prix", () => {
    expect(regimeCommune({ ...base, nb_ventes_12m: SEUIL_VENTES_12M })).toEqual({
      pilote: true,
      indexable: true,
      fenetre: "12m",
    });
  });

  it("pilote : sous 10 ventes par an, 36 mois si au moins 30 ventes sur 3 ans", () => {
    const r = regimeCommune({ ...base, nb_ventes_12m: 7, nb_ventes_36m: SEUIL_VENTES_36M });
    expect(r).toEqual({ pilote: true, indexable: true, fenetre: "36m" });
    expect(fenetrePour({ ...base, nb_ventes_12m: 7, nb_ventes_36m: 29 })).toBe("12m");
  });

  it("pilote : trop peu de ventes ou aucun prix → noindex", () => {
    expect(estIndexable({ ...base, nb_ventes_12m: 7, nb_ventes_36m: 20 })).toBe(false);
    expect(
      estIndexable({
        ...base,
        prix_m2_median_maison: null,
        prix_m2_median_36m_maison: null,
      })
    ).toBe(false);
    // Fenêtre 36 mois sans prix sur 36 mois : on retombe sur 12 mois, non indexable.
    expect(
      regimeCommune({
        ...base,
        nb_ventes_12m: 7,
        prix_m2_median_36m_maison: null,
      })
    ).toEqual({ pilote: true, indexable: false, fenetre: "12m" });
  });

  it("colonnes 36 mois absentes (migration non appliquée) : règle 12 mois seule", () => {
    const sans = {
      departement: "34",
      nb_ventes_12m: 7,
      prix_m2_median_appartement: 3000,
      prix_m2_median_maison: null,
    };
    expect(regimeCommune(sans)).toEqual({ pilote: true, indexable: false, fenetre: "12m" });
    expect(regimeCommune({ ...sans, nb_ventes_12m: 12 }).indexable).toBe(true);
  });
});
