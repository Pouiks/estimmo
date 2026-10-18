import { describe, expect, it } from "vitest";
import { pick } from "./pick";

describe("pick", () => {
  it("ne garde que les namespaces demandés", () => {
    const messages = { a: { x: 1 }, b: { y: 2 }, c: { z: 3 } };
    expect(pick(messages, ["a", "c"])).toEqual({ a: { x: 1 }, c: { z: 3 } });
  });

  it("ignore une clé absente", () => {
    const messages = { a: 1 } as { a: number; b?: number };
    expect(pick(messages, ["a", "b"])).toEqual({ a: 1 });
  });
});
