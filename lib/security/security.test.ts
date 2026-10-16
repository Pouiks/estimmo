import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { escapeHtml } from "./html";
import { isAuthorizedBearer } from "./secret";

vi.mock("server-only", () => ({}));
const { rateLimit, _resetRateLimit } = await import("./rate-limit");

describe("escapeHtml", () => {
  it("neutralise les balises et attributs", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>Jean & Co</a>`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;Jean &amp; Co&lt;/a&gt;"
    );
  });
  it("tolère null / undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("isAuthorizedBearer", () => {
  it("accepte le bon secret", () => {
    expect(isAuthorizedBearer("Bearer abc", "abc")).toBe(true);
  });
  it("refuse un secret absent, vide ou différent", () => {
    expect(isAuthorizedBearer("Bearer abc", undefined)).toBe(false);
    expect(isAuthorizedBearer("Bearer abc", "")).toBe(false);
    expect(isAuthorizedBearer(null, "abc")).toBe(false);
    expect(isAuthorizedBearer("Bearer abd", "abc")).toBe(false);
    expect(isAuthorizedBearer("Bearer abcd", "abc")).toBe(false);
  });
});

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimit());

  const req = (ip: string) =>
    new NextRequest("http://localhost/api/x", {
      headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
    });

  it("bloque au-delà de la limite, par IP", () => {
    const opts = { scope: "t", limit: 2, windowMs: 60_000 };
    expect(rateLimit(req("1.1.1.1"), opts)).toBeNull();
    expect(rateLimit(req("1.1.1.1"), opts)).toBeNull();
    const blocked = rateLimit(req("1.1.1.1"), opts);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    // Une autre IP n'est pas affectée
    expect(rateLimit(req("2.2.2.2"), opts)).toBeNull();
  });

  it("isole les scopes", () => {
    expect(rateLimit(req("1.1.1.1"), { scope: "a", limit: 1, windowMs: 1000 })).toBeNull();
    expect(rateLimit(req("1.1.1.1"), { scope: "b", limit: 1, windowMs: 1000 })).toBeNull();
    expect(
      rateLimit(req("1.1.1.1"), { scope: "a", limit: 1, windowMs: 1000 })?.status
    ).toBe(429);
  });

  it("réinitialise après la fenêtre", () => {
    vi.useFakeTimers();
    const opts = { scope: "w", limit: 1, windowMs: 1000 };
    expect(rateLimit(req("3.3.3.3"), opts)).toBeNull();
    expect(rateLimit(req("3.3.3.3"), opts)?.status).toBe(429);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(req("3.3.3.3"), opts)).toBeNull();
    vi.useRealTimers();
  });
});
