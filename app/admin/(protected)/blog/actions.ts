"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES } from "@/lib/blog/categories";
import { problemesHtml } from "@/lib/blog/html";
import { depuisChampParis } from "@/lib/blog/planning";
import { revaliderBlog } from "@/lib/blog/publication";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

const articleSchema = z.object({
  id: z.uuid().optional(),
  titre: z.string().trim().min(3, "Titre trop court"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug trop court")
    .regex(/^[a-z0-9-]+$/, "Slug invalide (minuscules, chiffres, tirets)"),
  metaDescription: z.string().trim().max(180, "160-180 caractères maximum"),
  contenu: z.string().min(2), // JSON TipTap sérialisé
  imageCover: z.string().nullable(),
  statut: z.enum(["brouillon", "publie"]),
  /** Langue de l'article : il n'apparaît que sur /blog (fr) ou /en/blog (en). */
  lang: z.enum(["fr", "en"]).default("fr"),
});

export interface SaveArticleResult {
  ok: boolean;
  message: string;
  id?: string;
}

export async function saveArticle(input: unknown): Promise<SaveArticleResult> {
  await requireAdmin();

  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const article = parsed.data;
  let contenu: unknown;
  try {
    contenu = JSON.parse(article.contenu);
  } catch {
    return { ok: false, message: "Contenu invalide" };
  }

  const supabase = createAdminClient();
  const row = {
    titre: article.titre,
    slug: slugify(article.slug),
    meta_description: article.metaDescription || null,
    contenu,
    image_cover: article.imageCover,
    statut: article.statut,
    lang: article.lang,
  };

  let id = article.id;
  const ancienSlug = id ? await slugActuel(id) : null;
  if (id) {
    const { error } = await supabase.from("articles").update(row).eq("id", id);
    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? "Ce slug existe déjà" : error.message,
      };
    }
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return {
        ok: false,
        message: error?.code === "23505" ? "Ce slug existe déjà" : (error?.message ?? "Erreur"),
      };
    }
    id = data.id as string;
  }

  // Horodatage de première publication
  if (article.statut === "publie") {
    await supabase
      .from("articles")
      .update({ published_at: new Date().toISOString() })
      .eq("id", id)
      .is("published_at", null);
  }

  await apresChangement(id, ancienSlug);

  return {
    ok: true,
    message: article.statut === "publie" ? "Article publié" : "Brouillon enregistré",
    id,
  };
}

export async function deleteArticle(id: string): Promise<SaveArticleResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from("articles")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  await revaliderBlog(article?.slug ? [article.slug] : []);
  revalidatePath("/admin/blog");
  return { ok: true, message: "Article supprimé" };
}

const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadArticleImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Fichier manquant" };
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, message: "Image trop lourde (4 Mo max)" };
  }
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, message: "Format accepté : JPG, PNG, WebP, GIF" };

  const supabase = createAdminClient();
  const path = `articles/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("blog")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });

  if (error) return { ok: false, message: error.message };

  const { data } = supabase.storage.from("blog").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

// ----------------------------------------------------------------------------
// Publication et articles éditoriaux (HTML importé depuis content/blog)
// ----------------------------------------------------------------------------

async function slugActuel(id: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("articles")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  return (data?.slug as string | undefined) ?? null;
}

/**
 * Après toute modification : note si l'article est désormais en ligne (le
 * cron n'aura rien à faire) et rafraîchit tout le blog public, car les liens
 * internes et les « À lire aussi » des autres articles en dépendent.
 */
async function apresChangement(id: string, ancienSlug?: string | null) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("statut, published_at")
    .eq("id", id)
    .maybeSingle();
  const enLigne =
    data?.statut === "publie" &&
    !!data.published_at &&
    new Date(data.published_at) <= new Date();
  await supabase
    .from("articles")
    .update({ diffuse_le: enLigne ? new Date().toISOString() : null })
    .eq("id", id);

  await revaliderBlog(ancienSlug ? [ancienSlug] : []);
  revalidatePath("/admin/blog");
}

export type ActionPublication = "publier" | "maintenant" | "depublier";

/**
 * Bouton de la liste admin :
 *  - publier    : remet en ligne à sa date (programmé si elle est future,
 *                 maintenant si l'article n'en a pas) ;
 *  - maintenant : met en ligne tout de suite ;
 *  - depublier  : repasse en brouillon (la date est conservée).
 */
export async function changerPublication(
  id: string,
  action: ActionPublication
): Promise<SaveArticleResult> {
  await requireAdmin();
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Article inconnu" };

  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from("articles")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();
  if (!article) return { ok: false, message: "Article introuvable" };

  const maintenant = new Date().toISOString();
  const maj =
    action === "depublier"
      ? { statut: "brouillon" }
      : action === "maintenant"
        ? { statut: "publie", published_at: maintenant }
        : { statut: "publie", published_at: article.published_at ?? maintenant };

  const { error } = await supabase.from("articles").update(maj).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await apresChangement(id);

  const programme =
    action === "publier" && !!article.published_at && article.published_at > maintenant;
  return {
    ok: true,
    message:
      action === "depublier"
        ? "Article dépublié"
        : programme
          ? "Article programmé"
          : "Article en ligne",
  };
}

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres, tirets)");

const articleEditorialSchema = z.object({
  id: z.uuid(),
  titre: z.string().trim().min(10, "Titre trop court"),
  slug: slugSchema,
  metaTitle: z.string().trim().min(10, "Meta title trop court").max(65, "Meta title : 65 caractères maximum"),
  metaDescription: z
    .string()
    .trim()
    .min(50, "Meta description trop courte")
    .max(165, "Meta description : 165 caractères maximum"),
  extrait: z.string().trim().min(20, "Extrait trop court").max(300, "Extrait : 300 caractères maximum"),
  categorie: z.enum(CATEGORIES),
  auteur: z.string().trim().min(2, "Auteur manquant"),
  tempsLecture: z.number().int().min(1).max(60),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date de publication invalide"),
  statut: z.enum(["brouillon", "publie"]),
  imageCover: z.string().trim().min(1, "Image de couverture manquante"),
  imageCoverAlt: z.string().trim().min(5, "Texte alternatif de la couverture manquant"),
  contenuHtml: z.string().min(200, "Contenu trop court"),
  faq: z.array(
    z.object({
      question: z.string().trim().min(5, "Question trop courte"),
      answer: z.string().trim().min(10, "Réponse trop courte"),
    })
  ),
  articlesLies: z.array(slugSchema).max(6),
});

export type ArticleEditorialInput = z.input<typeof articleEditorialSchema>;

export async function saveArticleEditorial(input: unknown): Promise<SaveArticleResult> {
  await requireAdmin();

  const parsed = articleEditorialSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Invalide" };
  }
  const a = parsed.data;
  const problemes = problemesHtml(a.contenuHtml);
  if (problemes.length > 0) return { ok: false, message: `Contenu refusé : ${problemes[0]}` };
  if (a.articlesLies.includes(a.slug)) {
    return { ok: false, message: "Un article ne peut pas se citer dans « À lire aussi »" };
  }

  const ancienSlug = await slugActuel(a.id);
  const { error } = await createAdminClient()
    .from("articles")
    .update({
      titre: a.titre,
      slug: a.slug,
      meta_title: a.metaTitle,
      meta_description: a.metaDescription,
      extrait: a.extrait,
      categorie: a.categorie,
      auteur: a.auteur,
      temps_lecture: a.tempsLecture,
      published_at: depuisChampParis(a.publishedAt).toISOString(),
      statut: a.statut,
      image_cover: a.imageCover,
      image_cover_alt: a.imageCoverAlt,
      contenu_html: a.contenuHtml,
      faq: a.faq,
      articles_lies: a.articlesLies,
    })
    .eq("id", a.id);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Ce slug existe déjà" : error.message,
    };
  }

  await apresChangement(a.id, ancienSlug !== a.slug ? ancienSlug : null);
  revalidatePath(`/admin/blog/${a.id}`);
  return { ok: true, message: "Article enregistré", id: a.id };
}
