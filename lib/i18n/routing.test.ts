import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, estLocale, routing } from "./routing";

describe("routing", () => {
  it("fr est la locale par défaut, servie sans préfixe", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
    expect(routing.defaultLocale).toBe("fr");
    expect(routing.localePrefix).toBe("as-needed");
    expect([...routing.locales]).toEqual([...LOCALES]);
  });

  it("le cookie de langue dure un an et les hreflang ne sont pas posés par le proxy", () => {
    expect(routing.localeCookie).toMatchObject({ maxAge: 60 * 60 * 24 * 365 });
    expect(routing.alternateLinks).toBe(false);
  });

  it("estLocale ne reconnaît que fr et en", () => {
    expect(estLocale("fr")).toBe(true);
    expect(estLocale("en")).toBe(true);
    expect(estLocale("de")).toBe(false);
    expect(estLocale("FR")).toBe(false);
    expect(estLocale(null)).toBe(false);
    expect(estLocale(undefined)).toBe(false);
    expect(estLocale(42)).toBe(false);
  });
});
