"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES } from "@/lib/blog/categories";
import { dimensionsImage, modifierImageCorps, problemesHtml } from "@/lib/blog/html";
import { creerMedia, listerMedias, mediaParId, recadrerMedia } from "@/lib/blog/medias";
import { POSITIONS } from "@/lib/blog/optimisation";
import { depuisChampParis } from "@/lib/blog/planning";
import { revaliderBlog } from "@/lib/blog/publication";
import { slugTraduction } from "@/lib/blog/traductions";
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

  await apresChangement(id);

  return {
    ok: true,
    message: article.statut === "publie" ? "Article publié" : "Brouillon enregistré",
    id,
  };
}

export async function deleteArticle(id: string): Promise<SaveArticleResult> {
  await requireAdmin();

  const { error } = await createAdminClient().from("articles").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  await revaliderBlog();
  revalidatePath("/admin/blog");
  return { ok: true, message: "Article supprimé" };
}

/** Taille d'origine acceptée (le navigateur réduit les photos avant l'envoi). */
const SOURCE_MAX_OCTETS = 4 * 1024 * 1024;

/** Image insérée depuis l'éditeur visuel : va dans la bibliothèque (format libre). */
export async function uploadArticleImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Fichier manquant" };
  if (file.size > SOURCE_MAX_OCTETS) {
    return { ok: false, message: "Image trop lourde (4 Mo max)" };
  }

  try {
    const { media } = await creerMedia({
      source: Buffer.from(await file.arrayBuffer()),
      nomBase: nomBaseDepuisFichier(file.name),
      cible: { mode: "libre" },
    });
    revalidatePath("/admin/medias");
    return { ok: true, url: media.url };
  } catch {
    return { ok: false, message: "Fichier illisible : envoyez une photo JPG, PNG ou WebP" };
  }
}

function nomBaseDepuisFichier(nom: string): string {
  return slugify(nom.replace(/\.[a-z0-9]+$/i, "")).slice(0, 60) || "image";
}

// ----------------------------------------------------------------------------
// Publication et articles éditoriaux (HTML importé depuis content/blog)
// ----------------------------------------------------------------------------

/**
 * Après toute modification : note si l'article est désormais en ligne (le
 * cron n'aura rien à faire) et rafraîchit tout le blog public, car les liens
 * internes et les « À lire aussi » des autres articles en dépendent.
 */
async function apresChangement(id: string) {
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

  await revaliderBlog();
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
  /** Langue : l'article n'apparaît que sur /blog (fr) ou /en/blog (en). */
  lang: z.enum(["fr", "en"]),
  /** Version anglaise : l'article français d'origine (hreflang, bascule FR/EN). */
  traductionDe: z.uuid().nullable(),
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

  const traductionDe = a.lang === "en" ? a.traductionDe : null;
  if (traductionDe === a.id) {
    return { ok: false, message: "Un article ne peut pas être sa propre traduction" };
  }
  if (traductionDe) {
    const { data: original } = await createAdminClient()
      .from("articles")
      .select("lang")
      .eq("id", traductionDe)
      .maybeSingle();
    if (!original || original.lang !== "fr") {
      return { ok: false, message: "L'article d'origine doit être un article français" };
    }
  }

  const { error } = await createAdminClient()
    .from("articles")
    .update({
      titre: a.titre,
      slug: a.slug,
      lang: a.lang,
      traduction_de: traductionDe,
      meta_title: a.metaTitle,
      meta_description: a.metaDescription,
      extrait: a.extrait,
      categorie: a.categorie,
      auteur: a.auteur,
      temps_lecture: a.tempsLecture,
      published_at: depuisChampParis(a.publishedAt).toISOString(),
      statut: a.statut,
      contenu_html: a.contenuHtml,
      faq: a.faq,
      articles_lies: a.articlesLies,
    })
    .eq("id", a.id);
  if (error) return { ok: false, message: messageDoublon(error) };

  await apresChangement(a.id);
  revalidatePath(`/admin/blog/${a.id}`);
  return { ok: true, message: "Article enregistré", id: a.id };
}

function messageDoublon(error: { code?: string; message: string }): string {
  if (error.code !== "23505") return error.message;
  return error.message.includes("traduction")
    ? "Cet article français a déjà une version anglaise"
    : "Ce slug existe déjà";
}

/** Colonnes copiées telles quelles dans la version anglaise (à traduire ensuite). */
const COLONNES_COPIEES = [
  "titre", "meta_title", "meta_description", "extrait", "categorie", "auteur",
  "temps_lecture", "contenu", "contenu_html", "image_cover", "image_cover_alt",
  "image_cover_largeur", "image_cover_hauteur", "image_cover_prompt", "visuels",
  "faq", "articles_lies", "mot_cle_principal", "mots_cles_secondaires",
  "points_cles", "images", "published_at",
] as const;

/**
 * Crée la version anglaise d'un article français : copie intégrale en
 * brouillon (textes, HTML, FAQ, images et emplacements partagés), reliée par
 * traduction_de, slug suffixé « -en ». Le contenu reste à traduire dans
 * l'éditeur ; les liens internes et « À lire aussi » copiés sont traduits
 * automatiquement à l'affichage quand la version anglaise de la cible est
 * en ligne.
 */
export async function creerTraduction(id: string): Promise<SaveArticleResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Article inconnu" };

  const supabase = createAdminClient();
  const { data: source } = await supabase
    .from("articles")
    .select(["slug", "lang", ...COLONNES_COPIEES].join(", "))
    .eq("id", id)
    .maybeSingle();
  if (!source) return { ok: false, message: "Article introuvable" };
  const original = source as unknown as Record<string, unknown>;
  if (original.lang !== "fr") {
    return { ok: false, message: "Seul un article français peut recevoir une version anglaise" };
  }
  if (!original.contenu_html) {
    return { ok: false, message: "Réservé aux articles éditoriaux (corps HTML)" };
  }

  const { data: existante } = await supabase
    .from("articles")
    .select("id")
    .eq("traduction_de", id)
    .maybeSingle();
  if (existante) {
    return { ok: true, message: "La version anglaise existe déjà", id: existante.id as string };
  }

  const copie = Object.fromEntries(COLONNES_COPIEES.map((c) => [c, original[c] ?? null]));
  const { data, error } = await supabase
    .from("articles")
    .insert({
      ...copie,
      slug: slugTraduction(original.slug as string, "en"),
      lang: "en",
      statut: "brouillon",
      traduction_de: id,
      diffuse_le: null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, message: error ? messageDoublon(error) : "Erreur" };
  }

  revalidatePath("/admin/blog");
  return { ok: true, message: "Version anglaise créée en brouillon : à traduire", id: data.id as string };
}

// ----------------------------------------------------------------------------
// Emplacements d'images d'un article éditorial (couverture, image-1, image-2)
// Chaque image d'emplacement est un média de la bibliothèque ; l'emplacement
// ne garde que son url (articles.visuels). L'alt et la légende affichés sur le
// site sont ceux de l'article (image_cover_alt, <img alt>/<figcaption> du corps).
// ----------------------------------------------------------------------------

interface ImageCorps {
  src: string;
  alt: string;
  caption?: string;
  aiPrompt?: string;
}

interface Emplacement {
  slug: string;
  /** cover | image-1 | image-2 (nom du fichier logique) */
  nom: string;
  estCouverture: boolean;
  largeur: number;
  hauteur: number;
  alt: string;
  prompt: string | null;
  visuels: Record<string, string>;
  contenuHtml: string;
  images: ImageCorps[];
}

/** Vérifie que `cle` (chemin logique /images/blog/...) est une image de l'article. */
async function emplacement(articleId: string, cle: string): Promise<Emplacement | null> {
  const { data } = await createAdminClient()
    .from("articles")
    .select(
      "slug, image_cover, image_cover_alt, image_cover_largeur, image_cover_hauteur, image_cover_prompt, images, contenu_html, visuels"
    )
    .eq("id", articleId)
    .maybeSingle();
  if (!data) return null;
  const commun = {
    slug: data.slug as string,
    nom: cle.split("/").pop()!.replace(/\.[a-z]+$/i, ""),
    visuels: (data.visuels ?? {}) as Record<string, string>,
    contenuHtml: (data.contenu_html ?? "") as string,
    images: (data.images ?? []) as ImageCorps[],
  };
  if (cle === data.image_cover) {
    return {
      ...commun,
      estCouverture: true,
      largeur: data.image_cover_largeur ?? 1200,
      hauteur: data.image_cover_hauteur ?? 630,
      alt: data.image_cover_alt ?? "",
      prompt: data.image_cover_prompt ?? null,
    };
  }
  const image = commun.images.find((i) => i.src === cle);
  if (!image) return null;
  return {
    ...commun,
    estCouverture: false,
    ...dimensionsImage(commun.contenuHtml, cle),
    alt: image.alt,
    prompt: image.aiPrompt ?? null,
  };
}

/** Affecte (url) ou libère (null) un emplacement, puis rafraîchit le site. */
async function affecterEmplacement(
  articleId: string,
  cle: string,
  visuels: Record<string, string>,
  url: string | null
) {
  const nouveaux = { ...visuels };
  if (url) nouveaux[cle] = url;
  else delete nouveaux[cle];
  const { error } = await createAdminClient()
    .from("articles")
    .update({ visuels: nouveaux })
    .eq("id", articleId);
  if (error) throw new Error(error.message);
  // Le statut de publication ne change pas : seul le site est à rafraîchir.
  await revaliderBlog();
  revalidatePath(`/admin/blog/${articleId}`);
  revalidatePath("/admin/medias");
}

export interface ResultatVisuel {
  ok: boolean;
  message: string;
  url?: string;
}

const identifiants = z.object({ articleId: z.uuid(), cle: z.string().startsWith("/images/blog/") });

/**
 * Reçoit une photo pour un emplacement : recadrage aux dimensions exactes,
 * WebP < 200 Ko, entrée dans la bibliothèque, affectation. L'image est en
 * ligne immédiatement.
 */
export async function envoyerVisuel(formData: FormData): Promise<ResultatVisuel> {
  await requireAdmin();

  const ids = identifiants.safeParse({ articleId: formData.get("articleId"), cle: formData.get("cle") });
  const position = z.enum(POSITIONS).catch("auto").parse(formData.get("position"));
  const fichier = formData.get("fichier");
  if (!ids.success) return { ok: false, message: "Emplacement inconnu" };
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, message: "Fichier manquant" };
  if (fichier.size > SOURCE_MAX_OCTETS) return { ok: false, message: "Image trop lourde (4 Mo max)" };

  const cible = await emplacement(ids.data.articleId, ids.data.cle);
  if (!cible) return { ok: false, message: "Emplacement inconnu pour cet article" };

  let resultat;
  try {
    resultat = await creerMedia({
      source: Buffer.from(await fichier.arrayBuffer()),
      nomBase: `${cible.slug}-${cible.nom}`,
      alt: cible.alt,
      prompt: cible.prompt,
      cible: { mode: "recadrer", largeur: cible.largeur, hauteur: cible.hauteur, position },
    });
  } catch {
    return { ok: false, message: "Fichier illisible : envoyez une photo JPG, PNG ou WebP" };
  }

  await affecterEmplacement(ids.data.articleId, ids.data.cle, cible.visuels, resultat.media.url);
  const poids = Math.round(resultat.media.taille / 1024);
  return {
    ok: true,
    url: resultat.media.url,
    message: resultat.agrandie
      ? `Image en ligne (${poids} Ko), mais l'original était plus petit que ${cible.largeur}×${cible.hauteur} : elle peut paraître floue`
      : `Image en ligne (${cible.largeur}×${cible.hauteur}, ${poids} Ko)`,
  };
}

/**
 * Affecte un média de la bibliothèque à un emplacement. Si ses dimensions
 * diffèrent, un recadrage est créé (nouveau média dérivé) ; l'original reste
 * dans la bibliothèque.
 */
export async function choisirMediaPourVisuel(
  articleId: string,
  cle: string,
  mediaId: string
): Promise<ResultatVisuel> {
  await requireAdmin();
  const ids = identifiants.safeParse({ articleId, cle });
  if (!ids.success || !z.uuid().safeParse(mediaId).success) return { ok: false, message: "Emplacement inconnu" };

  const [cible, media] = await Promise.all([emplacement(articleId, cle), mediaParId(mediaId)]);
  if (!cible) return { ok: false, message: "Emplacement inconnu pour cet article" };
  if (!media) return { ok: false, message: "Image introuvable dans la bibliothèque" };

  if (media.largeur === cible.largeur && media.hauteur === cible.hauteur) {
    await affecterEmplacement(articleId, cle, cible.visuels, media.url);
    return { ok: true, url: media.url, message: "Image affectée" };
  }

  let derive;
  try {
    derive = await recadrerMedia(media, {
      largeur: cible.largeur,
      hauteur: cible.hauteur,
      nomBase: `${cible.slug}-${cible.nom}`,
    });
  } catch (err) {
    return { ok: false, message: `Recadrage impossible : ${(err as Error).message}` };
  }
  await affecterEmplacement(articleId, cle, cible.visuels, derive.media.url);
  return {
    ok: true,
    url: derive.media.url,
    message: derive.agrandie
      ? `Image recadrée en ${cible.largeur}×${cible.hauteur}, mais l'original est plus petit : elle peut paraître floue`
      : `Image recadrée en ${cible.largeur}×${cible.hauteur} et affectée`,
  };
}

/** Libère un emplacement (retour à public/ ou à l'aplat). Le média reste dans la bibliothèque. */
export async function retirerVisuel(articleId: string, cle: string): Promise<ResultatVisuel> {
  await requireAdmin();
  if (!identifiants.safeParse({ articleId, cle }).success) return { ok: false, message: "Emplacement inconnu" };
  const cible = await emplacement(articleId, cle);
  if (!cible?.visuels[cle]) return { ok: false, message: "Aucune image affectée ici" };
  await affecterEmplacement(articleId, cle, cible.visuels, null);
  return { ok: true, message: "Image retirée de l'emplacement (elle reste dans la bibliothèque)" };
}

const textesSchema = z.object({
  alt: z.string().trim().min(5, "Texte alternatif trop court (5 caractères minimum)").max(200, "Texte alternatif : 200 caractères maximum"),
  legende: z.string().trim().max(300, "Légende : 300 caractères maximum").optional(),
});

/**
 * Alt (et légende pour une image du corps) d'un emplacement : ce sont les
 * textes publiés sur la page de l'article.
 */
export async function modifierTexteVisuel(
  articleId: string,
  cle: string,
  textes: { alt: string; legende?: string }
): Promise<ResultatVisuel> {
  await requireAdmin();
  if (!identifiants.safeParse({ articleId, cle }).success) return { ok: false, message: "Emplacement inconnu" };
  const parsed = textesSchema.safeParse(textes);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };

  const cible = await emplacement(articleId, cle);
  if (!cible) return { ok: false, message: "Emplacement inconnu pour cet article" };

  const maj = cible.estCouverture
    ? { image_cover_alt: parsed.data.alt }
    : {
        contenu_html: modifierImageCorps(cible.contenuHtml, cle, {
          alt: parsed.data.alt,
          legende: parsed.data.legende ?? null,
        }),
        images: cible.images.map((i) =>
          i.src === cle ? { ...i, alt: parsed.data.alt, caption: parsed.data.legende || undefined } : i
        ),
      };
  const { error } = await createAdminClient().from("articles").update(maj).eq("id", articleId);
  if (error) return { ok: false, message: error.message };

  await revaliderBlog();
  revalidatePath(`/admin/blog/${articleId}`);
  return { ok: true, message: "Textes enregistrés" };
}

export interface MediaChoix {
  id: string;
  url: string;
  alt: string;
  legende: string | null;
  largeur: number;
  hauteur: number;
  format: string;
  taille: number;
}

/** Bibliothèque pour le sélecteur d'un emplacement. */
export async function listerMediasPourChoix(): Promise<MediaChoix[]> {
  await requireAdmin();
  const medias = await listerMedias();
  return medias.map(({ id, url, alt, legende, largeur, hauteur, format, taille }) => ({
    id, url, alt, legende, largeur, hauteur, format, taille,
  }));
}
