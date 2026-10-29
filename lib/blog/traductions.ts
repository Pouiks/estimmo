import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/routing";

/**
 * Versions linguistiques d'un article (fonctions pures, testées).
 *
 * Un article porte sa version française dans ses colonnes et ses traductions
 * dans `traductions` (jsonb, clé = locale). Même slug dans toutes les langues :
 * /blog/<slug> en français, /en/blog/<slug> en anglais. Une traduction n'est
 * visible que si l'article est en ligne ET si elle est elle-même publiée ;
 * sans version anglaise publiée, la page anglaise affiche le français (repli).
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
}

export type Traductions = Partial<Record<LocaleTraduite, VersionTraduite>>;

export interface AvecTraductions {
  traductions: Traductions | null;
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

export type Version<T> = Omit<T, "traductions"> & {
  /** Langue effective du contenu renvoyé (fr si la traduction demandée n'existe pas). */
  langue: Locale;
  /** Langues dans lesquelles l'article est publié. */
  langues: Locale[];
};

/**
 * Article tel qu'il s'affiche dans `locale` : les champs traduisibles présents
 * sur l'article sont remplacés par leur traduction. Un champ traduit vide
 * retombe sur le français, sauf la FAQ (une FAQ anglaise vide = pas de FAQ,
 * plutôt qu'une FAQ française sur une page anglaise).
 */
export function versionPour<T extends Partial<ChampsTraduisibles> & AvecTraductions>(
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
    titre: input.titre.trim(),
    meta_title: ouNull(input.metaTitle),
    meta_description: ouNull(input.metaDescription),
    extrait: ouNull(input.extrait),
    contenu_html: ouNull(input.contenuHtml),
    faq: input.faq,
    image_cover_alt: ouNull(input.imageCoverAlt),
  };
}
