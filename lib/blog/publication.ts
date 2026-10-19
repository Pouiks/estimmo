import "server-only";
import { revalidatePath } from "next/cache";
import { revaliderSite } from "@/lib/i18n/revalidate";
import type { Locale } from "@/lib/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Categorie } from "./categories";
import type { TiptapNode } from "./render";

/**
 * Un article est EN LIGNE quand statut = 'publie' ET published_at <= maintenant.
 * statut 'publie' + date future = programmé : invisible (liste, page, sitemap,
 * liens internes) jusqu'à sa date. Le cron /api/cron/blog rafraîchit ensuite
 * le cache ISR des pages concernées.
 */

export interface ArticleCarte {
  slug: string;
  titre: string;
  extrait: string | null;
  meta_description: string | null;
  contenu: TiptapNode | null;
  contenu_html: string | null;
  categorie: Categorie | null;
  temps_lecture: number | null;
  image_cover: string | null;
  image_cover_alt: string | null;
  published_at: string;
}

export interface ArticleComplet extends ArticleCarte {
  meta_title: string | null;
  auteur: string | null;
  image_cover_largeur: number | null;
  image_cover_hauteur: number | null;
  faq: { question: string; answer: string }[];
  articles_lies: string[];
  updated_at: string;
}

const CHAMPS_CARTE =
  "slug, titre, extrait, meta_description, contenu, contenu_html, categorie, temps_lecture, image_cover, image_cover_alt, published_at";
const CHAMPS_COMPLETS = `${CHAMPS_CARTE}, meta_title, auteur, image_cover_largeur, image_cover_hauteur, faq, articles_lies, updated_at`;

function enLigne(locale: Locale) {
  return createAdminClient()
    .from("articles")
    .select(CHAMPS_CARTE)
    .eq("statut", "publie")
    .eq("lang", locale)
    .lte("published_at", new Date().toISOString());
}

/** Articles en ligne d'une langue, du plus récent au plus ancien. */
export async function articlesEnLigne(locale: Locale, limite = 200): Promise<ArticleCarte[]> {
  const { data } = await enLigne(locale)
    .order("published_at", { ascending: false })
    .limit(limite);
  return (data ?? []) as ArticleCarte[];
}

/** Article en ligne (sinon null → 404). Un article n'existe que dans sa langue. */
export async function articleEnLigne(slug: string, locale: Locale): Promise<ArticleComplet | null> {
  const { data } = await createAdminClient()
    .from("articles")
    .select(CHAMPS_COMPLETS)
    .eq("slug", slug)
    .eq("statut", "publie")
    .eq("lang", locale)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  return (data as ArticleComplet | null) ?? null;
}

/**
 * Rafraîchit tout le blog public : liste, chaque article (liens internes et
 * « À lire aussi » dépendent de ce qui est en ligne) et le sitemap.
 * En route handler, la régénération se fait à la visite suivante : appeler
 * cette fonction pour 30 articles ne coûte rien.
 */
export async function revaliderBlog(slugsEnPlus: string[] = []): Promise<void> {
  const { data } = await createAdminClient().from("articles").select("slug");
  const slugs = new Set([...(data ?? []).map((a) => a.slug as string), ...slugsEnPlus]);
  revaliderSite("/blog");
  for (const slug of slugs) revaliderSite(`/blog/${slug}`);
  revalidatePath("/sitemaps/pages.xml");
}

/**
 * Cron : articles dont la date de publication est passée mais dont la mise
 * en ligne n'a pas encore été répercutée sur le cache du site.
 */
export async function diffuserArticlesDus(): Promise<{ diffuses: string[] }> {
  const supabase = createAdminClient();
  const maintenant = new Date().toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug")
    .eq("statut", "publie")
    .lte("published_at", maintenant)
    .is("diffuse_le", null);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return { diffuses: [] };

  await revaliderBlog();
  const { error: majErreur } = await supabase
    .from("articles")
    .update({ diffuse_le: maintenant })
    .in("id", data.map((a) => a.id));
  if (majErreur) throw new Error(majErreur.message);
  return { diffuses: data.map((a) => a.slug as string) };
}
