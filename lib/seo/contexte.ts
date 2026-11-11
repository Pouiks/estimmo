import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContexteCommune } from "./analyse";

/**
 * Contexte d'une commune (RPC `commune_contexte`, migration 20261112110000) :
 * géographie, INSEE, département, communes les plus proches, séries annuelles.
 * Tant que la migration n'est pas appliquée (fonction absente) ou que les
 * imports n'ont pas été lancés, la page se rend sans ces sections.
 */
export async function getContexteCommune(codeInsee: string): Promise<ContexteCommune | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("commune_contexte", { p_code_insee: codeInsee });
  if (error || !data) {
    if (error) console.warn(`[commune_contexte] ${codeInsee} : ${error.message}`);
    return null;
  }
  const brut = data as Partial<ContexteCommune>;
  return {
    geo: brut.geo ?? null,
    insee: brut.insee ?? null,
    departement: brut.departement ?? null,
    voisines: (brut.voisines ?? []).map((v) => ({
      ...v,
      distance_km: Number(v.distance_km),
      nb_ventes_12m: Number(v.nb_ventes_12m),
    })),
    annuelles: brut.annuelles ?? [],
    derniere_vente: brut.derniere_vente ?? null,
  };
}
