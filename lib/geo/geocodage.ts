import { slugify } from "@/lib/utils";

/**
 * Géocodage d'adresses avec relais automatique (fonctions pures, testées).
 *
 * 1. Géoplateforme IGN (base adresse nationale, code INSEE fourni) ;
 * 2. Photon (komoot, base OpenStreetMap) si l'IGN est en panne ou muet :
 *    pas de code INSEE dans la réponse, on le retrouve dans `communes_ref`
 *    par code postal et nom de commune ;
 * 3. (voir lib/geo/communes.ts) nos propres communes si tout est en panne.
 *
 * L'autocomplétion est le premier geste du tunnel : une panne du fournisseur
 * (IGN indisponible plusieurs heures le 11/11/2026) ne doit plus bloquer les
 * prospects.
 */

export interface Suggestion {
  label: string;
  codeInsee: string;
  codePostal: string;
  ville: string;
  lat: number;
  lon: number;
}

export type SourceGeocodage = "ign" | "photon" | "communes" | "aucune";

export interface ResultatGeocodage {
  suggestions: Suggestion[];
  source: SourceGeocodage;
}

/** Commune candidate à la résolution du code INSEE (ligne de communes_ref). */
export interface CommuneCandidate {
  code_insee: string;
  nom_commune: string;
  code_postal: string | null;
}

export type ResoudreInsee = (
  codePostal: string,
  ville: string
) => Promise<CommuneCandidate | null>;

export const IGN_GEOCODAGE_URL = "https://data.geopf.fr/geocodage/search";
export const PHOTON_URL = "https://photon.komoot.io/api/";

const TIMEOUT_MS = 5_000;
const LIMITE = 6;

// ---------------------------------------------------------------------------
// IGN
// ---------------------------------------------------------------------------

export interface IgnFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    citycode: string;
    postcode: string;
    city: string;
    score?: number;
    type?: string;
  };
}

export function urlIgn(q: string, citycode?: string): string {
  const params = new URLSearchParams({
    q,
    index: "address",
    limit: String(LIMITE),
    autocomplete: "1",
  });
  if (citycode) params.set("citycode", citycode);
  return `${IGN_GEOCODAGE_URL}?${params}`;
}

export function suggestionsIgn(geojson: { features?: IgnFeature[] }): Suggestion[] {
  return (geojson.features ?? [])
    .filter((f) => f.properties?.citycode && f.geometry?.coordinates)
    .map((f) => ({
      label: f.properties.label,
      codeInsee: f.properties.citycode,
      codePostal: f.properties.postcode,
      ville: f.properties.city,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
}

// ---------------------------------------------------------------------------
// Photon (OpenStreetMap)
// ---------------------------------------------------------------------------

export interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    postcode?: string;
    countrycode?: string;
  };
}

/** Types Photon exploitables pour situer un bien. */
const TYPES_PHOTON = new Set(["house", "street", "city", "locality", "district"]);

export function urlPhoton(q: string, biais?: { lat: number; lon: number }): string {
  const params = new URLSearchParams({ q, lang: "fr", limit: String(LIMITE * 2) });
  if (biais) {
    params.set("lat", String(biais.lat));
    params.set("lon", String(biais.lon));
    params.set("location_bias_scale", "0.5");
  }
  return `${PHOTON_URL}?${params}`;
}

/** Libellé à la manière de la base adresse : « 10 Rue de la République, 30000 Nîmes ». */
export function libellePhoton(p: PhotonFeature["properties"], ville: string): string {
  const voie = [p.housenumber, p.street ?? (p.type !== "city" ? p.name : undefined)]
    .filter(Boolean)
    .join(" ");
  const localite = [p.postcode, ville].filter(Boolean).join(" ");
  return voie && voie !== ville ? `${voie}, ${localite}` : localite;
}

/**
 * Convertit une réponse Photon en suggestions, en retrouvant le code INSEE de
 * chaque commune (France seulement). Les lignes sans commune résolue sont
 * ignorées : l'estimation exige un code INSEE.
 */
export async function suggestionsPhoton(
  geojson: { features?: PhotonFeature[] },
  resoudreInsee: ResoudreInsee
): Promise<Suggestion[]> {
  const features = (geojson.features ?? []).filter(
    (f) =>
      f.properties?.countrycode === "FR" &&
      f.properties.postcode &&
      f.geometry?.coordinates &&
      TYPES_PHOTON.has(f.properties.type ?? "")
  );
  const resolues = await Promise.all(
    features.map(async (f) => {
      const p = f.properties;
      const ville = p.type === "city" ? (p.name ?? p.city ?? "") : (p.city ?? p.name ?? "");
      const commune = await resoudreInsee(p.postcode!, ville);
      if (!commune) return null;
      return {
        label: libellePhoton(p, commune.nom_commune),
        codeInsee: commune.code_insee,
        codePostal: p.postcode!,
        ville: commune.nom_commune,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      } satisfies Suggestion;
    })
  );
  const vues = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const s of resolues) {
    if (!s || vues.has(s.label)) continue;
    vues.add(s.label);
    suggestions.push(s);
  }
  return suggestions.slice(0, LIMITE);
}

/**
 * Choisit la commune correspondant à un nom parmi celles d'un code postal :
 * nom identique (sans accents ni ponctuation), sinon la seule candidate,
 * sinon un nom qui commence pareil (« Paris » pour « Paris 1er Arrondissement »).
 */
export function choisirCommune(
  candidates: CommuneCandidate[],
  ville: string
): CommuneCandidate | null {
  if (candidates.length === 0) return null;
  const voulu = slugify(ville);
  const exacte = candidates.find((c) => slugify(c.nom_commune) === voulu);
  if (exacte) return exacte;
  if (candidates.length === 1) return candidates[0];
  if (!voulu) return null;
  const prefixe = candidates.filter((c) => slugify(c.nom_commune).startsWith(`${voulu}-`));
  return prefixe.length === 1 ? prefixe[0] : null;
}

// ---------------------------------------------------------------------------
// Chaîne de relais
// ---------------------------------------------------------------------------

export interface OptionsGeocodage {
  fetch?: typeof fetch;
  resoudreInsee: ResoudreInsee;
  /** Code INSEE imposé (formulaire d'une page commune). */
  citycode?: string;
  /** Centre de la commune pour orienter Photon, qui n'a pas de filtre INSEE. */
  biais?: { lat: number; lon: number };
  /** Dernier recours : communes de notre base (nom ou code postal). */
  communesLocales?: (q: string) => Promise<Suggestion[]>;
  timeoutMs?: number;
}

async function lireJson<T>(
  url: string,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<T> {
  const res = await fetchFn(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * IGN d'abord ; Photon si l'IGN échoue (erreur, délai) ; nos communes si
 * les deux échouent. Une réponse vide d'un fournisseur qui fonctionne est
 * une vraie réponse (adresse inconnue), on ne passe pas au suivant.
 */
export async function geocoder(
  q: string,
  options: OptionsGeocodage
): Promise<ResultatGeocodage> {
  const fetchFn = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const erreurs: string[] = [];

  try {
    const geojson = await lireJson<{ features?: IgnFeature[] }>(
      urlIgn(q, options.citycode),
      fetchFn,
      timeoutMs
    );
    return { suggestions: suggestionsIgn(geojson), source: "ign" };
  } catch (err) {
    erreurs.push(`ign: ${(err as Error).message}`);
  }

  try {
    const geojson = await lireJson<{ features?: PhotonFeature[] }>(
      urlPhoton(q, options.biais),
      fetchFn,
      timeoutMs
    );
    let suggestions = await suggestionsPhoton(geojson, options.resoudreInsee);
    if (options.citycode) {
      suggestions = suggestions.filter((s) => s.codeInsee === options.citycode);
    }
    return { suggestions, source: "photon" };
  } catch (err) {
    erreurs.push(`photon: ${(err as Error).message}`);
  }

  if (options.communesLocales) {
    try {
      const suggestions = await options.communesLocales(q);
      if (suggestions.length > 0) return { suggestions, source: "communes" };
    } catch (err) {
      erreurs.push(`communes: ${(err as Error).message}`);
    }
  }

  console.error(`[geocode] tous les fournisseurs ont échoué pour q="${q}" (${erreurs.join(" ; ")})`);
  return { suggestions: [], source: "aucune" };
}
