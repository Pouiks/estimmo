import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
