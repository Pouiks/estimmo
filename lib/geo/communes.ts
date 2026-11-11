import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { choisirCommune, type CommuneCandidate, type ResoudreInsee } from "./geocodage";

/**
 * Résolution du code INSEE d'une commune à partir d'un code postal et d'un
 * nom (relais Photon du géocodage). Lecture de `communes_ref`, en cache
 * mémoire par code postal (5 753 codes postaux, instance chaude).
 */
const cache = new Map<string, CommuneCandidate[]>();
const CACHE_MAX = 2_000;

export async function communesDuCodePostal(codePostal: string): Promise<CommuneCandidate[]> {
  const hit = cache.get(codePostal);
  if (hit) return hit;
  const { data } = await createAdminClient()
    .from("communes_ref")
    .select("code_insee, nom_commune, code_postal")
    .eq("code_postal", codePostal)
    .limit(50);
  const candidates = (data ?? []) as CommuneCandidate[];
  if (cache.size >= CACHE_MAX) {
    const plusAncien = cache.keys().next().value;
    if (plusAncien !== undefined) cache.delete(plusAncien);
  }
  cache.set(codePostal, candidates);
  return candidates;
}

export const resoudreInseeDepuisBase: ResoudreInsee = async (codePostal, ville) =>
  choisirCommune(await communesDuCodePostal(codePostal), ville);
