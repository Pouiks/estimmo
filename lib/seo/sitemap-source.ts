import "server-only";
import { imagesPubliees, type Visuels } from "@/lib/blog/images";
import { languesEnLigne, type AvecTraductions } from "@/lib/blog/traductions";
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
      .select("slug, published_at, updated_at, image_cover, visuels, contenu_html, traductions")
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

  // Même slug dans les deux langues : un article dont la version anglaise est
  // en ligne a deux entrées (hreflang mutuels) ; sinon son URL française seule.
  const lignes = (articles.data ?? []) as (AvecTraductions & {
    slug: string;
    published_at: string;
    updated_at: string;
    image_cover: string | null;
    visuels: Visuels | null;
    contenu_html: string | null;
  })[];
  const pagesArticles = lignes.flatMap((a) => {
    const extra = {
      // Dernière modification éditoriale, jamais avant la publication.
      lastModified: new Date(a.updated_at > a.published_at ? a.updated_at : a.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      // Couverture et images du corps réellement affichées (Google Images).
      images: imagesPubliees(a),
    };
    const chemin = `/blog/${a.slug}`;
    return languesEnLigne(a).length > 1
      ? entreesBilingues(chemin, extra)
      : [entreeMonolingue(chemin, "fr", extra)];
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
