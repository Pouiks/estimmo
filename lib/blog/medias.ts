import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimiserImage, type Position } from "./optimisation";

/**
 * Bibliothèque d'images du blog : fichiers dans Supabase Storage (bucket
 * public « blog ») + table medias (alt, légende, dimensions, usages).
 *
 * Dossiers du bucket :
 *  - visuels/<slug>-<cover|image-1|image-2>-<id>.webp  recadrés pour un emplacement
 *  - bibliotheque/<nom>-<id>.webp                       envois libres
 *  - articles/<uuid>.<ext>                              ancien éditeur visuel
 * Chaque fichier a un nom unique : le cache navigateur/CDN peut être infini.
 */
export const BUCKET = "blog";
const DOSSIERS = ["visuels", "bibliotheque", "articles"];

/** Largeur et poids maximaux d'un envoi libre (recadrable ensuite pour un emplacement). */
export const LIBRE_LARGEUR_MAX = 2000;
export const LIBRE_POIDS_MAX = 350 * 1024;

export type FormatMedia = "cover" | "corps" | "libre";

export interface Media {
  id: string;
  chemin: string;
  url: string;
  alt: string;
  legende: string | null;
  largeur: number;
  hauteur: number;
  taille: number;
  format: FormatMedia;
  prompt: string | null;
  parent_id: string | null;
  created_at: string;
}

const CHAMPS = "id, chemin, url, alt, legende, largeur, hauteur, taille, format, prompt, parent_id, created_at";

export function suffixeUnique(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function urlPublique(chemin: string): string {
  return createAdminClient().storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

/** Format d'un emplacement d'après ses dimensions. */
export function formatPour(largeur: number, hauteur: number): FormatMedia {
  if (largeur === 1200 && hauteur === 630) return "cover";
  if (largeur === 1200 && hauteur === 800) return "corps";
  return "libre";
}

// ----- Storage ---------------------------------------------------------------

async function deposerFichier(chemin: string, donnees: Buffer, contentType = "image/webp") {
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(chemin, donnees, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
}

async function telecharger(chemin: string): Promise<Buffer> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(chemin);
  if (error || !data) throw new Error(error?.message ?? "Téléchargement impossible");
  return Buffer.from(await data.arrayBuffer());
}

// ----- Base ------------------------------------------------------------------

export async function listerMedias(): Promise<Media[]> {
  const { data, error } = await createAdminClient()
    .from("medias")
    .select(CHAMPS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Media[];
}

export async function mediaParId(id: string): Promise<Media | null> {
  const { data } = await createAdminClient().from("medias").select(CHAMPS).eq("id", id).maybeSingle();
  return (data as Media | null) ?? null;
}

async function insererMedia(
  media: Omit<Media, "id" | "created_at" | "url"> & { url?: string }
): Promise<Media> {
  const { data, error } = await createAdminClient()
    .from("medias")
    .insert({ ...media, url: media.url ?? urlPublique(media.chemin) })
    .select(CHAMPS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Insertion impossible");
  return data as Media;
}

export async function modifierMedia(
  id: string,
  champs: Partial<Pick<Media, "alt" | "legende" | "prompt">>
): Promise<void> {
  const { error } = await createAdminClient().from("medias").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Dépose une image optimisée et l'enregistre dans la bibliothèque.
 * - recadrer : dimensions exactes d'un emplacement (format cover/corps) ;
 * - libre    : proportions conservées, 2000 px / 350 Ko max.
 */
export async function creerMedia(params: {
  source: Buffer;
  nomBase: string;
  alt?: string;
  legende?: string | null;
  prompt?: string | null;
  parentId?: string | null;
  cible:
    | { mode: "recadrer"; largeur: number; hauteur: number; position: Position }
    | { mode: "libre" };
}): Promise<{ media: Media; agrandie: boolean }> {
  const image =
    params.cible.mode === "recadrer"
      ? await optimiserImage(params.source, params.cible)
      : await optimiserImage(
          params.source,
          { mode: "limiter", largeurMax: LIBRE_LARGEUR_MAX },
          LIBRE_POIDS_MAX
        );
  const dossier = params.cible.mode === "recadrer" ? "visuels" : "bibliotheque";
  const chemin = `${dossier}/${params.nomBase}-${suffixeUnique()}.webp`;
  // L'URL publique se déduit du chemin : dépôt et insertion en parallèle.
  let media: Media;
  try {
    [media] = await Promise.all([
      insererMedia({
        chemin,
        alt: params.alt ?? "",
        legende: params.legende ?? null,
        largeur: image.largeur,
        hauteur: image.hauteur,
        taille: image.donnees.length,
        format: formatPour(image.largeur, image.hauteur),
        prompt: params.prompt ?? null,
        parent_id: params.parentId ?? null,
      }),
      deposerFichier(chemin, image.donnees),
    ]);
  } catch (err) {
    // Jamais de ligne sans fichier ni de fichier sans ligne.
    const supabase = createAdminClient();
    await Promise.allSettled([
      supabase.from("medias").delete().eq("chemin", chemin),
      supabase.storage.from(BUCKET).remove([chemin]),
    ]);
    throw err;
  }
  return { media, agrandie: image.agrandie };
}

/** Recadre un média existant aux dimensions d'un emplacement (nouveau média dérivé). */
export async function recadrerMedia(
  media: Media,
  cible: { largeur: number; hauteur: number; nomBase: string }
): Promise<{ media: Media; agrandie: boolean }> {
  const source = await telecharger(media.chemin);
  return creerMedia({
    source,
    nomBase: cible.nomBase,
    alt: media.alt,
    legende: media.legende,
    prompt: media.prompt,
    parentId: media.id,
    cible: { mode: "recadrer", largeur: cible.largeur, hauteur: cible.hauteur, position: "auto" },
  });
}

/** Supprime le fichier et sa ligne. Les emplacements qui l'utilisaient sont libérés par l'appelant. */
export async function supprimerMedia(media: Media): Promise<void> {
  const storage = createAdminClient().storage.from(BUCKET);
  const { error } = await storage.remove([media.chemin]);
  // Fichier déjà absent : on nettoie quand même la ligne.
  if (error && !/not found/i.test(error.message)) throw new Error(error.message);
  const { error: errBase } = await createAdminClient().from("medias").delete().eq("id", media.id);
  if (errBase) throw new Error(errBase.message);
}

// ----- Usages ----------------------------------------------------------------

export interface UsageMedia {
  id: string;
  titre: string;
}

/** Articles qui utilisent chaque url (emplacement, couverture, corps HTML fr/en ou contenu TipTap). */
export async function usagesParUrl(medias: Media[]): Promise<Map<string, UsageMedia[]>> {
  const { data } = await createAdminClient()
    .from("articles")
    .select("id, titre, image_cover, visuels, contenu_html, contenu, traductions");
  const usages = new Map<string, UsageMedia[]>();
  for (const a of data ?? []) {
    const texte = JSON.stringify([a.image_cover, a.visuels, a.contenu_html, a.contenu, a.traductions]);
    for (const m of medias) {
      if (texte.includes(m.url)) {
        usages.set(m.url, [...(usages.get(m.url) ?? []), { id: a.id, titre: a.titre }]);
      }
    }
  }
  return usages;
}

/** Retire une url de tous les emplacements d'article ; renvoie les articles touchés. */
export async function libererEmplacements(url: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("articles").select("id, visuels");
  const touches: string[] = [];
  for (const a of data ?? []) {
    const visuels = (a.visuels ?? {}) as Record<string, string>;
    if (!Object.values(visuels).includes(url)) continue;
    const reste = Object.fromEntries(Object.entries(visuels).filter(([, u]) => u !== url));
    await supabase.from("articles").update({ visuels: reste }).eq("id", a.id);
    touches.push(a.id);
  }
  return touches;
}

// ----- Synchronisation Storage → base ---------------------------------------

/**
 * Enregistre dans la table les fichiers du bucket qui n'y sont pas encore
 * (envois antérieurs à la bibliothèque, dépôts manuels). Dimensions lues
 * depuis le fichier. Renvoie les médias ajoutés.
 */
export async function synchroniserStorage(existants: Media[]): Promise<Media[]> {
  const storage = createAdminClient().storage.from(BUCKET);
  const connus = new Set(existants.map((m) => m.chemin));

  type Entree = { dossier: string; nom: string; taille: number; estDossier: boolean };
  const lister = async (dossier: string): Promise<Entree[]> => {
    const { data, error } = await storage.list(dossier, { limit: 1000 });
    if (error) throw new Error(error.message);
    // Un dossier n'a pas d'id dans l'API Storage ; .emptyFolderPlaceholder = marqueur.
    return (data ?? [])
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        dossier,
        nom: e.name,
        taille: Number(e.metadata?.size ?? 0),
        estDossier: e.id === null,
      }));
  };

  // Dossiers en parallèle, puis un niveau de sous-dossiers (ancien rangement visuels/<slug>/).
  const racine = (await Promise.all(DOSSIERS.map(lister))).flat();
  const sousDossiers = racine.filter((e) => e.estDossier).map((e) => `${e.dossier}/${e.nom}`);
  const profondeur = (await Promise.all(sousDossiers.map(lister))).flat();
  const fichiers = [...racine, ...profondeur].filter((e) => !e.estDossier);

  const ajoutes: Media[] = [];
  for (const f of fichiers) {
    const chemin = `${f.dossier}/${f.nom}`;
    if (connus.has(chemin)) continue;
    const { default: sharp } = await import("sharp");
    const meta = await sharp(await telecharger(chemin)).metadata();
    if (!meta.width || !meta.height) continue;
    ajoutes.push(
      await insererMedia({
        chemin,
        alt: "",
        legende: null,
        largeur: meta.width,
        hauteur: meta.height,
        taille: f.taille,
        format: formatPour(meta.width, meta.height),
        prompt: null,
        parent_id: null,
      })
    );
  }
  return ajoutes;
}
