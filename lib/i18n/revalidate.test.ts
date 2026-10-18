import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

const { revaliderSite } = await import("./revalidate");

describe("revaliderSite", () => {
  beforeEach(() => revalidatePath.mockClear());

  it("revalide le chemin interne de chaque langue", () => {
    revaliderSite("/blog/mon-article");
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual([
      "/fr/blog/mon-article",
      "/en/blog/mon-article",
    ]);
  });

  it("gère la racine sans double slash", () => {
    revaliderSite("/");
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(["/fr", "/en"]);
  });
});
