import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

const correspond = (url: string) =>
  unstable_doesMiddlewareMatch({ config, url: `https://estimmo-direct.com${url}` });

/**
 * Garde-fou : un mauvais échappement dans le matcher (ex. "\." au lieu de
 * "\\.") rend le proxy inactif partout sauf à la racine, sans erreur de build.
 */
describe("matcher du proxy", () => {
  it("couvre la racine, les pages du site et les URL préfixées", () => {
    for (const url of [
      "/",
      "/estimation",
      "/prix-immobilier/nice-06000",
      "/prix-immobilier/departement/06-alpes-maritimes",
      "/en",
      "/en/estimation",
      "/fr/blog",
      "/blog/mon-article",
      "/inconnu",
      "/admin/leads",
      "/admin/login",
    ]) {
      expect(correspond(url), url).toBe(true);
    }
  });

  it("exclut les API, les internes Next/Vercel et les fichiers", () => {
    for (const url of [
      "/api/leads",
      "/api/cron/crm-sync",
      "/_next/static/chunks/main.js",
      "/_next/image?url=x",
      "/_vercel/insights/script.js",
      "/sitemap.xml",
      "/robots.txt",
      "/icon.svg",
      "/favicon.ico",
      "/BingSiteAuth.xml",
    ]) {
      expect(correspond(url), url).toBe(false);
    }
  });
});
