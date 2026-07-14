import { describe, expect, it } from "vitest";
import { deptFromInsee, isZoneNonCouverte } from "./zones";

describe("deptFromInsee", () => {
  it("extrait le département métropolitain", () => {
    expect(deptFromInsee("75056")).toBe("75"); // Paris
    expect(deptFromInsee("06088")).toBe("06"); // Nice
  });

  it("gère la Corse et les DOM", () => {
    expect(deptFromInsee("2A004")).toBe("2A"); // Ajaccio
    expect(deptFromInsee("97411")).toBe("974"); // Saint-Denis (La Réunion)
    expect(deptFromInsee("97608")).toBe("976"); // Mamoudzou (Mayotte)
  });
});

describe("isZoneNonCouverte (fallback estimation manuelle)", () => {
  it("Alsace-Moselle et Mayotte ne sont pas couverts par DVF", () => {
    expect(isZoneNonCouverte("67482")).toBe(true); // Strasbourg (Bas-Rhin)
    expect(isZoneNonCouverte("68224")).toBe(true); // Mulhouse (Haut-Rhin)
    expect(isZoneNonCouverte("57463")).toBe(true); // Metz (Moselle)
    expect(isZoneNonCouverte("97608")).toBe(true); // Mayotte
  });

  it("le reste de la France est couvert", () => {
    expect(isZoneNonCouverte("06088")).toBe(false); // Nice
    expect(isZoneNonCouverte("75056")).toBe(false); // Paris
    expect(isZoneNonCouverte("69123")).toBe(false); // Lyon (69 ≠ 68 !)
    expect(isZoneNonCouverte("2B033")).toBe(false); // Bastia
    expect(isZoneNonCouverte("97411")).toBe(false); // La Réunion
  });
});
