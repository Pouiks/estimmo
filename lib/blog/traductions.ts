import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/routing";

/**
 * Versions linguistiques d'un article (fonctions pures, testées).
 *
 * Un article porte sa version française dans ses colonnes et ses traductions
 * dans `traductions` (jsonb, clé = locale). Une traduction n'est visible que
 * si l'article est en ligne ET si elle est elle-même publiée ; sans version
 * anglaise publiée, la page anglaise affiche le français (repli).
 *
 * Slugs : la colonne `slug` (français) est l'identifiant stable de l'article
 * (articles_lies, liens internes du corps, chemins d'images). Chaque traduction
 * peut porter son propre `slug` public (/en/blog/<slug anglais>) ; sans slug
 * traduit, l'URL anglaise reprend le slug français. `slugPour` / `slugsPublics`
 * donnent le slug public dans une langue ; une URL portant le slug d'une autre
 * langue est redirigée par la page (voir `articleParSlug`).
 */

export type StatutVersion = "brouillon" | "publie";
/** Locales qui ont une traduction (le français est la langue des colonnes). */
export type LocaleTraduite = Exclude<Locale, "fr">;

export interface Faq {
  question: string;
  answer: string;
}

/** Champs d'un article qui diffèrent selon la langue (colonnes françaises). */
export interface ChampsTraduisibles {
  titre: string;
  meta_title: string | null;
  meta_description: string | null;
  extrait: string | null;
  contenu_html: string | null;
  faq: Faq[];
  image_cover_alt: string | null;
}

export const CHAMPS_TRADUISIBLES = [
  "titre",
  "meta_title",
  "meta_description",
  "extrait",
  "contenu_html",
  "faq",
  "image_cover_alt",
] as const satisfies readonly (keyof ChampsTraduisibles)[];

/** Forme stockée d'une traduction (jsonb, snake_case). */
export interface VersionTraduite extends Partial<ChampsTraduisibles> {
  statut: StatutVersion;
  /** Slug propre à cette langue (/en/blog/<slug>) ; absent ou null = slug français. */
  slug?: string | null;
}

export type Traductions = Partial<Record<LocaleTraduite, VersionTraduite>>;

export interface AvecTraductions {
  traductions: Traductions | null;
}

export interface AvecSlug extends AvecTraductions {
  /** Slug français : identifiant stable de l'article. */
  slug: string;
}

export interface OptionsVersion {
  /** Inclure les traductions en brouillon (aperçu admin). */
  brouillons?: boolean;
}

/** Traduction applicable dans `locale` (publiée, ou brouillon si demandé) ; null en français. */
export function traductionPour(
  article: AvecTraductions,
  locale: Locale,
  options: OptionsVersion = {}
): VersionTraduite | null {
  if (locale === DEFAULT_LOCALE) return null;
  const version = article.traductions?.[locale as LocaleTraduite];
  if (!version) return null;
  return options.brouillons || version.statut === "publie" ? version : null;
}

/** L'article existe-t-il dans cette langue (français toujours, sinon traduction publiée) ? */
export function versionEnLigne(article: AvecTraductions, locale: Locale): boolean {
  return locale === DEFAULT_LOCALE || traductionPour(article, locale) !== null;
}

/** Langues dans lesquelles l'article est publié : hreflang, sitemap. */
export function languesEnLigne(article: AvecTraductions): Locale[] {
  return LOCALES.filter((l) => versionEnLigne(article, l));
}

/** Slug public de l'article dans chaque langue (slug français en repli). */
export type SlugsPublics = Record<Locale, string>;

/**
 * Slug public dans `locale` : celui de la traduction applicable si elle en a
 * un, sinon le slug français (aussi pour la page de repli /en/blog/<slug fr>).
 */
export function slugPour(article: AvecSlug, locale: Locale, options: OptionsVersion = {}): string {
  return traductionPour(article, locale, options)?.slug || article.slug;
}

export function slugsPublics(article: AvecSlug, options: OptionsVersion = {}): SlugsPublics {
  return Object.fromEntries(LOCALES.map((l) => [l, slugPour(article, l, options)])) as SlugsPublics;
}

/** Chemins non préfixés (/blog/<slug public>) par langue, pour cheminLocalise / alternatesPour. */
export function cheminsBlog(slugs: SlugsPublics): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, `/blog/${slugs[l]}`])) as Record<Locale, string>;
}

/**
 * Parmi des articles candidats (lus par slug français OU slug traduit), celui
 * que désigne `slug` sur une page en `locale` :
 *  1. l'article dont la traduction publiée dans cette langue porte ce slug ;
 *  2. sinon celui dont c'est le slug français (page française, page de repli,
 *     ou ancienne URL anglaise à rediriger vers le slug anglais) ;
 *  3. sinon celui dont c'est le slug public dans une autre langue (à rediriger).
 * Un slug qui n'apparaît que dans une traduction non publiée ne mène nulle part.
 */
export function articleParSlug<T extends AvecSlug>(
  candidats: T[],
  slug: string,
  locale: Locale
): T | null {
  return (
    candidats.find((a) => traductionPour(a, locale)?.slug === slug) ??
    candidats.find((a) => a.slug === slug) ??
    candidats.find((a) => LOCALES.some((l) => slugPour(a, l) === slug)) ??
    null
  );
}

export type Version<T> = Omit<T, "traductions"> & {
  /** Langue effective du contenu renvoyé (fr si la traduction demandée n'existe pas). */
  langue: Locale;
  /** Langues dans lesquelles l'article est publié. */
  langues: Locale[];
  /** Slug public par langue (`slug` reste le slug français, identifiant stable). */
  slugs: SlugsPublics;
};

/**
 * Article tel qu'il s'affiche dans `locale` : les champs traduisibles présents
 * sur l'article sont remplacés par leur traduction. Un champ traduit vide
 * retombe sur le français, sauf la FAQ (une FAQ anglaise vide = pas de FAQ,
 * plutôt qu'une FAQ française sur une page anglaise).
 */
export function versionPour<T extends Partial<ChampsTraduisibles> & AvecSlug>(
  article: T,
  locale: Locale,
  options: OptionsVersion = {}
): Version<T> {
  const { traductions: _ignorees, ...reste } = article;
  void _ignorees;
  const version = traductionPour(article, locale, options);
  const resultat = {
    ...reste,
    langue: version ? locale : DEFAULT_LOCALE,
    langues: languesEnLigne(article),
    slugs: slugsPublics(article, options),
  } as Version<T>;
  if (!version) return resultat;

  const cible = resultat as Record<string, unknown>;
  for (const champ of CHAMPS_TRADUISIBLES) {
    if (!(champ in article)) continue;
    const valeur = version[champ];
    if (champ === "faq") cible[champ] = valeur ?? [];
    else if (valeur != null && valeur !== "") cible[champ] = valeur;
  }
  return resultat;
}

/** Forme éditée dans l'admin (camelCase, jamais null : champs vides = ""). */
export interface VersionInput {
  statut: StatutVersion;
  /** Slug anglais ; "" = même slug que le français. */
  slug: string;
  titre: string;
  metaTitle: string;
  metaDescription: string;
  extrait: string;
  contenuHtml: string;
  faq: Faq[];
  imageCoverAlt: string;
}

/** Point de départ d'une traduction : copie du français, en brouillon, à traduire. */
export function traductionDepuis(fr: ChampsTraduisibles): VersionInput {
  return {
    statut: "brouillon",
    slug: "",
    titre: fr.titre,
    metaTitle: fr.meta_title ?? fr.titre,
    metaDescription: fr.meta_description ?? "",
    extrait: fr.extrait ?? "",
    contenuHtml: fr.contenu_html ?? "",
    faq: fr.faq.map((q) => ({ ...q })),
    imageCoverAlt: fr.image_cover_alt ?? "",
  };
}

/** Traduction stockée → formulaire (les champs absents s'affichent vides). */
export function versionVersInput(version: VersionTraduite): VersionInput {
  return {
    statut: version.statut,
    slug: version.slug ?? "",
    titre: version.titre ?? "",
    metaTitle: version.meta_title ?? "",
    metaDescription: version.meta_description ?? "",
    extrait: version.extrait ?? "",
    contenuHtml: version.contenu_html ?? "",
    faq: version.faq ?? [],
    imageCoverAlt: version.image_cover_alt ?? "",
  };
}

const ouNull = (valeur: string): string | null => valeur.trim() || null;

/** Formulaire → traduction stockée (champs vides enregistrés en null). */
export function inputVersVersion(input: VersionInput): VersionTraduite {
  return {
    statut: input.statut,
    slug: ouNull(input.slug),
    titre: input.titre.trim(),
    meta_title: ouNull(input.metaTitle),
    meta_description: ouNull(input.metaDescription),
    extrait: ouNull(input.extrait),
    contenu_html: ouNull(input.contenuHtml),
    faq: input.faq,
    image_cover_alt: ouNull(input.imageCoverAlt),
  };
}
