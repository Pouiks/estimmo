import { describe, expect, it } from "vitest";
import { normaliserUrlSite } from "./config";

describe("normaliserUrlSite", () => {
  it("garde une URL correcte et retire le slash final", () => {
    expect(normaliserUrlSite("https://www.estimmo-direct.com/")).toBe(
      "https://www.estimmo-direct.com"
    );
  });
  it("répare un schéma mal tapé", () => {
    expect(normaliserUrlSite("htps://estimmo.carenza-brown.com")).toBe(
      "https://estimmo.carenza-brown.com"
    );
    expect(normaliserUrlSite("http:/www.estimmo-direct.com")).toBe(
      "https://www.estimmo-direct.com"
    );
    expect(normaliserUrlSite("www.estimmo-direct.com")).toBe(
      "https://www.estimmo-direct.com"
    );
  });
  it("conserve http pour localhost", () => {
    expect(normaliserUrlSite("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
