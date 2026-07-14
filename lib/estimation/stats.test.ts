import { describe, expect, it } from "vitest";
import { arrondi, clamp, iqr, moisEntre, quantile, weightedMedian } from "./stats";

describe("weightedMedian", () => {
  it("retourne la valeur unique", () => {
    expect(weightedMedian([{ value: 42, weight: 1 }])).toBe(42);
  });

  it("se comporte comme une médiane classique à poids égaux", () => {
    const items = [1, 2, 3, 4, 5].map((v) => ({ value: v, weight: 1 }));
    expect(weightedMedian(items)).toBe(3);
  });

  it("est tirée par les fortes pondérations", () => {
    const items = [
      { value: 1000, weight: 0.1 },
      { value: 2000, weight: 0.1 },
      { value: 5000, weight: 5 },
      { value: 5200, weight: 5 },
    ];
    expect(weightedMedian(items)).toBe(5000);
  });

  it("refuse une liste vide", () => {
    expect(() => weightedMedian([])).toThrow();
  });
});

describe("quantile / iqr", () => {
  it("calcule les quartiles avec interpolation", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(quantile(values, 0.5)).toBe(4.5);
    expect(quantile(values, 0.25)).toBe(2.75);
    expect(quantile(values, 0.75)).toBe(6.25);
    expect(iqr(values)).toBe(3.5);
  });

  it("gère les extrêmes", () => {
    expect(quantile([5, 10], 0)).toBe(5);
    expect(quantile([5, 10], 1)).toBe(10);
  });
});

describe("clamp / arrondi / moisEntre", () => {
  it("clamp borne dans les deux sens", () => {
    expect(clamp(0.4, -0.25, 0.25)).toBe(0.25);
    expect(clamp(-0.4, -0.25, 0.25)).toBe(-0.25);
    expect(clamp(0.1, -0.25, 0.25)).toBe(0.1);
  });

  it("arrondi au pas demandé", () => {
    expect(arrondi(123_456, 1000)).toBe(123_000);
    expect(arrondi(123_500, 1000)).toBe(124_000);
    expect(arrondi(742.5, 10)).toBe(740);
  });

  it("moisEntre mesure l'ancienneté en mois", () => {
    const now = new Date("2026-07-01");
    expect(moisEntre("2026-07-01", now)).toBe(0);
    expect(moisEntre("2025-07-01", now)).toBeCloseTo(12, 0);
    // Jamais négatif (mutation « dans le futur » par erreur de données)
    expect(moisEntre("2027-01-01", now)).toBe(0);
  });
});
