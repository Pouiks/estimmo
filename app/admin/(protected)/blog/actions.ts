"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES } from "@/lib/blog/categories";
import { dimensionsImage, modifierImageCorps, problemesHtml } from "@/lib/blog/html";
import { creerMedia, listerMedias, mediaParId, recadrerMedia } from "@/lib/blog/medias";
import { POSITIONS } from "@/lib/blog/optimisation";
import { depuisChampParis } from "@/lib/blog/planning";
import { revaliderBlog } from "@/lib/blog/publication";
import {
  inputVersVersion,
  versionVersInput,
  type Traductions,
  type VersionTraduite,
} from "@/lib/blog/traductions";
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

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugSchema = z.string().trim().regex(SLUG, "Slug invalide (minuscules, chiffres, tirets)");

const faqSchema = z.array(
  z.object({
    question: z.string().trim().min(5, "Question trop courte"),
    answer: z.string().trim().min(10, "Réponse trop courte"),
  })
);

/**
 * Version traduite (onglet English). En brouillon, les champs sont libres :
 * on traduit petit à petit sans rien exposer. Publiée, elle répond aux mêmes
 * exigences que le français. Son slug est facultatif (vide = slug français).
 */
const versionSchema = z
  .object({
    statut: z.enum(["brouillon", "publie"]),
    slug: z
      .string()
      .trim()
      .refine((v) => v === "" || SLUG.test(v), "Slug anglais invalide (minuscules, chiffres, tirets)"),
    titre: z.string().trim().max(200, "Titre anglais : 200 caractères maximum"),
    metaTitle: z.string().trim().max(65, "Meta title anglais : 65 caractères maximum"),
    metaDescription: z.string().trim().max(165, "Meta description anglaise : 165 caractères maximum"),
    extrait: z.string().trim().max(300, "Extrait anglais : 300 caractères maximum"),
    imageCoverAlt: z.string().trim().max(200, "Texte alternatif anglais : 200 caractères maximum"),
    contenuHtml: z.string(),
    faq: z.array(z.object({ question: z.string().trim(), answer: z.string().trim() })),
  })
  .superRefine((v, ctx) => {
    if (v.statut !== "publie") return;
    const minimums: [champ: keyof typeof v, min: number, message: string][] = [
      ["titre", 10, "Titre anglais trop court"],
      ["metaTitle", 10, "Meta title anglais trop court"],
      ["metaDescription", 50, "Meta description anglaise trop courte"],
      ["extrait", 20, "Extrait anglais trop court"],
      ["imageCoverAlt", 5, "Texte alternatif anglais de la couverture trop court"],
      ["contenuHtml", 200, "Contenu anglais trop court"],
    ];
    for (const [champ, min, message] of minimums) {
      if ((v[champ] as string).length < min) ctx.addIssue({ code: "custom", message, path: [champ] });
    }
    v.faq.forEach((q, i) => {
      if (q.question.length < 5) {
        ctx.addIssue({ code: "custom", message: "Question anglaise trop courte", path: ["faq", i, "question"] });
      }
      if (q.answer.length < 10) {
        ctx.addIssue({ code: "custom", message: "Réponse anglaise trop courte", path: ["faq", i, "answer"] });
      }
    });
  });

const articleEditorialSchema = z.object({
  /** Absent = création (page « Nouvel article »). */
  id: z.uuid().optional(),
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
  contenuHtml: z.string().min(200, "Contenu trop court"),
  faq: faqSchema,
  articlesLies: z.array(slugSchema).max(6),
  /** Versions traduites (clé = locale) ; `en` absente = article en français seulement. */
  traductions: z.object({ en: versionSchema.optional() }),
});

export type ArticleEditorialInput = z.input<typeof articleEditorialSchema>;

/**
 * Tous les slugs publics (français et traduits) de tous les articles partagent
 * le même espace : /blog/x et /en/blog/x ne peuvent pas désigner deux articles
 * différents. Renvoie le message d'erreur si l'un des `slugs` est déjà pris
 * par un autre article (l'index unique en base reste le filet de sécurité).
 */
async function slugDejaPris(id: string | undefined, slugs: string[]): Promise<string | null> {
  const supabase = createAdminClient();
  const requete = (colonne: string) => {
    const q = supabase.from("articles").select("slug, en_slug:traductions->en->>slug").in(colonne, slugs);
    return id ? q.neq("id", id) : q;
  };
  const [francais, anglais] = await Promise.all([requete("slug"), requete("traductions->en->>slug")]);
  const erreur = francais.error ?? anglais.error;
  if (erreur) throw new Error(erreur.message);

  for (const ligne of [...(francais.data ?? []), ...(anglais.data ?? [])] as { slug: string; en_slug: string | null }[]) {
    for (const s of slugs) {
      if (ligne.slug === s) return `Le slug « ${s} » est déjà celui d'un autre article`;
      if (ligne.en_slug === s) return `Le slug « ${s} » est déjà le slug anglais d'un autre article`;
    }
  }
  return null;
}

/** Message des violations d'unicité (slug français ou anglais). */
function messageSlugEnDouble(error: { code?: string; message: string }): string {
  if (error.code !== "23505") return error.message;
  return error.message.includes("traductions_en_slug") ? "Ce slug anglais existe déjà" : "Ce slug existe déjà";
}

/**
 * Enregistre un article éditorial (toutes ses langues) ; sans `id`, le crée.
 * Un nouvel article naît avec un emplacement de couverture au format du blog
 * (/images/blog/<slug>/cover.webp, 1200×630), à remplir depuis la section Images.
 */
export type ActionPublicationEn = "publier" | "depublier";

/** Version anglaise stockée → publiable ? (mêmes exigences que le français). */
function versionEnPubliable(en: VersionTraduite): { ok: true } | { ok: false; message: string } {
  const parsed = versionSchema.safeParse({ ...versionVersInput(en), statut: "publie" });
  if (parsed.success) return { ok: true };
  return {
    ok: false,
    message: parsed.error.issues[0]?.message ?? "Version anglaise incomplète",
  };
}

function avecStatutEn(traductions: Traductions, en: VersionTraduite, statut: "brouillon" | "publie") {
  return { ...traductions, en: { ...en, statut } };
}

/**
 * Bouton « Publier EN » / « Dépublier EN » de la liste : change seulement le
 * statut de la version anglaise (visible sur /en/blog si l'article français
 * est lui-même en ligne). La publication exige une version complète.
 */
export async function changerPublicationEn(
  id: string,
  action: ActionPublicationEn
): Promise<SaveArticleResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Article inconnu" };

  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from("articles")
    .select("id, traductions")
    .eq("id", id)
    .maybeSingle();
  const traductions = ((article?.traductions ?? {}) as Traductions) ?? {};
  const en = traductions.en;
  if (!article || !en) return { ok: false, message: "Cet article n'a pas de version anglaise" };

  if (action === "publier") {
    const verdict = versionEnPubliable(en);
    if (!verdict.ok) return verdict;
  }

  const { error } = await supabase
    .from("articles")
    .update({
      traductions: avecStatutEn(traductions, en, action === "publier" ? "publie" : "brouillon"),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  await revaliderBlog();
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
  return {
    ok: true,
    message:
      action === "publier" ? "Version anglaise publiée" : "Version anglaise repassée en brouillon",
  };
}

/**
 * Publie d'un coup toutes les versions anglaises en brouillon qui sont
 * complètes ; les autres sont listées dans le message, sans bloquer.
 */
export async function publierVersionsAnglaises(): Promise<SaveArticleResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("articles").select("id, titre, traductions");
  if (error) return { ok: false, message: error.message };

  let publiees = 0;
  const ignorees: string[] = [];
  for (const article of data ?? []) {
    const traductions = ((article.traductions ?? {}) as Traductions) ?? {};
    const en = traductions.en;
    if (!en || en.statut === "publie") continue;
    const verdict = versionEnPubliable(en);
    if (!verdict.ok) {
      ignorees.push(`${article.titre} (${verdict.message})`);
      continue;
    }
    const { error: erreur } = await supabase
      .from("articles")
      .update({ traductions: avecStatutEn(traductions, en, "publie") })
      .eq("id", article.id);
    if (erreur) {
      ignorees.push(`${article.titre} (${erreur.message})`);
      continue;
    }
    publiees++;
  }

  if (publiees > 0) {
    await revaliderBlog();
    revalidatePath("/admin/blog");
  }

  const detail =
    ignorees.length > 0
      ? ` ; ${ignorees.length} ignorée(s) : ${ignorees.slice(0, 3).join(" · ")}${ignorees.length > 3 ? "…" : ""}`
      : "";
  return {
    ok: publiees > 0 || ignorees.length === 0,
    message: `${publiees} version(s) anglaise(s) publiée(s)${detail}`,
  };
}

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
  const en = a.traductions.en;
  if (en) {
    const problemesEn = problemesHtml(en.contenuHtml);
    if (problemesEn.length > 0) return { ok: false, message: `Contenu anglais refusé : ${problemesEn[0]}` };
    // Un slug anglais identique au français n'est pas un slug propre.
    if (en.slug === a.slug) en.slug = "";
  }
  const conflit = await slugDejaPris(a.id, en?.slug ? [a.slug, en.slug] : [a.slug]);
  if (conflit) return { ok: false, message: conflit };

  const colonnes = {
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
    contenu_html: a.contenuHtml,
    faq: a.faq,
    articles_lies: a.articlesLies,
    // La version anglaise vit dans l'article (textes, statut et slug propres).
    traductions: en ? { en: inputVersVersion(en) } : {},
  };

  const supabase = createAdminClient();
  let id = a.id;
  if (id) {
    const { error } = await supabase.from("articles").update(colonnes).eq("id", id);
    if (error) return { ok: false, message: messageSlugEnDouble(error) };
  } else {
    const { data, error } = await supabase
      .from("articles")
      .insert({
        ...colonnes,
        image_cover: `/images/blog/${a.slug}/cover.webp`,
        image_cover_largeur: 1200,
        image_cover_hauteur: 630,
        image_cover_alt: a.titre,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: error ? messageSlugEnDouble(error) : "Erreur" };
    id = data.id as string;
  }

  await apresChangement(id);
  revalidatePath(`/admin/blog/${id}`);
  return { ok: true, message: a.id ? "Article enregistré" : "Article créé", id };
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
