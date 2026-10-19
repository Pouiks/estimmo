import { z } from "zod";
import { CATEGORIES } from "./categories";
import { imagesCorps, liensBlog, problemesHtml } from "./html";

/**
 * Format des articles éditoriaux livrés en JSON (content/blog/articles.json)
 * et leur contrôle avant import. Pur : utilisé par scripts/import-articles.ts
 * et par les tests.
 */

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug invalide");

const imageSchema = z.object({
  src: z.string().startsWith("/images/blog/"),
  alt: z.string().min(5),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  caption: z.string().optional(),
  brief: z.string().optional(),
  stockKeywords: z.string().optional(),
  aiPrompt: z.string().optional(),
});

export const articleSourceSchema = z.object({
  slug,
  category: z.enum(CATEGORIES),
  title: z.string().min(10),
  metaTitle: z.string().min(10).max(65),
  metaDescription: z.string().min(50).max(165),
  excerpt: z.string().min(20),
  primaryKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string()).default([]),
  author: z.string().min(2),
  publishedAt: z.iso.date(),
  readingTimeMinutes: z.number().int().positive(),
  contentHtml: z.string().min(200),
  faq: z
    .array(z.object({ question: z.string().min(5), answer: z.string().min(10) }))
    .default([]),
  relatedSlugs: z.array(slug).default([]),
  coverImage: imageSchema.extend({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  images: z.array(imageSchema).default([]),
  keyTakeaways: z.array(z.string()).default([]),
});

export type ArticleSource = z.infer<typeof articleSourceSchema>;

export interface ResultatControle {
  articles: ArticleSource[];
  erreurs: string[];
  avertissements: string[];
}

/** Valide le fichier entier : schéma, unicité, liens internes, images, HTML. */
export function controlerArticles(brut: unknown): ResultatControle {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  const liste = z.array(z.unknown()).safeParse(brut);
  if (!liste.success) {
    return { articles: [], erreurs: ["Le fichier doit contenir un tableau d'articles"], avertissements };
  }

  const articles: ArticleSource[] = [];
  liste.data.forEach((element, i) => {
    const parsed = articleSourceSchema.safeParse(element);
    if (parsed.success) articles.push(parsed.data);
    else {
      const ident = (element as { slug?: string })?.slug ?? `#${i + 1}`;
      for (const issue of parsed.error.issues) {
        erreurs.push(`${ident} : ${issue.path.join(".") || "(racine)"} - ${issue.message}`);
      }
    }
  });

  const connus = new Set<string>();
  for (const a of articles) {
    if (connus.has(a.slug)) erreurs.push(`${a.slug} : slug en double`);
    connus.add(a.slug);
  }

  for (const a of articles) {
    for (const p of problemesHtml(a.contentHtml)) erreurs.push(`${a.slug} : ${p}`);

    for (const cible of liensBlog(a.contentHtml)) {
      if (!connus.has(cible)) avertissements.push(`${a.slug} : lien vers /blog/${cible}, article inconnu du fichier`);
    }
    for (const cible of a.relatedSlugs) {
      if (cible === a.slug) erreurs.push(`${a.slug} : se cite lui-même dans relatedSlugs`);
      else if (!connus.has(cible)) avertissements.push(`${a.slug} : relatedSlugs → ${cible}, article inconnu du fichier`);
    }

    const prefixe = `/images/blog/${a.slug}/`;
    for (const src of [a.coverImage.src, ...imagesCorps(a.contentHtml)]) {
      if (!src.startsWith(prefixe)) avertissements.push(`${a.slug} : image hors de ${prefixe} (${src})`);
    }
    if (/<aside class="a-retenir"/.test(a.contentHtml) === false && a.keyTakeaways.length > 0) {
      avertissements.push(`${a.slug} : keyTakeaways sans encadré « À retenir » dans le corps`);
    }
  }

  return { articles, erreurs, avertissements };
}

/** Ligne de la table articles (hors statut / dates, gérés par l'import). */
export function versLigne(a: ArticleSource) {
  return {
    slug: a.slug,
    lang: "fr" as const,
    titre: a.title,
    meta_title: a.metaTitle,
    meta_description: a.metaDescription,
    extrait: a.excerpt,
    categorie: a.category,
    auteur: a.author,
    temps_lecture: a.readingTimeMinutes,
    contenu_html: a.contentHtml,
    image_cover: a.coverImage.src,
    image_cover_alt: a.coverImage.alt,
    image_cover_largeur: a.coverImage.width,
    image_cover_hauteur: a.coverImage.height,
    image_cover_prompt: a.coverImage.aiPrompt ?? null,
    faq: a.faq,
    articles_lies: a.relatedSlugs,
    mot_cle_principal: a.primaryKeyword,
    mots_cles_secondaires: a.secondaryKeywords,
    points_cles: a.keyTakeaways,
    images: a.images,
  };
}
