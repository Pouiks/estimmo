import { describe, expect, it } from "vitest";
import type { CaracteristiquesBien, Comparable } from "./types";
import {
  choisirPalier,
  estimerVente,
  poidsComparable,
  type ComparablesParPalier,
} from "./vente";

const NOW = new Date("2026-07-01");

/** Fabrique un comparable daté de `moisAge` mois avant NOW. */
function comp(
  prixM2: number,
  distanceM: number,
  moisAge = 6,
  surface = 60
): Comparable {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - moisAge);
  return {
    prix_m2: prixM2,
    surface_reelle_bati: surface,
    date_mutation: d.toISOString().slice(0, 10),
    distance_m: distanceM,
  };
}

function palier(input: Partial<ComparablesParPalier>): ComparablesParPalier {
  return { rayon3000: [], commune: [], departement: [], ...input };
}

function bien(overrides: Partial<CaracteristiquesBien> = {}): CaracteristiquesBien {
  return { typeBien: "appartement", surface: 62, ...overrides };
}

describe("choisirPalier", () => {
  it("s'arrête au premier rayon avec ≥ 8 comparables", () => {
    const rayon3000 = Array.from({ length: 10 }, () => comp(4500, 350));
    const result = choisirPalier(palier({ rayon3000 }));
    expect(result?.palier).toEqual({ type: "rayon", rayonM: 400 });
    expect(result?.retenus).toHaveLength(10);
  });

  it("élargit au rayon suivant si insuffisant", () => {
    const rayon3000 = [
      ...Array.from({ length: 5 }, () => comp(4500, 300)),
      ...Array.from({ length: 4 }, () => comp(4300, 700)),
    ];
    const result = choisirPalier(palier({ rayon3000 }));
    expect(result?.palier).toEqual({ type: "rayon", rayonM: 800 });
    expect(result?.retenus).toHaveLength(9);
  });

  it("passe à la commune quand les rayons échouent", () => {
    const result = choisirPalier(
      palier({
        rayon3000: Array.from({ length: 3 }, () => comp(2000, 2500)),
        commune: Array.from({ length: 9 }, () => comp(2100, 4000)),
      })
    );
    expect(result?.palier).toEqual({ type: "commune" });
  });

  it("passe au département quand la commune échoue", () => {
    const result = choisirPalier(
      palier({
        commune: Array.from({ length: 4 }, () => comp(1800, 5000)),
        departement: Array.from({ length: 15 }, () => comp(1700, 20000)),
      })
    );
    expect(result?.palier).toEqual({ type: "departement" });
  });

  it("retourne null si aucun palier n'atteint 8 → estimation manuelle", () => {
    const result = choisirPalier(
      palier({
        rayon3000: [comp(2000, 500)],
        commune: Array.from({ length: 5 }, () => comp(2000, 3000)),
        departement: Array.from({ length: 7 }, () => comp(1900, 30000)),
      })
    );
    expect(result).toBeNull();
  });
});

describe("poidsComparable", () => {
  it("pénalise la distance et l'ancienneté", () => {
    const procheRecent = poidsComparable(comp(4000, 100, 1), NOW);
    const procheAncien = poidsComparable(comp(4000, 100, 24), NOW);
    const loinRecent = poidsComparable(comp(4000, 2900, 1), NOW);
    expect(procheRecent).toBeGreaterThan(procheAncien);
    expect(procheRecent).toBeGreaterThan(loinRecent);
  });

  it("suit la formule 1/(1+d_km) × 1/(1+mois/12)", () => {
    // 1 000 m et ~12 mois → 1/2 × 1/2 = 0,25
    const poids = poidsComparable(comp(4000, 1000, 12), NOW);
    expect(poids).toBeCloseTo(0.25, 1);
  });
});

describe("estimerVente", () => {
  it("cas dense (type Nice) : ≥15 comparables proches → confiance haute", () => {
    const rayon3000 = [
      ...Array.from({ length: 8 }, (_, i) => comp(4400 + i * 25, 150 + i * 20, 3)),
      ...Array.from({ length: 8 }, (_, i) => comp(4550 + i * 25, 250 + i * 15, 9)),
    ];
    const estimation = estimerVente(bien(), palier({ rayon3000 }), NOW);

    expect(estimation).not.toBeNull();
    expect(estimation!.palier).toBe("rayon");
    expect(estimation!.rayonM).toBe(400);
    expect(estimation!.nbComparables).toBe(16);
    expect(estimation!.confiance).toBe("haute");
    // ~4 500 €/m² × 62 m² ≈ 280 000 €
    expect(estimation!.mediane).toBeGreaterThan(250_000);
    expect(estimation!.mediane).toBeLessThan(310_000);
    expect(estimation!.fourchetteBasse).toBeLessThan(estimation!.mediane);
    expect(estimation!.fourchetteHaute).toBeGreaterThan(estimation!.mediane);
    // Cluster serré → fourchette resserrée
    expect(estimation!.fourchettePct).toBe(5);
    // Arrondis au millier
    expect(estimation!.mediane % 1000).toBe(0);
  });

  it("ville moyenne : 9 comparables à ~1,2 km → confiance moyenne", () => {
    const rayon3000 = Array.from({ length: 9 }, (_, i) =>
      comp(2300 + i * 40, 1100 + i * 30, 8)
    );
    const estimation = estimerVente(bien({ surface: 80 }), palier({ rayon3000 }), NOW);
    expect(estimation!.rayonM).toBe(1500);
    expect(estimation!.confiance).toBe("moyenne");
  });

  it("rural : comparables au niveau commune → confiance faible, rayon null", () => {
    const estimation = estimerVente(
      bien({ typeBien: "maison", surface: 100 }),
      palier({
        rayon3000: Array.from({ length: 2 }, () => comp(1500, 2000)),
        commune: Array.from({ length: 8 }, (_, i) => comp(1400 + i * 50, 4500, 12)),
      }),
      NOW
    );
    expect(estimation!.palier).toBe("commune");
    expect(estimation!.rayonM).toBeNull();
    expect(estimation!.confiance).toBe("faible");
  });

  it("retourne null quand aucun palier ne suffit (→ estimation manuelle)", () => {
    expect(estimerVente(bien(), palier({}), NOW)).toBeNull();
  });

  it("la médiane pondérée privilégie les ventes proches et récentes", () => {
    const rayon3000 = [
      ...Array.from({ length: 10 }, () => comp(3000, 2900, 24)),
      ...Array.from({ length: 10 }, () => comp(5000, 100, 2)),
    ];
    const estimation = estimerVente(bien({ surface: 50 }), palier({ rayon3000 }), NOW);
    expect(estimation!.prixM2Zone).toBe(5000);
  });

  it("applique les ajustements qualitatifs sur le prix/m²", () => {
    const rayon3000 = Array.from({ length: 12 }, () => comp(4000, 300, 6));
    const base = estimerVente(bien(), palier({ rayon3000 }), NOW)!;
    const ajuste = estimerVente(
      bien({
        etatGeneral: "refait_neuf", // +8
        dpe: "B", // +5
        exterieur: ["terrasse"], // +5
        stationnement: "garage_box", // +4
      }),
      palier({ rayon3000 }),
      NOW
    )!;
    expect(ajuste.ajustementPct).toBe(22);
    expect(ajuste.prixM2Ajuste).toBeCloseTo(4000 * 1.22, 0);
    expect(ajuste.mediane).toBeGreaterThan(base.mediane);
    expect(base.prixM2Zone).toBe(ajuste.prixM2Zone); // le prix de zone ne bouge pas
  });

  it("plafonne l'ajustement cumulé à −25 %", () => {
    const rayon3000 = Array.from({ length: 12 }, () => comp(4000, 300, 6));
    const estimation = estimerVente(
      bien({
        etatGeneral: "a_renover",
        ageCuisine: "plus_20",
        ageSdb: "plus_20",
        dpe: "G",
        etage: 0,
      }),
      palier({ rayon3000 }),
      NOW
    )!;
    expect(estimation.ajustementPct).toBe(-25);
    expect(estimation.prixM2Ajuste).toBe(3000);
  });

  it("élargit la fourchette quand la dispersion est forte", () => {
    const rayon3000 = Array.from({ length: 16 }, (_, i) =>
      comp(2000 + i * 400, 300, 6) // 2 000 → 8 000 €/m²
    );
    const estimation = estimerVente(bien(), palier({ rayon3000 }), NOW)!;
    expect(estimation.fourchettePct).toBe(10);
  });
});
