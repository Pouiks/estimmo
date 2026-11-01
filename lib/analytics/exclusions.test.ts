import { describe, expect, it } from "vitest";
import {
  COOKIE_SANS_SUIVI,
  cookieSansSuivi,
  ipExclue,
  listeIps,
  normaliserIp,
} from "./exclusions";

describe("exclusion par IP", () => {
  it("lit une liste séparée par virgules, points-virgules ou espaces", () => {
    expect(listeIps("1.2.3.4, 5.6.7.8;9.9.9.9\n2001:db8::1")).toEqual([
      "1.2.3.4",
      "5.6.7.8",
      "9.9.9.9",
      "2001:db8::1",
    ]);
    expect(listeIps("")).toEqual([]);
    expect(listeIps(undefined)).toEqual([]);
    expect(listeIps(" , ")).toEqual([]);
  });

  it("normalise les IPv4 encapsulées et la casse", () => {
    expect(normaliserIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(normaliserIp(" 2001:DB8::1 ")).toBe("2001:db8::1");
  });

  it("ipExclue : correspondance exacte seulement", () => {
    expect(ipExclue("1.2.3.4", "1.2.3.4, 5.6.7.8")).toBe(true);
    expect(ipExclue("::ffff:5.6.7.8", "5.6.7.8")).toBe(true);
    expect(ipExclue("1.2.3.40", "1.2.3.4")).toBe(false);
    expect(ipExclue("1.2.3.4", undefined)).toBe(false);
    expect(ipExclue("unknown", "")).toBe(false);
  });
});

describe("exclusion par cookie", () => {
  it("détecte estimmo_sans_suivi=1 parmi d'autres cookies", () => {
    expect(cookieSansSuivi(`NEXT_LOCALE=fr; ${COOKIE_SANS_SUIVI}=1; sb-x=abc=def`)).toBe(true);
    expect(cookieSansSuivi(`${COOKIE_SANS_SUIVI}=1`)).toBe(true);
    expect(cookieSansSuivi(`${COOKIE_SANS_SUIVI}=0`)).toBe(false);
    expect(cookieSansSuivi(`autre_${COOKIE_SANS_SUIVI}=1`)).toBe(false);
    expect(cookieSansSuivi("NEXT_LOCALE=en")).toBe(false);
    expect(cookieSansSuivi("")).toBe(false);
    expect(cookieSansSuivi(null)).toBe(false);
  });
});
