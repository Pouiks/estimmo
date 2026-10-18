import { describe, expect, it } from "vitest";
import { localeDeParams } from "./server";

describe("localeDeParams", () => {
  it("renvoie la locale du segment quand elle est connue", async () => {
    await expect(localeDeParams(Promise.resolve({ locale: "en" }))).resolves.toBe("en");
    await expect(localeDeParams(Promise.resolve({ locale: "fr" }))).resolves.toBe("fr");
  });

  it("déclenche la 404 de Next pour une locale inconnue", async () => {
    // notFound() de next/navigation lève une erreur portant le digest 404.
    await expect(localeDeParams(Promise.resolve({ locale: "de" }))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });
});
