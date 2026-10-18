import { reponseXml, sitemapXml, trancheDuFichier } from "@/lib/seo/sitemap";
import { sitemapCommunes, sitemapPagesFixes } from "@/lib/seo/sitemap-source";

export const revalidate = 86400;

/**
 * /sitemaps/pages.xml        pages fixes + départements + blog (fr et en)
 * /sitemaps/communes-N.xml   tranche N des communes (fr et en, hreflang)
 * Le point dans l'URL exclut ces routes du proxy i18n.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fichier: string }> }
) {
  const { fichier } = await params;
  if (fichier === "pages.xml") return reponseXml(sitemapXml(await sitemapPagesFixes()));

  const tranche = trancheDuFichier(fichier);
  if (tranche === null) return new Response("Not found", { status: 404 });
  return reponseXml(sitemapXml(await sitemapCommunes(tranche)));
}
