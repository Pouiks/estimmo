import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/config";
import {
  GABARIT_COMMUNE_MODIFIE_LE,
  alternatesSitemap,
  departementDuFichier,
  entreeMonolingue,
  entreesBilingues,
  lastmodCommune,
  nomFichierCommunes,
  nomsFichiersSitemap,
  reponseXml,
  sitemapIndexXml,
  sitemapXml,
} from "./sitemap";

const base = SITE.url;

describe("entreesBilingues", () => {
  it("produit une entrée par langue, chacune avec tous les alternates", () => {
    const entrees = entreesBilingues("/prix-immobilier/nice-06000", {
      changeFrequency: "weekly",
      priority: 0.7,
    });
    expect(entrees.map((e) => e.url)).toEqual([
      `${base}/prix-immobilier/nice-06000`,
      `${base}/en/prix-immobilier/nice-06000`,
    ]);
    for (const e of entrees) {
      expect(e.alternates).toEqual({
        languages: {
          fr: `${base}/prix-immobilier/nice-06000`,
          en: `${base}/en/prix-immobilier/nice-06000`,
          "x-default": `${base}/prix-immobilier/nice-06000`,
        },
      });
      expect(e.priority).toBe(0.7);
    }
  });

  it("gère la racine", () => {
    expect(entreesBilingues("/", { priority: 1 }).map((e) => e.url)).toEqual([
      base,
      `${base}/en`,
    ]);
    expect(alternatesSitemap("/").languages?.["x-default"]).toBe(base);
  });

  it("accepte un chemin par langue (article au slug anglais propre)", () => {
    const entrees = entreesBilingues(
      { fr: "/blog/frais-de-notaire", en: "/blog/notary-fees" },
      { priority: 0.6 }
    );
    expect(entrees.map((e) => e.url)).toEqual([
      `${base}/blog/frais-de-notaire`,
      `${base}/en/blog/notary-fees`,
    ]);
    for (const e of entrees) {
      expect(e.alternates).toEqual({
        languages: {
          fr: `${base}/blog/frais-de-notaire`,
          en: `${base}/en/blog/notary-fees`,
          "x-default": `${base}/blog/frais-de-notaire`,
        },
      });
    }
  });
});

describe("entreeMonolingue", () => {
  it("article sans version anglaise : URL française seule, sans alternates", () => {
    const e = entreeMonolingue("/blog/mon-article", "fr", { priority: 0.6 });
    expect(e.url).toBe(`${base}/blog/mon-article`);
    expect(e.alternates).toBeUndefined();
  });
});

describe("découpage des communes par département", () => {
  it("un fichier par département connu, en minuscules", () => {
    expect(nomFichierCommunes("30")).toBe("communes-30.xml");
    expect(nomFichierCommunes("2A")).toBe("communes-2a.xml");
    expect(nomsFichiersSitemap(["01", "2A", "30", "999", "XX"])).toEqual([
      "pages.xml",
      "communes-01.xml",
      "communes-2a.xml",
      "communes-30.xml",
    ]);
  });

  it("département d'un nom de fichier", () => {
    expect(departementDuFichier("communes-30.xml")).toBe("30");
    expect(departementDuFichier("communes-2a.xml")).toBe("2A");
    expect(departementDuFichier("communes-974.xml")).toBe("974");
    expect(departementDuFichier("communes-1.xml")).toBeNull();
    expect(departementDuFichier("communes-99.xml")).toBeNull();
    expect(departementDuFichier("pages.xml")).toBeNull();
    expect(departementDuFichier("../etc/passwd")).toBeNull();
  });

  it("lastmod réel : chiffres de la commune ou gabarit, le plus récent", () => {
    const avant = new Date(GABARIT_COMMUNE_MODIFIE_LE.getTime() - 86_400_000);
    const apres = new Date(GABARIT_COMMUNE_MODIFIE_LE.getTime() + 86_400_000);
    expect(lastmodCommune(avant.toISOString())).toEqual(GABARIT_COMMUNE_MODIFIE_LE);
    expect(lastmodCommune(apres)).toEqual(apres);
  });
});

describe("sitemapIndexXml", () => {
  it("liste pages.xml puis les départements présents en base", () => {
    const xml = sitemapIndexXml(base, ["30", "34"]);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(`<loc>${base}/sitemaps/pages.xml</loc>`);
    expect(xml).toContain(`<loc>${base}/sitemaps/communes-30.xml</loc>`);
    expect(xml).toContain(`<loc>${base}/sitemaps/communes-34.xml</loc>`);
    expect(xml).not.toContain("communes-1.xml");
  });
});

describe("sitemapXml", () => {
  it("sérialise loc, lastmod, changefreq, priority et les xhtml:link", () => {
    const xml = sitemapXml(
      entreesBilingues("/prix-immobilier/nice-06000", {
        lastModified: new Date("2026-10-01T00:00:00Z"),
        changeFrequency: "weekly",
        priority: 0.7,
      })
    );
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
    expect(xml).toContain(`<loc>${base}/en/prix-immobilier/nice-06000</loc>`);
    expect(xml).toContain("<lastmod>2026-10-01T00:00:00.000Z</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${base}/prix-immobilier/nice-06000"/>`
    );
    expect((xml.match(/hreflang="en"/g) ?? []).length).toBe(2);
  });

  it("échappe les caractères spéciaux des URL", () => {
    const xml = sitemapXml([{ url: `${base}/a?b=1&c=2` }]);
    expect(xml).toContain("&amp;c=2");
  });

  it("ajoute les images de la page (sitemap images Google)", () => {
    const xml = sitemapXml([{ url: `${base}/blog/x`, images: ["https://cdn.test/a.webp"] }]);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain("<image:image><image:loc>https://cdn.test/a.webp</image:loc></image:image>");
  });

  it("réponse XML avec le bon content-type", async () => {
    const res = reponseXml("<x/>");
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(await res.text()).toBe("<x/>");
  });
});

