import { describe, expect, it } from "vitest";
import {
  DEPARTEMENTS,
  codeDepuisSlug,
  hrefDepartement,
  nomDepartement,
  slugDepartement,
} from "./departements";

describe("départements", () => {
  it("référentiel complet : 101 départements, Corse et DOM inclus", () => {
    expect(Object.keys(DEPARTEMENTS)).toHaveLength(101);
    expect(nomDepartement("2A")).toBe("Corse-du-Sud");
    expect(nomDepartement("974")).toBe("La Réunion");
    expect(nomDepartement("00")).toBeNull();
  });

  it("slug dérivé du nom français, identique dans toutes les langues", () => {
    expect(slugDepartement("06")).toBe("06-alpes-maritimes");
    expect(slugDepartement("2A")).toBe("2a-corse-du-sud");
    expect(slugDepartement("21")).toBe("21-cote-d-or");
    expect(slugDepartement("999")).toBe("999");
  });

  it("retrouve le code depuis un slug, canonique ou non", () => {
    expect(codeDepuisSlug("06-alpes-maritimes")).toBe("06");
    expect(codeDepuisSlug("06")).toBe("06");
    expect(codeDepuisSlug("2a-corse-du-sud")).toBe("2A");
    expect(codeDepuisSlug("xx-inconnu")).toBeNull();
    expect(codeDepuisSlug("")).toBeNull();
  });

  it("href sans préfixe de langue (le Link i18n l'ajoute)", () => {
    expect(hrefDepartement("75")).toBe("/prix-immobilier/departement/75-paris");
  });
});
