import { describe, expect, it } from "vitest";
import { prenomPropre } from "./template";

describe("prenomPropre", () => {
  it("capitalise le prénom saisi en minuscules", () => {
    expect(prenomPropre("virgile")).toBe("Virgile");
    expect(prenomPropre("  jean-pierre ")).toBe("Jean-Pierre");
    expect(prenomPropre("MARIE LOUISE")).toBe("Marie Louise");
    expect(prenomPropre("élodie")).toBe("Élodie");
  });
});
