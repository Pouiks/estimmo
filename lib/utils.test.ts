import { describe, expect, it } from "vitest";
import { cn, slugify } from "./utils";

describe("slugify", () => {
  it("retire accents, ponctuation et tirets superflus", () => {
    expect(slugify("Prix de l'immobilier à Saint-Étienne")).toBe(
      "prix-de-l-immobilier-a-saint-etienne"
    );
    expect(slugify("  Côte-d'Or !! ")).toBe("cote-d-or");
    expect(slugify("Nice 06000")).toBe("nice-06000");
    expect(slugify("")).toBe("");
  });
});

describe("cn", () => {
  it("fusionne les classes Tailwind en gardant la dernière", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});
