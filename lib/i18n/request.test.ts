import { beforeEach, describe, expect, it, vi } from "vitest";

/** next/root-params n'existe qu'au runtime Next : on simule le segment [locale]. */
const segment = vi.fn<() => Promise<string | undefined>>();
vi.mock("next/root-params", () => ({ locale: () => segment() }));
vi.mock("next-intl/server", () => ({
  getRequestConfig: (fabrique: unknown) => fabrique,
}));

type Fabrique = (params: { locale?: string; requestLocale: Promise<string | undefined> }) => Promise<{
  locale: string;
  messages: Record<string, unknown>;
  timeZone: string;
}>;

const fabrique = (await import("./request")).default as unknown as Fabrique;
const appel = (locale?: string) =>
  fabrique({ locale, requestLocale: Promise.resolve(undefined) });

describe("configuration next-intl par requête", () => {
  beforeEach(() => segment.mockReset());

  it("utilise la locale explicite (route handlers, emails) sans lire le segment", async () => {
    const config = await appel("en");
    expect(config.locale).toBe("en");
    expect(config.timeZone).toBe("Europe/Paris");
    expect(Object.keys(config.messages)).toContain("common");
    expect(segment).not.toHaveBeenCalled();
  });

  it("lit le segment [locale] sinon", async () => {
    segment.mockResolvedValue("en");
    expect((await appel()).locale).toBe("en");
    segment.mockResolvedValue("fr");
    expect((await appel()).locale).toBe("fr");
  });

  it("retombe sur le français hors segment (admin) ou pour une valeur inconnue", async () => {
    segment.mockResolvedValue(undefined);
    expect((await appel()).locale).toBe("fr");
    segment.mockResolvedValue("de");
    expect((await appel()).locale).toBe("fr");
  });

  it("charge les messages de la langue demandée", async () => {
    const en = await appel("en");
    const fr = await appel("fr");
    expect((en.messages.nav as { blog: string }).blog).toBe("Blog");
    expect((en.messages.nav as { accueil: string }).accueil).toBe("Home");
    expect((fr.messages.nav as { accueil: string }).accueil).toBe("Accueil");
  });
});
