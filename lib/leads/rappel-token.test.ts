import { afterEach, describe, expect, it, vi } from "vitest";
import { rappelToken, verifyRappelToken } from "./rappel-token";

describe("jetons de rappel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signe et vérifie un jeton pour un lead donné", () => {
    vi.stubEnv("CRON_SECRET", "secret-de-test");
    const token = rappelToken("lead-1");
    expect(token).toHaveLength(24);
    expect(verifyRappelToken("lead-1", token)).toBe(true);
    expect(verifyRappelToken("lead-2", token)).toBe(false);
    expect(verifyRappelToken("lead-1", token.slice(1))).toBe(false);
    expect(verifyRappelToken("lead-1", "x".repeat(24))).toBe(false);
  });

  it("change de jeton quand le secret change", () => {
    vi.stubEnv("CRON_SECRET", "a");
    const a = rappelToken("lead-1");
    vi.stubEnv("CRON_SECRET", "b");
    expect(rappelToken("lead-1")).not.toBe(a);
  });

  it("tolère l'absence de secret hors production, la refuse en production", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(verifyRappelToken("lead-1", rappelToken("lead-1"))).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(() => rappelToken("lead-1")).toThrow(/CRON_SECRET/);
    expect(verifyRappelToken("lead-1", "x".repeat(24))).toBe(false);
  });
});
