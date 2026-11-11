import { describe, expect, it } from "vitest";
import { DEPARTEMENTS } from "./departements";
import {
  REGIONS,
  coherenceRegions,
  hrefRegion,
  regionDepuisSlug,
  regionDuDepartement,
  slugRegion,
} from "./regions";

describe("régions", () => {
  it("18 régions couvrant exactement les 101 départements", () => {
    expect(REGIONS).toHaveLength(18);
    expect(coherenceRegions()).toEqual({ sansRegion: [], inconnus: [] });
    const total = REGIONS.reduce((n, r) => n + r.departements.length, 0);
    expect(total).toBe(Object.keys(DEPARTEMENTS).length);
  });

  it("Gard et Hérault en Occitanie, Corse-du-Sud en Corse", () => {
    expect(regionDuDepartement("30")?.nom).toBe("Occitanie");
    expect(regionDuDepartement("34")?.nom).toBe("Occitanie");
    expect(regionDuDepartement("2A")?.nom).toBe("Corse");
    expect(regionDuDepartement("99")).toBeNull();
  });

  it("slug et href stables, retrouvés depuis le slug", () => {
    const paca = regionDuDepartement("06")!;
    expect(slugRegion(paca)).toBe("provence-alpes-cote-d-azur");
    expect(hrefRegion(paca)).toBe("/prix-immobilier/region/provence-alpes-cote-d-azur");
    expect(regionDepuisSlug("occitanie")?.code).toBe("76");
    expect(regionDepuisSlug("ile-de-france")?.departements).toContain("75");
    expect(regionDepuisSlug("nulle-part")).toBeNull();
  });
});
