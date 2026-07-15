import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy d'autocomplétion d'adresses - Géoplateforme IGN.
 * (api-adresse.data.gouv.fr est décommissionnée, ne pas l'utiliser.)
 * Cache en mémoire par instance + cache CDN via s-maxage.
 */
const IGN_GEOCODAGE_URL = "https://data.geopf.fr/geocodage/search";

interface Suggestion {
  label: string;
  codeInsee: string;
  codePostal: string;
  ville: string;
  lat: number;
  lon: number;
}

interface IgnFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    citycode: string;
    postcode: string;
    city: string;
    score: number;
    type: string;
  };
}

const cache = new Map<string, { at: number; data: Suggestion[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1_000;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(
      { suggestions: hit.data },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  }

  const url = `${IGN_GEOCODAGE_URL}?q=${encodeURIComponent(q)}&index=address&limit=6&autocomplete=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`IGN ${res.status}`);

    const geojson = (await res.json()) as { features?: IgnFeature[] };
    const suggestions: Suggestion[] = (geojson.features ?? [])
      .filter((f) => f.properties.citycode && f.geometry?.coordinates)
      .map((f) => ({
        label: f.properties.label,
        codeInsee: f.properties.citycode,
        codePostal: f.properties.postcode,
        ville: f.properties.city,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }));

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), data: suggestions });

    console.log(`[geocode] q="${q}" → ${suggestions.length} résultat(s)`);
    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  } catch (err) {
    console.error(`[geocode] échec pour q="${q}"`, err);
    return NextResponse.json(
      { suggestions: [], error: "geocodage_indisponible" },
      { status: 502 }
    );
  }
}
