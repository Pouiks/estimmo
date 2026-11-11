/**
 * Import du recensement INSEE (base « Logement », niveau commune) → table
 * communes_insee : logements, résidences principales, résidences principales
 * occupées par leur propriétaire, maisons, appartements.
 *
 * Source : INSEE, « Logement en 2022 - Base des principaux indicateurs »
 * (RP2022, géographie au 1er janvier 2025), Licence Ouverte 2.0. Zip de 41 Mo
 * contenant base-cc-logement-2022.CSV (séparateur « ; », une ligne par commune
 * et par arrondissement municipal, valeurs estimées non entières) et le
 * dictionnaire des variables. Mayotte absente.
 *
 * Usage :
 *   pnpm import:insee              # France entière
 *   pnpm import:insee -- --dry-run # lecture seule, statistiques
 */
import { parse } from "csv-parse/sync";
import { unzipSync, strFromU8 } from "fflate";
import type { Client } from "pg";
import { chunk, formatCount, getDbClient, parseArgs } from "./util";

const MILLESIME = 2022;
const URL_ZIP =
  "https://www.insee.fr/fr/statistiques/fichier/8581474/base-cc-logement-2022_csv.zip";
const FICHIER = /^base-cc-logement-2022\.csv$/i;

const COLONNES = {
  logements: "P22_LOG",
  residences_principales: "P22_RP",
  rp_proprietaires: "P22_RP_PROP",
  maisons: "P22_MAISON",
  appartements: "P22_APPART",
} as const;

export interface LigneInsee {
  code_insee: string;
  logements: number | null;
  residences_principales: number | null;
  rp_proprietaires: number | null;
  maisons: number | null;
  appartements: number | null;
}

function entier(valeur: string | undefined): number | null {
  if (valeur === undefined || valeur.trim() === "") return null;
  const n = Number.parseFloat(valeur.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function versLignes(lignes: Record<string, string>[]): LigneInsee[] {
  return lignes
    .filter((l) => l.CODGEO && /^[0-9][0-9AB][0-9]{3}$/.test(l.CODGEO))
    .map((l) => ({
      code_insee: l.CODGEO,
      logements: entier(l[COLONNES.logements]),
      residences_principales: entier(l[COLONNES.residences_principales]),
      rp_proprietaires: entier(l[COLONNES.rp_proprietaires]),
      maisons: entier(l[COLONNES.maisons]),
      appartements: entier(l[COLONNES.appartements]),
    }));
}

async function telecharger(): Promise<string> {
  const res = await fetch(URL_ZIP);
  if (!res.ok) throw new Error(`INSEE ${res.status} : ${URL_ZIP}`);
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const nom = Object.keys(zip).find((n) => FICHIER.test(n.split("/").pop() ?? ""));
  if (!nom) throw new Error(`Fichier CSV introuvable dans le zip : ${Object.keys(zip).join(", ")}`);
  return strFromU8(zip[nom]);
}

async function ecrire(client: Client, lignes: LigneInsee[]) {
  for (const batch of chunk(lignes, 5_000)) {
    await client.query(
      `insert into communes_insee
         (code_insee, millesime, logements, residences_principales, rp_proprietaires,
          maisons, appartements, updated_at)
       select *, now() from unnest(
         $1::text[], $2::smallint[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[]
       )
       on conflict (code_insee) do update set
         millesime = excluded.millesime,
         logements = excluded.logements,
         residences_principales = excluded.residences_principales,
         rp_proprietaires = excluded.rp_proprietaires,
         maisons = excluded.maisons,
         appartements = excluded.appartements,
         updated_at = now()`,
      [
        batch.map((l) => l.code_insee),
        batch.map(() => MILLESIME),
        batch.map((l) => l.logements),
        batch.map((l) => l.residences_principales),
        batch.map((l) => l.rp_proprietaires),
        batch.map((l) => l.maisons),
        batch.map((l) => l.appartements),
      ]
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  console.log(`Import INSEE logement ${dryRun ? "(DRY-RUN) " : ""}- RP${MILLESIME}`);

  const csv = await telecharger();
  const brut = parse(csv, { columns: true, delimiter: ";", bom: true }) as Record<string, string>[];
  const lignes = versLignes(brut);
  const vides = lignes.filter((l) => l.logements === null).length;
  console.log(`  ${formatCount(lignes.length)} communes lues (${vides} sans données)`);
  if (dryRun) return;

  const client = getDbClient();
  await client.connect();
  try {
    await ecrire(client, lignes);
    const { rows } = await client.query("select count(*)::int as n from communes_insee");
    console.log(`Import terminé : ${formatCount(rows[0].n)} lignes dans communes_insee.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
