/**
 * Couche data du moteur d'estimation - appelle les fonctions SQL PostGIS
 * via le client service_role. Volontairement NON exportée par index.ts :
 * le cœur du moteur reste pur et testable sans base.
 */
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Comparable, LoyersCommune, TypeBien } from "./types";
import { deptFromInsee } from "./zones";
import {
  MIN_COMPARABLES,
  MOIS_MAX_MUTATION,
  RATIO_SURFACE_MIN,
  RATIO_SURFACE_MAX,
  type ComparablesParPalier,
} from "./vente";

export interface RechercheComparables {
  lat: number;
  lon: number;
  codeInsee: string;
  typeBien: TypeBien;
  surface: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date ISO située `mois` mois avant la date ISO donnée (calcul en UTC). */
export function moinsMois(dateIso: string, mois: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - mois);
  return isoDate(d);
}

/**
 * Dernière vente DVF connue (posée par l'import dans dvf_meta), en cache
 * 1 h : elle ne change qu'à chaque import semestriel. Null si la base est
 * vide ou la migration 20261111120000 absente → repli sur la date du jour.
 */
const dateDerniereVenteCachee = unstable_cache(
  async (): Promise<string | null> => {
    const { data, error } = await createAdminClient().rpc("dvf_derniere_vente");
    if (error || !data) return null;
    return String(data).slice(0, 10);
  },
  ["dvf-derniere-vente"],
  { revalidate: 3600, tags: ["dvf"] }
);

export async function fetchDateDerniereVente(): Promise<string | null> {
  try {
    return await dateDerniereVenteCachee();
  } catch {
    return null;
  }
}

/**
 * Fenêtre des comparables : 30 mois avant la dernière vente connue (et non
 * avant aujourd'hui, DVF étant publié avec 6 à 10 mois de retard - audit P2).
 */
export function fenetreComparables(
  derniereVente: string | null,
  now: Date
): { du: string; au: string } {
  const au = derniereVente ?? isoDate(now);
  return { du: moinsMois(au, MOIS_MAX_MUTATION), au };
}

export async function fetchComparables(
  params: RechercheComparables,
  now: Date = new Date()
): Promise<ComparablesParPalier> {
  const supabase = createAdminClient();
  const fenetre = fenetreComparables(await fetchDateDerniereVente(), now);

  const commun = {
    p_lat: params.lat,
    p_lon: params.lon,
    p_type_local: params.typeBien,
    p_surface_min: params.surface * RATIO_SURFACE_MIN,
    p_surface_max: params.surface * RATIO_SURFACE_MAX,
    p_date_min: fenetre.du,
  };

  const { data: rayon3000, error } = await supabase.rpc(
    "find_comparables_radius",
    { ...commun, p_radius_m: 3000 }
  );
  if (error) throw new Error(`find_comparables_radius : ${error.message}`);

  const result: ComparablesParPalier = {
    rayon3000: (rayon3000 ?? []) as Comparable[],
    commune: [],
    departement: [],
    fenetre,
  };

  // Paliers suivants seulement si nécessaire (économise les requêtes).
  if (result.rayon3000.length < MIN_COMPARABLES) {
    const { data: commune, error: err2 } = await supabase.rpc(
      "find_comparables_commune",
      { ...commun, p_code_insee: params.codeInsee }
    );
    if (err2) throw new Error(`find_comparables_commune : ${err2.message}`);
    result.commune = (commune ?? []) as Comparable[];

    if (result.commune.length < MIN_COMPARABLES) {
      const { data: dept, error: err3 } = await supabase.rpc(
        "find_comparables_departement",
        { ...commun, p_code_departement: deptFromInsee(params.codeInsee) }
      );
      if (err3) throw new Error(`find_comparables_departement : ${err3.message}`);
      result.departement = (dept ?? []) as Comparable[];
    }
  }

  return result;
}

export async function fetchLoyersCommune(
  codeInsee: string
): Promise<LoyersCommune | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyers_communes")
    .select(
      "loyer_m2_appartement, loyer_m2_appt_t1_t2, loyer_m2_appt_t3_plus, loyer_m2_maison, millesime"
    )
    .eq("code_insee", codeInsee)
    .maybeSingle();

  if (error) throw new Error(`loyers_communes : ${error.message}`);
  return data as LoyersCommune | null;
}
