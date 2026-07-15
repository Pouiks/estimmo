/**
 * Import « Carte des loyers » ANIL → table loyers_communes.
 *
 * Source : data.gouv.fr - indicateurs de loyers d'annonce par commune
 * (données Groupe SeLoger + leboncoin, publication annuelle par l'ANIL).
 * Couverture : toute la France hors Mayotte.
 *
 * Mention légale obligatoire à chaque affichage d'un loyer :
 * « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »
 *
 * Usage :
 *   pnpm import:loyers               # importe le millésime configuré
 *   pnpm import:loyers -- --dry-run  # parse + stats, sans écrire en base
 */
import type { Client } from "pg";
import {
  chunk,
  fetchCsvStream,
  formatCount,
  getDbClient,
  parseArgs,
  parseFrenchNumber,
} from "./util";

// Millésime 2025 (loyers observés T3 2025) - liens pérennes data.gouv.fr.
// À mettre à jour à chaque publication annuelle de l'ANIL.
const MILLESIME = 2025;
const RESOURCES: Record<ColumnKey, string> = {
  loyer_m2_appartement:
    "https://www.data.gouv.fr/api/1/datasets/r/55b34088-0964-415f-9df7-d87dd98a09be",
  loyer_m2_appt_t1_t2:
    "https://www.data.gouv.fr/api/1/datasets/r/14a1fe11-b2d1-49b3-9f6b-83d12df9482c",
  loyer_m2_appt_t3_plus:
    "https://www.data.gouv.fr/api/1/datasets/r/5e3b28a4-cf56-43a3-ae79-43cceeb27f8c",
  loyer_m2_maison:
    "https://www.data.gouv.fr/api/1/datasets/r/129f764d-b613-44e4-952c-5ff50a8c9b73",
};

type ColumnKey =
  | "loyer_m2_appartement"
  | "loyer_m2_appt_t1_t2"
  | "loyer_m2_appt_t3_plus"
  | "loyer_m2_maison";

interface CommuneLoyers {
  nom: string;
  dept: string;
  values: Partial<Record<ColumnKey, number>>;
}

async function importResource(
  key: ColumnKey,
  communes: Map<string, CommuneLoyers>
) {
  const stream = await fetchCsvStream(RESOURCES[key], {
    csv: { delimiter: ";" },
  });
  if (!stream) throw new Error(`Ressource introuvable : ${RESOURCES[key]}`);

  let count = 0;
  for await (const row of stream) {
    const insee = row["INSEE_C"];
    const loyer = parseFrenchNumber(row["loypredm2"]);
    if (!insee || loyer === null) continue;

    const entry = communes.get(insee) ?? {
      nom: row["LIBGEO"] ?? insee,
      dept: row["DEP"] ?? insee.slice(0, 2),
      values: {},
    };
    entry.values[key] = Math.round(loyer * 100) / 100;
    communes.set(insee, entry);
    count++;
  }
  console.log(`  ${key} : ${formatCount(count)} communes`);
}

async function writeToDb(client: Client, communes: Map<string, CommuneLoyers>) {
  const entries = [...communes.entries()];

  // Le référentiel communes ne doit pas écraser les données DVF (qui portent
  // le code postal) : insertion uniquement des communes manquantes.
  for (const batch of chunk(entries, 5_000)) {
    await client.query(
      `insert into communes_ref (code_insee, nom_commune, code_departement)
       select * from unnest($1::text[], $2::text[], $3::text[])
       on conflict (code_insee) do nothing`,
      [
        batch.map(([insee]) => insee),
        batch.map(([, c]) => c.nom),
        batch.map(([, c]) => c.dept),
      ]
    );
  }

  await client.query("delete from loyers_communes");

  for (const batch of chunk(entries, 5_000)) {
    await client.query(
      `insert into loyers_communes
         (code_insee, loyer_m2_appartement, loyer_m2_appt_t1_t2,
          loyer_m2_appt_t3_plus, loyer_m2_maison, millesime)
       select * from unnest(
         $1::text[], $2::numeric[], $3::numeric[], $4::numeric[],
         $5::numeric[], $6::int[]
       )`,
      [
        batch.map(([insee]) => insee),
        batch.map(([, c]) => c.values.loyer_m2_appartement ?? null),
        batch.map(([, c]) => c.values.loyer_m2_appt_t1_t2 ?? null),
        batch.map(([, c]) => c.values.loyer_m2_appt_t3_plus ?? null),
        batch.map(([, c]) => c.values.loyer_m2_maison ?? null),
        batch.map(() => MILLESIME),
      ]
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");

  console.log(
    `Import Carte des loyers ANIL ${dryRun ? "(DRY-RUN) " : ""}- millésime ${MILLESIME}`
  );

  const communes = new Map<string, CommuneLoyers>();
  for (const key of Object.keys(RESOURCES) as ColumnKey[]) {
    await importResource(key, communes);
  }

  console.log(`Total : ${formatCount(communes.size)} communes avec indicateur`);

  if (!dryRun) {
    const client = getDbClient();
    await client.connect();
    try {
      await writeToDb(client, communes);
      console.log("Recalcul de communes_stats…");
      await client.query("select public.refresh_communes_stats()");
    } finally {
      await client.end();
    }
    console.log("Import terminé.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
