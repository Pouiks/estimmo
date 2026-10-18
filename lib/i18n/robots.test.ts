import { describe, expect, it } from "vitest";
import { estRobot } from "./robots";

describe("estRobot", () => {
  it("reconnaît les robots d'indexation et outils d'audit", () => {
    expect(
      estRobot(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      )
    ).toBe(true);
    expect(estRobot("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(estRobot("Mozilla/5.0 Chrome-Lighthouse")).toBe(true);
    expect(estRobot("facebookexternalhit/1.1")).toBe(true);
    expect(estRobot("DuckDuckBot/1.0")).toBe(true);
  });

  it("laisse passer les navigateurs et curl", () => {
    expect(
      estRobot(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
      )
    ).toBe(false);
    expect(
      estRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")
    ).toBe(false);
    expect(estRobot("curl/8.7.1")).toBe(false);
  });

  it("traite l'absence de User-Agent comme un robot", () => {
    expect(estRobot(null)).toBe(true);
    expect(estRobot(undefined)).toBe(true);
    expect(estRobot("   ")).toBe(true);
  });
});
