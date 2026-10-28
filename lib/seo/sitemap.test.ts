import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/config";
import {
  COMMUNES_PAR_SITEMAP,
  alternatesSitemap,
  entreeMonolingue,
  entreeTraduite,
  entreesBilingues,
  nombreTranchesCommunes,
  nomsFichiersSitemap,
  reponseXml,
  sitemapIndexXml,
  sitemapXml,
  trancheCommunes,
  trancheDuFichier,
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
});

describe("entreeMonolingue", () => {
  it("article anglais sous /en, sans alternates", () => {
    const e = entreeMonolingue("/blog/my-post", "en", { priority: 0.6 });
    expect(e.url).toBe(`${base}/en/blog/my-post`);
    expect(e.alternates).toBeUndefined();
  });
});

describe("découpage des communes", () => {
  it("au moins un fichier, puis un par tranche de 20 000", () => {
    expect(nombreTranchesCommunes(0)).toBe(1);
    expect(nombreTranchesCommunes(COMMUNES_PAR_SITEMAP)).toBe(1);
    expect(nombreTranchesCommunes(COMMUNES_PAR_SITEMAP + 1)).toBe(2);
    expect(nombreTranchesCommunes(34_923)).toBe(2);
  });

  it("noms des fichiers : pages puis les tranches", () => {
    expect(nomsFichiersSitemap(34_923)).toEqual([
      "pages.xml",
      "communes-1.xml",
      "communes-2.xml",
    ]);
  });

  it("tranche d'un nom de fichier", () => {
    expect(trancheDuFichier("communes-1.xml")).toBe(1);
    expect(trancheDuFichier("communes-12.xml")).toBe(12);
    expect(trancheDuFichier("communes-0.xml")).toBeNull();
    expect(trancheDuFichier("pages.xml")).toBeNull();
    expect(trancheDuFichier("../etc/passwd")).toBeNull();
    expect(trancheCommunes(1)).toEqual({ debut: 0, fin: 20_000 });
    expect(trancheCommunes(2)).toEqual({ debut: 20_000, fin: 40_000 });
  });

  it("chaque fichier reste sous 50 000 URLs (2 langues)", () => {
    expect(COMMUNES_PAR_SITEMAP * 2).toBeLessThan(50_000);
  });
});

describe("sitemapIndexXml", () => {
  it("liste tous les fichiers", () => {
    const xml = sitemapIndexXml(base, 34_923);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(`<loc>${base}/sitemaps/pages.xml</loc>`);
    expect(xml).toContain(`<loc>${base}/sitemaps/communes-2.xml</loc>`);
    expect(xml).not.toContain("communes-3.xml");
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

describe("entreeTraduite", () => {
  it("relie un article et sa version anglaise par hreflang, x-default sur le français", () => {
    const chemins = { fr: "/blog/frais-de-notaire", en: "/blog/notary-fees" };
    expect(entreeTraduite(chemins, "en", { priority: 0.6 })).toEqual({
      url: `${SITE.url}/en/blog/notary-fees`,
      alternates: {
        languages: {
          fr: `${SITE.url}/blog/frais-de-notaire`,
          en: `${SITE.url}/en/blog/notary-fees`,
          "x-default": `${SITE.url}/blog/frais-de-notaire`,
        },
      },
      priority: 0.6,
    });
  });
});
