import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { formats } from "./formats";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

describe("formats partagés", () => {
  it("devise sans décimales dans les deux langues", () => {
    const fr = createFormatter({ locale: "fr", formats });
    const en = createFormatter({ locale: "en", formats });
    expect(nbsp(fr.number(245000, "currency"))).toBe("245 000 €");
    expect(en.number(245000, "currency")).toBe("€245,000");
  });

  it("évolution signée à une décimale", () => {
    const fr = createFormatter({ locale: "fr", formats });
    expect(fr.number(3.26, "evolution")).toBe("+3,3");
    expect(fr.number(-1.4, "evolution")).toBe("-1,4");
    expect(fr.number(0, "evolution")).toBe("0");
  });

  it("dates longues localisées en Europe/Paris", () => {
    const d = new Date("2026-10-18T12:00:00Z");
    const fr = createFormatter({
      locale: "fr",
      formats,
      timeZone: "Europe/Paris",
    });
    const en = createFormatter({
      locale: "en",
      formats,
      timeZone: "Europe/Paris",
    });
    expect(fr.dateTime(d, "long")).toBe("18 octobre 2026");
    expect(en.dateTime(d, "long")).toBe("October 18, 2026");
    expect(fr.dateTime(d, "monthYear")).toBe("octobre 2026");
  });
});
