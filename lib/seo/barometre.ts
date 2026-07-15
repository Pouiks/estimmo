import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Donnees du barometre des prix (page /barometre-immobilier).
 * Agregats uniquement (licence DVF). Seuil de volume pour que les
 * classements restent statistiquement serieux.
 */
export const SEUIL_VENTES = 100;

export interface LigneBarometre {
  nom_commune: string;
  slug: string;
  code_postal: string | null;
  departement: string;
  prix_m2_median_appartement: number | null;
  prix_m2_median_maison: number | null;
  evolution_1an_pct: number | null;
  nb_ventes_12m: number;
}

export interface KpisBarometre {
  nb_communes: number;
  nb_ventes_12m: number;
  updated_at: string | null;
}

const COLONNES =
  "nom_commune, slug, code_postal, departement, prix_m2_median_appartement, prix_m2_median_maison, evolution_1an_pct, nb_ventes_12m";

export async function getKpisBarometre(): Promise<KpisBarometre> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("barometre_kpis");
  if (error) throw new Error(`barometre_kpis : ${error.message}`);
  return data as KpisBarometre;
}

async function top(
  orderBy: "evolution_1an_pct" | "prix_m2_median_appartement",
  ascending: boolean,
  limit: number
): Promise<LigneBarometre[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("communes_stats")
    .select(COLONNES)
    .gte("nb_ventes_12m", SEUIL_VENTES)
    .not(orderBy, "is", null)
    .order(orderBy, { ascending })
    .limit(limit);
  if (error) throw new Error(`barometre top ${orderBy} : ${error.message}`);
  return (data ?? []) as LigneBarometre[];
}

export const getPlusFortesHausses = () => top("evolution_1an_pct", false, 10);
export const getPlusFortesBaisses = () => top("evolution_1an_pct", true, 10);
export const getPlusCheres = () =>
  top("prix_m2_median_appartement", false, 10);
export const getPlusAbordables = () =>
  top("prix_m2_median_appartement", true, 10);

/** Les plus gros marches (volume de ventes), pour le tableau de tete. */
export async function getGrandsMarches(limit = 20): Promise<LigneBarometre[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("communes_stats")
    .select(COLONNES)
    .order("nb_ventes_12m", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`barometre grands marches : ${error.message}`);
  return (data ?? []) as LigneBarometre[];
}
