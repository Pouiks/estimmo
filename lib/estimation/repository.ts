/**
 * Couche data du moteur d'estimation — appelle les fonctions SQL PostGIS
 * via le client service_role. Volontairement NON exportée par index.ts :
 * le cœur du moteur reste pur et testable sans base.
 */
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

function dateMinMutation(now: Date): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - MOIS_MAX_MUTATION);
  return d.toISOString().slice(0, 10);
}

export async function fetchComparables(
  params: RechercheComparables,
  now: Date = new Date()
): Promise<ComparablesParPalier> {
  const supabase = createAdminClient();

  const commun = {
    p_lat: params.lat,
    p_lon: params.lon,
    p_type_local: params.typeBien,
    p_surface_min: params.surface * RATIO_SURFACE_MIN,
    p_surface_max: params.surface * RATIO_SURFACE_MAX,
    p_date_min: dateMinMutation(now),
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
