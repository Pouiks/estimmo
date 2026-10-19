import { describe, expect, it } from "vitest";
import {
  ajouterJours,
  datePublication,
  depuisChampParis,
  instantParis,
  versChampParis,
} from "./planning";

describe("instantParis", () => {
  it("convertit l'heure de Paris en UTC, heure d'été comme d'hiver", () => {
    // 20/10/2026 : heure d'été (UTC+2)
    expect(instantParis("2026-10-20", "07:00").toISOString()).toBe("2026-10-20T05:00:00.000Z");
    // 30/10/2026 : heure d'hiver (UTC+1), le changement a lieu le 25/10
    expect(instantParis("2026-10-30", "07:00").toISOString()).toBe("2026-10-30T06:00:00.000Z");
  });
});

describe("ajouterJours", () => {
  it("franchit les fins de mois et d'année", () => {
    expect(ajouterJours("2026-10-30", 2)).toBe("2026-11-01");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("datePublication", () => {
  it("espace les articles d'un intervalle fixe à heure fixe", () => {
    const plan = [0, 1, 2, 27].map((index) =>
      datePublication({ debut: "2026-10-20", intervalleJours: 2, heure: "07:00", index }).toISOString()
    );
    expect(plan).toEqual([
      "2026-10-20T05:00:00.000Z",
      "2026-10-22T05:00:00.000Z",
      "2026-10-24T05:00:00.000Z",
      "2026-12-13T06:00:00.000Z",
    ]);
  });
});

describe("champ datetime-local de l'admin", () => {
  it("fait l'aller-retour en heure de Paris", () => {
    const instant = new Date("2026-11-03T06:00:00.000Z");
    expect(versChampParis(instant)).toBe("2026-11-03T07:00");
    expect(depuisChampParis("2026-11-03T07:00").toISOString()).toBe(instant.toISOString());
  });
});
