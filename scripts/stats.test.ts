import { describe, expect, it } from "vitest";
import { mediane, parseDepartements } from "./stats";

describe("mediane", () => {
  it("interpole comme percentile_cont", () => {
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([1, 2, 3, 4])).toBe(2.5);
    expect(mediane([5])).toBe(5);
    expect(mediane([])).toBeNull();
  });

  it("ne modifie pas le tableau d'entrée", () => {
    const v = [3, 1, 2];
    mediane(v);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe("parseDepartements", () => {
  it("normalise les codes", () => {
    expect(parseDepartements("30, 34,2a,974, 1")).toEqual(["30", "34", "2A", "974", "01"]);
    // PowerShell passe « --depts 30,34 » comme « 30 34 »
    expect(parseDepartements("30 34")).toEqual(["30", "34"]);
  });
});
