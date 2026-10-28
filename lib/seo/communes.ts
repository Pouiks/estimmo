import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RECHERCHE_MAX_RESULTATS,
  analyserRecherche,
  motifsRecherche,
} from "./recherche";

export interface CommuneStats {
  code_insee: string;
  nom_commune: string;
  slug: string;
  code_postal: string | null;
  departement: string;
  prix_m2_median_appartement: number | null;
  prix_m2_median_maison: number | null;
  nb_ventes_12m: number;
  evolution_1an_pct: number | null;
  updated_at: string;
}

export interface LoyersCommuneRow {
  loyer_m2_appartement: number | null;
  loyer_m2_appt_t1_t2: number | null;
  loyer_m2_appt_t3_plus: number | null;
  loyer_m2_maison: number | null;
  millesime: number;
}

export async function getCommuneBySlug(
  slug: string
): Promise<CommuneStats | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("communes_stats")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as CommuneStats | null;
}

export async function getLoyersByInsee(
  codeInsee: string
): Promise<LoyersCommuneRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("loyers_communes")
    .select(
      "loyer_m2_appartement, loyer_m2_appt_t1_t2, loyer_m2_appt_t3_plus, loyer_m2_maison, millesime"
    )
    .eq("code_insee", codeInsee)
    .maybeSingle();
  return data as LoyersCommuneRow | null;
}

/** Communes voisines du même département, triées par volume de ventes. */
export async function getCommunesVoisines(
  departement: string,
  excludeInsee: string,
  limit = 8
): Promise<Pick<CommuneStats, "slug" | "nom_commune" | "code_postal">[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("communes_stats")
    .select("slug, nom_commune, code_postal")
    .eq("departement", departement)
    .neq("code_insee", excludeInsee)
    .order("nb_ventes_12m", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTopCommunes(
  limit: number
): Promise<Pick<CommuneStats, "slug" | "nom_commune" | "code_postal" | "prix_m2_median_appartement" | "nb_ventes_12m">[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("communes_stats")
    .select("slug, nom_commune, code_postal, prix_m2_median_appartement, nb_ventes_12m")
    .order("nb_ventes_12m", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type CommuneListe = Pick<
  CommuneStats,
  "slug" | "nom_commune" | "code_postal" | "prix_m2_median_appartement" | "prix_m2_median_maison" | "nb_ventes_12m"
>;

/** Toutes les communes d'un département (paginé : jusqu'à ~900 communes). */
export async function getCommunesByDepartement(
  departement: string
): Promise<CommuneListe[]> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  const all: CommuneListe[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("communes_stats")
      .select(
        "slug, nom_commune, code_postal, prix_m2_median_appartement, prix_m2_median_maison, nb_ventes_12m"
      )
      .eq("departement", departement)
      .order("nb_ventes_12m", { ascending: false })
      .order("nom_commune")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as CommuneListe[]));
    if (data.length < pageSize) break;
  }
  return all;
}

export type CommuneTrouvee = Pick<
  CommuneStats,
  "slug" | "nom_commune" | "code_postal" | "departement" | "nb_ventes_12m"
>;

/**
 * Recherche de commune par début de nom ou de code postal (saisie libre),
 * éventuellement limitée à un département. Les marchés les plus actifs
 * d'abord ; les correspondances en début de nom avant celles en milieu de nom.
 */
export async function rechercherCommunes(
  saisie: string,
  departement?: string
): Promise<CommuneTrouvee[]> {
  const recherche = analyserRecherche(saisie);
  if (!recherche) return [];

  const supabase = createAdminClient();
  const requete = (motif: string) => {
    let q = supabase
      .from("communes_stats")
      .select("slug, nom_commune, code_postal, departement, nb_ventes_12m")
      .like(recherche.champ, motif);
    if (departement) q = q.eq("departement", departement);
    return q
      .order("nb_ventes_12m", { ascending: false })
      .order("nom_commune")
      .limit(RECHERCHE_MAX_RESULTATS);
  };

  const reponses = await Promise.all(motifsRecherche(recherche).map(requete));
  const vus = new Set<string>();
  const communes: CommuneTrouvee[] = [];
  for (const { data } of reponses) {
    for (const c of (data ?? []) as CommuneTrouvee[]) {
      if (vus.has(c.slug)) continue;
      vus.add(c.slug);
      communes.push(c);
    }
  }
  return communes.slice(0, RECHERCHE_MAX_RESULTATS);
}

export interface DepartementResume {
  departement: string;
  nb_communes: number;
  nb_ventes_12m: number;
}

/** Nombre de communes et de ventes par département (RPC agrégée). */
export async function getDepartementsResume(): Promise<DepartementResume[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("departements_resume");
  if (error) throw new Error(`departements_resume : ${error.message}`);
  return ((data ?? []) as DepartementResume[]).map((d) => ({
    departement: d.departement,
    nb_communes: Number(d.nb_communes),
    nb_ventes_12m: Number(d.nb_ventes_12m),
  }));
}

/** Tous les slugs (pour le sitemap). */
export async function getAllCommuneSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = createAdminClient();
  const pageSize = 1000;
  const all: { slug: string; updated_at: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("communes_stats")
      .select("slug, updated_at")
      .order("slug")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}
