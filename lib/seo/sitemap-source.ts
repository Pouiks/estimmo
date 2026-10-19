import "server-only";
import { estLocale } from "@/lib/i18n/routing";
import { getAllCommuneSlugs, getDepartementsResume } from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  entreeMonolingue,
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
      .select("slug, published_at, updated_at, lang")
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

  // Un article n'existe que dans sa langue : pas d'alternate.
  const pagesArticles = (articles.data ?? []).map((a) =>
    entreeMonolingue(`/blog/${a.slug}`, estLocale(a.lang) ? a.lang : "fr", {
      // Dernière modification éditoriale, jamais avant la publication.
      lastModified: new Date(a.updated_at > a.published_at ? a.updated_at : a.published_at),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

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
