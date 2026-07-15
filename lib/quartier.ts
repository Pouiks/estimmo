import "server-only";

/**
 * Intelligence de quartier : équipements autour d'un point, via l'API
 * Overpass (OpenStreetMap). Gratuit, sans clé. Une seule requête compacte
 * retourne 5 compteurs. Cache mémoire 24 h par carreau de ~110 m.
 * En cas d'échec (timeout, 429) : null, l'UI n'affiche simplement rien.
 */
export interface QuartierStats {
  /** Écoles et maternelles à moins de 500 m */
  ecoles: number;
  /** Arrêts de bus (400 m) + gares, métros et trams (900 m) */
  transports: number;
  /** Commerces à moins de 500 m */
  commerces: number;
  /** Parcs et jardins à moins de 600 m */
  parcs: number;
}

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const cache = new Map<string, { at: number; data: QuartierStats }>();
const CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_MAX_ENTRIES = 2_000;

function buildQuery(lat: number, lon: number): string {
  const p = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  // 5 ensembles nommés, chacun suivi de "out count" : la réponse contient
  // 5 éléments de type "count", dans cet ordre.
  return `[out:json][timeout:6];
(node(around:500,${p})[amenity~"^(school|kindergarten)$"];way(around:500,${p})[amenity~"^(school|kindergarten)$"];)->.ecoles;
.ecoles out count;
node(around:400,${p})[highway=bus_stop]->.bus;
.bus out count;
(node(around:900,${p})[railway~"^(station|halt|tram_stop)$"];node(around:900,${p})[station=subway];)->.gares;
.gares out count;
(node(around:500,${p})[shop];way(around:500,${p})[shop];)->.commerces;
.commerces out count;
(way(around:600,${p})[leisure=park];node(around:600,${p})[leisure=park];)->.parcs;
.parcs out count;`;
}

export async function fetchQuartierStats(
  lat: number,
  lon: number
): Promise<QuartierStats | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const body = `data=${encodeURIComponent(buildQuery(lat, lon))}`;

  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "estimmo.fr (estimation immobiliere)",
        },
        body,
        signal: AbortSignal.timeout(7_000),
      });
      if (!res.ok) continue;

      const json = (await res.json()) as {
        elements?: { type: string; tags?: { total?: string } }[];
      };
      const counts = (json.elements ?? [])
        .filter((e) => e.type === "count")
        .map((e) => Number.parseInt(e.tags?.total ?? "0", 10) || 0);

      if (counts.length < 5) continue;

      const stats: QuartierStats = {
        ecoles: counts[0],
        transports: counts[1] + counts[2],
        commerces: counts[3],
        parcs: counts[4],
      };

      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { at: Date.now(), data: stats });
      return stats;
    } catch {
      // essaie le miroir suivant
    }
  }

  console.warn(`[quartier] Overpass indisponible pour ${key}`);
  return null;
}
