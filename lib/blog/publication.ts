import "server-only";
import { revalidatePath } from "next/cache";
import { LOCALES, type Locale } from "@/lib/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Categorie } from "./categories";
import type { Visuels } from "./images";
import type { TiptapNode } from "./render";
import {
  articleParSlug,
  slugsPublics,
  versionEnLigne,
  versionPour,
  type AvecSlug,
  type AvecTraductions,
  type Faq,
  type SlugsPublics,
  type Version,
} from "./traductions";

/**
 * Un article est EN LIGNE quand statut = 'publie' ET published_at <= maintenant.
 * statut 'publie' + date future = programmé : invisible (liste, page, sitemap,
 * liens internes) jusqu'à sa date. Le cron /api/cron/blog rafraîchit ensuite
 * le cache ISR des pages concernées.
 *
 * Sa version anglaise n'est visible que si l'article est en ligne ET si
 * `traductions.en.statut = 'publie'` (voir lib/blog/traductions.ts). Elle peut
 * avoir son propre slug (`traductions.en.slug`) : `slugs` sur chaque article
 * renvoyé donne l'URL publique par langue, `slug` reste le slug français.
 */

/** Forme des slugs acceptée dans une URL (et dans les filtres PostgREST construits ici). */
const SLUG_URL = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Ligne lue en base pour une carte (colonnes françaises + traductions). */
export interface LigneCarte extends AvecTraductions {
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
  /** Images envoyées depuis l'admin : chemin logique → URL Storage */
  visuels: Visuels;
  published_at: string;
}

/** Ligne complète (page d'un article, aperçu admin). */
export interface LigneComplete extends LigneCarte {
  id: string;
  meta_title: string | null;
  auteur: string | null;
  image_cover_largeur: number | null;
  image_cover_hauteur: number | null;
  faq: Faq[];
  articles_lies: string[];
  updated_at: string;
}

/**
 * Article tel qu'il s'affiche dans une langue : champs déjà traduits,
 * `langue` effective (fr en repli) et `langues` publiées (hreflang).
 */
export type ArticleCarte = Version<LigneCarte>;
export type ArticleComplet = Version<LigneComplete>;

const CHAMPS_CARTE =
  "slug, titre, extrait, meta_description, contenu, contenu_html, categorie, temps_lecture, image_cover, image_cover_alt, visuels, published_at, traductions";
export const CHAMPS_COMPLETS = `${CHAMPS_CARTE}, id, meta_title, auteur, image_cover_largeur, image_cover_hauteur, faq, articles_lies, updated_at`;

function enLigne(champs: string) {
  return createAdminClient()
    .from("articles")
    .select(champs)
    .eq("statut", "publie")
    .lte("published_at", new Date().toISOString());
}

/** Articles en ligne dans cette langue, du plus récent au plus ancien (cartes déjà traduites). */
export async function articlesEnLigne(locale: Locale, limite = 200): Promise<ArticleCarte[]> {
  const { data } = await enLigne(CHAMPS_CARTE)
    .order("published_at", { ascending: false })
    .limit(limite);
  return ((data ?? []) as unknown as LigneCarte[])
    .filter((ligne) => versionEnLigne(ligne, locale))
    .map((ligne) => versionPour(ligne, locale));
}

/**
 * Articles en ligne, par slug français : leurs slugs publics par langue. Les
 * liens internes du corps (`/blog/<slug fr>`) sont réécrits vers le slug de la
 * langue de la page ; un lien vers un article hors ligne devient du texte.
 */
export async function slugsEnLigne(): Promise<Map<string, SlugsPublics>> {
  const { data } = await enLigne("slug, traductions");
  return new Map(((data ?? []) as unknown as AvecSlug[]).map((l) => [l.slug, slugsPublics(l)]));
}

/**
 * Article en ligne désigné par `slug` sur une page en `locale` : son slug
 * français ou le slug public d'une de ses traductions. Si `slugs[locale]`
 * diffère du slug demandé, la page redirige vers l'URL publique de la langue.
 * Contenu dans la langue demandée si sa version y est publiée, sinon en
 * français (`langue` = "fr" : affiché en repli, hors index).
 * null = aucun article en ligne sous ce slug (404).
 */
export async function articleEnLigne(slug: string, locale: Locale): Promise<ArticleComplet | null> {
  if (!SLUG_URL.test(slug)) return null;
  const filtres = [
    `slug.eq.${slug}`,
    ...LOCALES.filter((l) => l !== "fr").map((l) => `traductions->${l}->>slug.eq.${slug}`),
  ];
  const { data } = await enLigne(CHAMPS_COMPLETS).or(filtres.join(",")).limit(3);
  const article = articleParSlug((data ?? []) as unknown as LigneComplete[], slug, locale);
  return article ? versionPour(article, locale) : null;
}

/**
 * Rafraîchit tout le blog public : liste, chaque article (liens internes,
 * « À lire aussi » et couvertures dépendent des autres articles) et le
 * sitemap. Par motif de route (structure des fichiers, toutes langues) :
 * aucune requête ; chaque page est régénérée à sa prochaine visite (ISR).
 */
export async function revaliderBlog(): Promise<void> {
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/blog/[slug]", "page");
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
