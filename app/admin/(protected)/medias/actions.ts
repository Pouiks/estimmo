"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  creerMedia,
  libererEmplacements,
  listerMedias,
  mediaParId,
  modifierMedia,
  supprimerMedia,
  usagesParUrl,
} from "@/lib/blog/medias";
import { revaliderBlog } from "@/lib/blog/publication";
import { requireAdmin } from "@/lib/supabase/auth";
import { slugify } from "@/lib/utils";

const SOURCE_MAX_OCTETS = 4 * 1024 * 1024;

export interface ResultatMedia {
  ok: boolean;
  message: string;
  url?: string;
}

/** Envoi libre dans la bibliothèque : proportions conservées, 2000 px / 350 Ko max. */
export async function envoyerMedia(formData: FormData): Promise<ResultatMedia> {
  await requireAdmin();
  const fichier = formData.get("fichier");
  const nomOriginal = String(formData.get("nom") ?? "image");
  const alt = String(formData.get("alt") ?? "").trim();
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, message: "Fichier manquant" };
  if (fichier.size > SOURCE_MAX_OCTETS) return { ok: false, message: "Image trop lourde (4 Mo max)" };

  try {
    const { media } = await creerMedia({
      source: Buffer.from(await fichier.arrayBuffer()),
      nomBase: slugify(nomOriginal.replace(/\.[a-z0-9]+$/i, "")).slice(0, 60) || "image",
      alt,
      cible: { mode: "libre" },
    });
    revalidatePath("/admin/medias");
    return {
      ok: true,
      url: media.url,
      message: `Image ajoutée (${media.largeur}×${media.hauteur}, ${Math.round(media.taille / 1024)} Ko)`,
    };
  } catch {
    return { ok: false, message: "Fichier illisible : envoyez une photo JPG, PNG ou WebP" };
  }
}

const textesSchema = z.object({
  alt: z.string().trim().max(200, "Texte alternatif : 200 caractères maximum"),
  legende: z.string().trim().max(300, "Légende : 300 caractères maximum"),
});

/** Alt et légende par défaut d'un média (proposés quand on l'affecte à un emplacement). */
export async function modifierTextesMedia(
  id: string,
  textes: { alt: string; legende: string }
): Promise<ResultatMedia> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Image inconnue" };
  const parsed = textesSchema.safeParse(textes);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  try {
    await modifierMedia(id, { alt: parsed.data.alt, legende: parsed.data.legende || null });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  revalidatePath("/admin/medias");
  return { ok: true, message: "Textes enregistrés" };
}

/**
 * Supprime un média (fichier + ligne). Les emplacements qui l'utilisaient
 * sont libérés et le blog rafraîchi.
 */
export async function supprimerMediaAction(id: string): Promise<ResultatMedia> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Image inconnue" };
  const media = await mediaParId(id);
  if (!media) return { ok: false, message: "Image introuvable" };

  try {
    const touches = await libererEmplacements(media.url);
    await supprimerMedia(media);
    if (touches.length > 0) {
      await revaliderBlog();
      for (const articleId of touches) revalidatePath(`/admin/blog/${articleId}`);
    }
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  revalidatePath("/admin/medias");
  return { ok: true, message: "Image supprimée" };
}

/** Supprime toutes les images qu'aucun article n'utilise. */
export async function supprimerMediasNonUtilises(): Promise<ResultatMedia> {
  await requireAdmin();
  const [medias, usages] = await Promise.all([listerMedias(), usagesParUrl()]);
  const orphelins = medias.filter((m) => !usages.has(m.url));
  let supprimes = 0;
  for (const m of orphelins) {
    try {
      await supprimerMedia(m);
      supprimes++;
    } catch {
      // On continue : la page affichera ce qui reste.
    }
  }
  revalidatePath("/admin/medias");
  return {
    ok: true,
    message: supprimes === 0 ? "Aucune image inutilisée" : `${supprimes} image(s) supprimée(s)`,
  };
}
