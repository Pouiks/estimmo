import "server-only";
import { imagesPubliees, type Visuels } from "@/lib/blog/images";
import { cheminsBlog, languesEnLigne, slugsPublics, type AvecSlug } from "@/lib/blog/traductions";
import { getCommunesSitemap, getDepartementsResume } from "@/lib/seo/communes";
import { estIndexable } from "@/lib/seo/indexation";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { REGIONS, hrefRegion } from "@/lib/seo/regions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  entreeMonolingue,
  entreesBilingues,
  lastmodCommune,
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

  // Régions dont au moins un département est en base (Mayotte n'a ni DVF ni ANIL).
  const codesPresents = new Set(departements.map((d) => d.departement));
  const pagesRegions = REGIONS.filter((r) => r.departements.some((d) => codesPresents.has(d))).flatMap((r) =>
    entreesBilingues(hrefRegion(r), { changeFrequency: "weekly", priority: 0.7 })
  );

  // Seuls les départements présents en base (976 Mayotte n'a ni DVF ni ANIL).
  const pagesDepartements = departements
    .filter((d) => nomDepartement(d.departement))
    .flatMap((d) =>
      entreesBilingues(hrefDepartement(d.departement), {
        changeFrequency: "weekly",
        priority: 0.75,
      })
    );

  // Un article dont la version anglaise est en ligne a deux entrées (hreflang
  // mutuels, chacune sur le slug public de sa langue) ; sinon son URL française seule.
  const lignes = (articles.data ?? []) as (AvecSlug & {
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
    const chemins = cheminsBlog(slugsPublics(a));
    return languesEnLigne(a).length > 1
      ? entreesBilingues(chemins, extra)
      : [entreeMonolingue(chemins.fr, "fr", extra)];
  });

  return [...statiques, ...pagesRegions, ...pagesDepartements, ...pagesArticles];
}

/**
 * Communes d'un département, version française seulement (la version
 * anglaise est noindex), lastmod réel. Les pages sous le seuil de qualité
 * (noindex) n'y figurent pas.
 */
export async function sitemapCommunes(departement: string): Promise<EntreeSitemap[]> {
  const communes = (await getCommunesSitemap(departement)).filter(estIndexable);
  return communes.map((c) =>
    entreeMonolingue(`/prix-immobilier/${c.slug}`, "fr", {
      lastModified: lastmodCommune(c.contenu_modifie_le),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );
}

/** Codes des départements présents en base (un fichier de sitemap chacun). */
export async function departementsSitemap(): Promise<string[]> {
  const resume = await getDepartementsResume().catch(() => []);
  return resume.map((d) => d.departement);
}
