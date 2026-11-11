import { describe, expect, it } from "vitest";
import {
  droitsMutation,
  emolumentsNotaire,
  fourchetteFraisNotaire,
  fraisNotaire,
} from "./frais-notaire";

describe("frais de notaire (indicatifs)", () => {
  it("applique le barème des émoluments par tranches, TVA comprise", () => {
    // 200 000 € : 6 500 × 3,87 % + 10 500 × 1,596 % + 43 000 × 1,064 % + 140 000 × 0,799 %
    // = 251,55 + 167,58 + 457,52 + 1 118,60 = 1 995,25 € HT → 2 394,30 € TTC
    expect(emolumentsNotaire(200_000)).toBeCloseTo(2394.3, 1);
    // Petit prix : une seule tranche
    expect(emolumentsNotaire(5_000)).toBeCloseTo(5_000 * 0.0387 * 1.2, 2);
    expect(emolumentsNotaire(0)).toBe(0);
  });

  it("calcule les droits de mutation à 4,5 % et à 5 %", () => {
    // 4,5 % × 1,0237 + 1,2 % = 5,80665 %
    expect(droitsMutation(100_000, 0.045)).toBeCloseTo(5806.65, 1);
    // 5 % × 1,0237 + 1,2 % = 6,3185 %
    expect(droitsMutation(100_000, 0.05)).toBeCloseTo(6318.5, 1);
  });

  it("donne un total de l'ordre de 7 à 8 % dans l'ancien", () => {
    const bas = fraisNotaire(200_000, 0.045, 800);
    const haut = fraisNotaire(200_000, 0.05, 1400);
    expect(bas / 200_000).toBeGreaterThan(0.07);
    expect(haut / 200_000).toBeLessThan(0.085);
    expect(haut).toBeGreaterThan(bas);
    expect(fraisNotaire(0, 0.045, 800)).toBe(0);
    expect(fraisNotaire(Number.NaN, 0.045, 800)).toBe(0);
  });

  it("produit une fourchette couvrante arrondie à la centaine", () => {
    const f = fourchetteFraisNotaire(180_000, 220_000);
    expect(f).not.toBeNull();
    expect(f!.bas % 100).toBe(0);
    expect(f!.haut % 100).toBe(0);
    expect(f!.bas).toBeLessThanOrEqual(fraisNotaire(180_000, 0.045, 800));
    expect(f!.haut).toBeGreaterThanOrEqual(fraisNotaire(220_000, 0.05, 1400));
    expect(f!.pctBas).toBeGreaterThan(6.5);
    expect(f!.pctHaut).toBeLessThan(9);
  });

  it("refuse une fourchette invalide", () => {
    expect(fourchetteFraisNotaire(0, 100_000)).toBeNull();
    expect(fourchetteFraisNotaire(200_000, 100_000)).toBeNull();
  });
});
