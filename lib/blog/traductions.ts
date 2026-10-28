import { LOCALES, type Locale } from "@/lib/i18n/routing";

/**
 * Versions linguistiques d'un article (fonctions pures, testées).
 * Une version anglaise est un article `lang = 'en'` dont `traduction_de`
 * désigne l'original français. Les deux versions se déclarent mutuellement
 * (hreflang, sitemap), et un visiteur qui change de langue sur un article
 * est envoyé vers l'autre version si elle est en ligne.
 */

/** Champs nécessaires pour apparier les versions d'un article. */
export interface ArticleVersion {
  id: string;
  slug: string;
  lang: string | null;
  /** Article original dont celui-ci est la traduction. */
  traduction_de: string | null;
}

function langue(article: ArticleVersion): string {
  return article.lang ?? "fr";
}

/** Slug proposé pour la traduction d'un article : « <slug>-en ». */
export function slugTraduction(slug: string, locale: Locale): string {
  const suffixe = `-${locale}`;
  return slug.endsWith(suffixe) ? slug : `${slug}${suffixe}`;
}

/**
 * Version de `article` dans la langue `locale`, parmi `articles` : son
 * original ou la traduction qui le cite. null si elle n'y figure pas (ou si
 * l'article est déjà dans cette langue).
 */
export function versionDans<T extends ArticleVersion>(
  article: ArticleVersion,
  locale: Locale,
  articles: T[]
): T | null {
  if (langue(article) === locale) return null;
  return (
    articles.find(
      (a) =>
        langue(a) === locale &&
        a.id !== article.id &&
        (a.id === article.traduction_de || a.traduction_de === article.id)
    ) ?? null
  );
}

/**
 * Slug (autre langue) → slug (langue `locale`) pour tous les couples présents.
 * Sert à traduire les liens internes et les « À lire aussi » d'un article
 * copié depuis sa version française.
 */
export function correspondances(articles: ArticleVersion[], locale: Locale): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of articles) {
    if (langue(a) === locale) continue;
    const version = versionDans(a, locale, articles);
    if (version) map.set(a.slug, version.slug);
  }
  return map;
}

/** Chemin public (sans préfixe de langue) de l'article dans chaque langue où il existe. */
export function cheminsParLangue(
  article: ArticleVersion,
  locale: Locale,
  articles: ArticleVersion[]
): Partial<Record<Locale, string>> {
  const chemins: Partial<Record<Locale, string>> = { [locale]: `/blog/${article.slug}` };
  for (const l of LOCALES) {
    if (l === locale) continue;
    const version = versionDans(article, l, articles);
    if (version) chemins[l] = `/blog/${version.slug}`;
  }
  return chemins;
}

/**
 * Où envoyer un visiteur qui demande /blog/<slug> dans une langue où cet
 * article n'existe pas : sa version dans cette langue si elle est en ligne,
 * sinon la liste du blog. null si le slug ne désigne aucun article en ligne
 * (404). `articles` = versions en ligne, toutes langues.
 */
export function cheminDeRepli(
  slug: string,
  locale: Locale,
  articles: ArticleVersion[]
): string | null {
  const article = articles.find((a) => a.slug === slug);
  if (!article || langue(article) === locale) return null;
  const version = versionDans(article, locale, articles);
  return version ? `/blog/${version.slug}` : "/blog";
}
