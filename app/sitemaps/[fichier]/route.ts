import { departementDuFichier, reponseXml, sitemapXml } from "@/lib/seo/sitemap";
import { sitemapCommunes, sitemapPagesFixes } from "@/lib/seo/sitemap-source";

export const revalidate = 86400;

/**
 * /sitemaps/pages.xml            pages fixes + départements + blog (fr et en)
 * /sitemaps/communes-<dept>.xml  communes du département (ex. communes-30.xml)
 * Le point dans l'URL exclut ces routes du proxy i18n.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fichier: string }> }
) {
  const { fichier } = await params;
  if (fichier === "pages.xml") return reponseXml(sitemapXml(await sitemapPagesFixes()));

  const departement = departementDuFichier(fichier);
  if (!departement) return new Response("Not found", { status: 404 });
  return reponseXml(sitemapXml(await sitemapCommunes(departement)));
}
