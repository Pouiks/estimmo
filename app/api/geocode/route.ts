import { NextResponse, type NextRequest } from "next/server";
import { resoudreInseeDepuisBase } from "@/lib/geo/communes";
import { geocoder, type Suggestion, type SourceGeocodage } from "@/lib/geo/geocodage";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Autocomplétion d'adresses : Géoplateforme IGN, relais Photon (OSM) en cas
 * de panne (voir lib/geo/geocodage.ts). Cache en mémoire par instance +
 * cache CDN via s-maxage ; une réponse sans fournisseur n'est pas mise en cache.
 * (api-adresse.data.gouv.fr est décommissionnée, ne pas l'utiliser.)
 */
const cache = new Map<string, { at: number; data: Suggestion[]; source: SourceGeocodage }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1_000;

export async function GET(request: NextRequest) {
  // Proxy vers des services tiers : on protège leur quota et notre IP sortante.
  const limited = rateLimit(request, {
    scope: "geocode",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }
  const citycode = request.nextUrl.searchParams.get("citycode")?.trim() || undefined;
  if (citycode && !/^[0-9][0-9AB][0-9]{3}$/.test(citycode)) {
    return NextResponse.json({ suggestions: [] }, { status: 400 });
  }

  const key = `${citycode ?? ""}|${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(
      { suggestions: hit.data, source: hit.source },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  }

  const { suggestions, source } = await geocoder(q, {
    resoudreInsee: resoudreInseeDepuisBase,
    citycode,
  });

  if (source === "aucune") {
    return NextResponse.json(
      { suggestions: [], source, error: "geocodage_indisponible" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), data: suggestions, source });

  if (source !== "ign") {
    console.warn(`[geocode] relais ${source} pour q="${q}" → ${suggestions.length} résultat(s)`);
  }
  return NextResponse.json(
    { suggestions, source },
    { headers: { "Cache-Control": "public, s-maxage=86400" } }
  );
}
