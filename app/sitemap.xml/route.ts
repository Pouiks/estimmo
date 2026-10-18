import { SITE } from "@/lib/config";
import { reponseXml, sitemapIndexXml } from "@/lib/seo/sitemap";
import { nombreCommunes } from "@/lib/seo/sitemap-source";

export const revalidate = 86400;

/**
 * Index des sitemaps : /sitemap.xml reste l'URL déclarée dans robots.txt et
 * la Search Console. Les fichiers listés sont servis par
 * app/sitemaps/[fichier]/route.ts.
 */
export async function GET() {
  return reponseXml(sitemapIndexXml(SITE.url, await nombreCommunes()));
}
