import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { getAllCommuneSlugs, getDepartementsResume } from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;

  const statiques: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/estimation`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/prix-immobilier`, changeFrequency: "daily", priority: 0.8 },
    {
      url: `${base}/barometre-immobilier`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
    {
      url: `${base}/politique-confidentialite`,
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];

  const [communes, departements, articles] = await Promise.all([
    getAllCommuneSlugs(),
    getDepartementsResume().catch(() => []),
    createAdminClient()
      .from("articles")
      .select("slug, updated_at")
      .eq("statut", "publie")
      .limit(1000),
  ]);

  // Seuls les départements présents en base (976 Mayotte n'a ni DVF ni ANIL).
  const pagesDepartements: MetadataRoute.Sitemap = departements
    .filter((d) => nomDepartement(d.departement))
    .map((d) => ({
      url: `${base}${hrefDepartement(d.departement)}`,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

  const pagesCommunes: MetadataRoute.Sitemap = communes.map((c) => ({
    url: `${base}/prix-immobilier/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const pagesArticles: MetadataRoute.Sitemap = (articles.data ?? []).map(
    (a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  return [...statiques, ...pagesDepartements, ...pagesCommunes, ...pagesArticles];
}
