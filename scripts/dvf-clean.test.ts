import { describe, expect, it } from "vitest";
import {
  accumulateRow,
  finalizeGroup,
  type DvfRawRow,
  type MutationGroup,
} from "./dvf-clean";

function makeRow(overrides: Partial<DvfRawRow> = {}): DvfRawRow {
  return {
    id_mutation: "2024-1",
    date_mutation: "2024-03-15",
    nature_mutation: "Vente",
    valeur_fonciere: "250000",
    code_postal: "06000",
    code_commune: "06088",
    nom_commune: "Nice",
    code_departement: "06",
    type_local: "Appartement",
    surface_reelle_bati: "62",
    nombre_pieces_principales: "3",
    longitude: "7.265252",
    latitude: "43.703126",
    ...overrides,
  };
}

function processRows(rows: DvfRawRow[]) {
  const groups = new Map<string, MutationGroup>();
  for (const row of rows) accumulateRow(groups, row);
  return [...groups.values()].map(finalizeGroup);
}

describe("accumulateRow + finalizeGroup", () => {
  it("garde une vente simple d'appartement et la normalise", () => {
    const [result] = processRows([makeRow()]);
    expect(result).toEqual({
      row: {
        date_mutation: "2024-03-15",
        valeur_fonciere: 250000,
        type_local: "appartement",
        surface_reelle_bati: 62,
        nb_pieces: 3,
        code_insee: "06088",
        code_departement: "06",
        code_postal: "06000",
        nom_commune: "Nice",
        lon: 7.265252,
        lat: 43.703126,
      },
    });
  });

  it("dédoublonne les lignes répétées d'un même local (multi-parcelles)", () => {
    const [result] = processRows([makeRow(), makeRow(), makeRow()]);
    expect(result).toHaveProperty("row");
  });

  it("ignore les dépendances vendues avec le logement", () => {
    const [result] = processRows([
      makeRow(),
      makeRow({ type_local: "Dépendance", surface_reelle_bati: "" }),
    ]);
    expect(result).toHaveProperty("row");
  });

  it("exclut les mutations avec local commercial (hétérogènes)", () => {
    const [result] = processRows([
      makeRow(),
      makeRow({ type_local: "Local industriel. commercial ou assimilé" }),
    ]);
    expect(result).toEqual({ excluded: "local_non_habitation" });
  });

  it("exclut les mutations multi-logements (prix global non attribuable)", () => {
    const [result] = processRows([
      makeRow(),
      makeRow({ surface_reelle_bati: "45", nombre_pieces_principales: "2" }),
    ]);
    expect(result).toEqual({ excluded: "multi_logements" });

    const [mixte] = processRows([
      makeRow(),
      makeRow({ type_local: "Maison", surface_reelle_bati: "120" }),
    ]);
    expect(mixte).toEqual({ excluded: "multi_logements" });
  });

  it("exclut les natures autres que Vente (VEFA, échange, adjudication)", () => {
    const [result] = processRows([
      makeRow({ nature_mutation: "Vente en l'état futur d'achèvement" }),
    ]);
    expect(result).toEqual({ excluded: "nature" });
  });

  it("exclut les mutations sans logement (terrains nus)", () => {
    const [result] = processRows([
      makeRow({ type_local: "", surface_reelle_bati: "" }),
    ]);
    expect(result).toEqual({ excluded: "aucun_logement" });
  });

  it("applique les bornes de valeur foncière (5 000 € – 10 M€)", () => {
    const [tropBas] = processRows([makeRow({ valeur_fonciere: "3000" })]);
    expect(tropBas).toEqual({ excluded: "valeur" });

    const [tropHaut] = processRows([makeRow({ valeur_fonciere: "12000000" })]);
    expect(tropHaut).toEqual({ excluded: "valeur" });

    const [absente] = processRows([makeRow({ valeur_fonciere: "" })]);
    expect(absente).toEqual({ excluded: "valeur" });
  });

  it("applique les bornes de surface (8 – 500 m²)", () => {
    const [tropPetit] = processRows([makeRow({ surface_reelle_bati: "6" })]);
    expect(tropPetit).toEqual({ excluded: "surface" });

    const [tropGrand] = processRows([makeRow({ surface_reelle_bati: "620" })]);
    expect(tropGrand).toEqual({ excluded: "surface" });
  });

  it("applique les bornes anti-aberrations de prix/m² (200 – 25 000 €)", () => {
    // 900 000 € pour 30 m² = 30 000 €/m²
    const [tropCher] = processRows([
      makeRow({ valeur_fonciere: "900000", surface_reelle_bati: "30" }),
    ]);
    expect(tropCher).toEqual({ excluded: "prix_m2" });

    // 20 000 € pour 200 m² = 100 €/m²
    const [tropDonne] = processRows([
      makeRow({ valeur_fonciere: "20000", surface_reelle_bati: "200" }),
    ]);
    expect(tropDonne).toEqual({ excluded: "prix_m2" });
  });

  it("exclut les mutations sans coordonnées", () => {
    const [result] = processRows([makeRow({ longitude: "", latitude: "" })]);
    expect(result).toEqual({ excluded: "coords" });
  });

  it("traite des mutations distinctes indépendamment", () => {
    const results = processRows([
      makeRow({ id_mutation: "2024-1" }),
      makeRow({ id_mutation: "2024-2", type_local: "Maison" }),
      makeRow({ id_mutation: "2024-3", valeur_fonciere: "1000" }),
    ]);
    expect(results.filter((r) => "row" in r)).toHaveLength(2);
    expect(results.filter((r) => "excluded" in r)).toHaveLength(1);
  });
});
