"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
  };

  let id = article.id;
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

  // Revalidation ISR du blog public
  revalidatePath("/blog");
  revalidatePath(`/blog/${row.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog");

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

  revalidatePath("/blog");
  if (article?.slug) revalidatePath(`/blog/${article.slug}`);
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
