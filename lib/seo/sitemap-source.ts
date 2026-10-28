import "server-only";
import { imagesPubliees, type Visuels } from "@/lib/blog/images";
import { cheminsParLangue, type ArticleVersion } from "@/lib/blog/traductions";
import { estLocale } from "@/lib/i18n/routing";
import { getAllCommuneSlugs, getDepartementsResume } from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  entreeMonolingue,
  entreeTraduite,
  entreesBilingues,
  trancheCommunes,
  type EntreeSitemap,
} from "./sitemap";

/**
 * Contenu des sitemaps (accès base). Les pages noindex (mentions légales,
 * confidentialité, rappel) sont exclues.
 */

export async function sitemapPagesFixes(): Promise<EntreeSitemap[]> {
  const [departements, articles] = await Promise.all([
    getDepartementsResume().catch(() => []),
    createAdminClient()
      .from("articles")
      .select("id, slug, published_at, updated_at, lang, traduction_de, image_cover, visuels, contenu_html")
      .eq("statut", "publie")
      // Les articles programmés (date future) restent hors sitemap.
      .lte("published_at", new Date().toISOString())
      .limit(1000),
  ]);

  const statiques: EntreeSitemap[] = [
    ...entreesBilingues("/", { changeFrequency: "weekly", priority: 1 }),
    ...entreesBilingues("/estimation", { changeFrequency: "monthly", priority: 0.9 }),
    ...entreesBilingues("/prix-immobilier", { changeFrequency: "daily", priority: 0.8 }),
    ...entreesBilingues("/barometre-immobilier", { changeFrequency: "daily", priority: 0.8 }),
    ...entreesBilingues("/blog", { changeFrequency: "weekly", priority: 0.6 }),
  ];

  // Seuls les départements présents en base (976 Mayotte n'a ni DVF ni ANIL).
  const pagesDepartements = departements
    .filter((d) => nomDepartement(d.departement))
    .flatMap((d) =>
      entreesBilingues(hrefDepartement(d.departement), {
        changeFrequency: "weekly",
        priority: 0.75,
      })
    );

  // Un article et sa version anglaise se déclarent mutuellement (hreflang) ;
  // un article sans traduction n'a pas d'alternate.
  const lignes = (articles.data ?? []) as (ArticleVersion & {
    published_at: string;
    updated_at: string;
    image_cover: string | null;
    visuels: Visuels | null;
    contenu_html: string | null;
  })[];
  const pagesArticles = lignes.map((a) => {
    const locale = estLocale(a.lang) ? a.lang : "fr";
    const extra = {
      // Dernière modification éditoriale, jamais avant la publication.
      lastModified: new Date(a.updated_at > a.published_at ? a.updated_at : a.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      // Couverture et images du corps réellement affichées (Google Images).
      images: imagesPubliees(a),
    };
    const chemins = cheminsParLangue(a, locale, lignes);
    return Object.keys(chemins).length > 1
      ? entreeTraduite(chemins, locale, extra)
      : entreeMonolingue(`/blog/${a.slug}`, locale, extra);
  });

  return [...statiques, ...pagesDepartements, ...pagesArticles];
}

export async function sitemapCommunes(tranche: number): Promise<EntreeSitemap[]> {
  const communes = await getAllCommuneSlugs();
  const { debut, fin } = trancheCommunes(tranche);
  return communes.slice(debut, fin).flatMap((c) =>
    entreesBilingues(`/prix-immobilier/${c.slug}`, {
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );
}

export async function nombreCommunes(): Promise<number> {
  return (await getAllCommuneSlugs()).length;
}
