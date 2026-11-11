/**
 * Import des centres et populations des communes → table communes_geo.
 *
 * Source : API Découpage administratif (geo.api.gouv.fr, Etalab / INSEE) :
 * centre géographique de chaque commune et population municipale (populations
 * légales INSEE), plus les 45 arrondissements municipaux de Paris, Lyon et
 * Marseille (codes utilisés par DVF). Licence Ouverte 2.0.
 *
 * Sert aux pages communes : « communes les plus proches » (distance à vol
 * d'oiseau) et population. France entière en un appel (~5 Mo).
 *
 * Usage :
 *   pnpm import:geo              # France entière
 *   pnpm import:geo -- --dry-run # lecture seule, statistiques
 */
import type { Client } from "pg";
import { chunk, formatCount, getDbClient, parseArgs } from "./util";

const API = "https://geo.api.gouv.fr/communes";
const CHAMPS = "fields=centre,population,codeRegion&format=json";

interface CommuneApi {
  code: string;
  nom: string;
  centre?: { type: "Point"; coordinates: [number, number] };
  population?: number;
  codeRegion?: string;
}

export interface LigneGeo {
  code_insee: string;
  lat: number;
  lon: number;
  population: number | null;
  code_region: string | null;
}

export function versLignes(communes: CommuneApi[]): LigneGeo[] {
  return communes
    .filter((c) => c.centre?.coordinates)
    .map((c) => ({
      code_insee: c.code,
      lon: c.centre!.coordinates[0],
      lat: c.centre!.coordinates[1],
      population: typeof c.population === "number" ? c.population : null,
      code_region: c.codeRegion ?? null,
    }));
}

async function lire(url: string): Promise<CommuneApi[]> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`geo.api.gouv.fr ${res.status} : ${url}`);
  return (await res.json()) as CommuneApi[];
}

async function ecrire(client: Client, lignes: LigneGeo[]) {
  for (const batch of chunk(lignes, 5_000)) {
    await client.query(
      `insert into communes_geo (code_insee, lat, lon, population, code_region, updated_at)
       select *, now() from unnest($1::text[], $2::float8[], $3::float8[], $4::int[], $5::text[])
       on conflict (code_insee) do update set
         lat = excluded.lat, lon = excluded.lon,
         population = excluded.population, code_region = excluded.code_region,
         updated_at = now()`,
      [
        batch.map((l) => l.code_insee),
        batch.map((l) => l.lat),
        batch.map((l) => l.lon),
        batch.map((l) => l.population),
        batch.map((l) => l.code_region),
      ]
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  console.log(`Import géographie des communes ${dryRun ? "(DRY-RUN) " : ""}- geo.api.gouv.fr`);

  const [communes, arrondissements] = await Promise.all([
    lire(`${API}?${CHAMPS}`),
    lire(`${API}?type=arrondissement-municipal&${CHAMPS}`),
  ]);
  const lignes = versLignes([...communes, ...arrondissements]);
  const sansPopulation = lignes.filter((l) => l.population === null).length;
  console.log(
    `  ${formatCount(communes.length)} communes + ${arrondissements.length} arrondissements → ` +
      `${formatCount(lignes.length)} lignes avec centre (${sansPopulation} sans population)`
  );
  if (dryRun) return;

  const client = getDbClient();
  await client.connect();
  try {
    await ecrire(client, lignes);
    const { rows } = await client.query("select count(*)::int as n from communes_geo");
    console.log(`Import terminé : ${formatCount(rows[0].n)} lignes dans communes_geo.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
