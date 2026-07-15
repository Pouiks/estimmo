/**
 * Import DVF géolocalisé (Etalab) → table dvf_mutations.
 *
 * Source : https://files.data.gouv.fr/geo-dvf/latest/csv/{année}/departements/{dept}.csv.gz
 * Publication semestrielle (avril / octobre) - exécuter en local ou GitHub
 * Action, JAMAIS sur Vercel.
 *
 * Usage :
 *   pnpm import:dvf                             # 3 derniers millésimes, France entière
 *   pnpm import:dvf -- --years 2024,2025        # millésimes précis
 *   pnpm import:dvf -- --depts 06,75            # sous-ensemble de départements
 *   pnpm import:dvf -- --dry-run                # parse + stats, sans écrire en base
 *   pnpm import:dvf -- --skip-stats             # sans recalcul de communes_stats
 *
 * Idempotent : les mutations du millésime (et du périmètre de départements)
 * sont supprimées puis rechargées.
 */
import type { Client } from "pg";
import {
  accumulateRow,
  finalizeGroup,
  type CleanMutation,
  type DvfRawRow,
  type ExclusionReason,
  type MutationGroup,
} from "./dvf-clean";
import {
  chunk,
  fetchCsvStream,
  formatCount,
  getDbClient,
  parseArgs,
} from "./util";

const BASE_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv";
const BATCH_SIZE = 5_000;

// Départements couverts par DVF. Absents : 57 (Moselle), 67 (Bas-Rhin),
// 68 (Haut-Rhin) - Livre foncier d'Alsace-Moselle - et 976 (Mayotte).
export const DVF_DEPARTEMENTS: string[] = [
  ...Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, "0")),
  "2A",
  "2B",
  ...Array.from({ length: 75 }, (_, i) => String(i + 21)),
  "971",
  "972",
  "973",
  "974",
].filter((d) => !["57", "67", "68"].includes(d));

interface CommuneRef {
  nom: string;
  dept: string;
  cpCounts: Map<string, number>;
}

interface ImportStats {
  rows: number;
  mutations: number;
  kept: number;
  excluded: Record<ExclusionReason, number>;
}

function emptyStats(): ImportStats {
  return {
    rows: 0,
    mutations: 0,
    kept: 0,
    excluded: {
      nature: 0,
      local_non_habitation: 0,
      aucun_logement: 0,
      multi_logements: 0,
      valeur: 0,
      surface: 0,
      prix_m2: 0,
      coords: 0,
    },
  };
}

/** Détecte les derniers millésimes publiés (la publication a ~6 mois de retard). */
async function detectYears(count: number): Promise<number[]> {
  const found: number[] = [];
  const current = new Date().getFullYear();
  for (let y = current; y >= current - 8 && found.length < count; y--) {
    const res = await fetch(`${BASE_URL}/${y}/departements/01.csv.gz`, {
      method: "HEAD",
    });
    if (res.ok) found.push(y);
  }
  if (found.length === 0) {
    throw new Error("Aucun millésime DVF détecté - vérifier files.data.gouv.fr");
  }
  return found.sort();
}

async function insertBatch(client: Client, rows: CleanMutation[]) {
  await client.query(
    `insert into dvf_mutations
       (date_mutation, valeur_fonciere, type_local, surface_reelle_bati,
        nb_pieces, code_insee, code_departement, code_postal, geom)
     select d, v, t, s, p, ci, cd, cp,
            st_setsrid(st_makepoint(lon, lat), 4326)
     from unnest(
       $1::date[], $2::numeric[], $3::text[], $4::numeric[], $5::int[],
       $6::text[], $7::text[], $8::text[], $9::float8[], $10::float8[]
     ) as u(d, v, t, s, p, ci, cd, cp, lon, lat)`,
    [
      rows.map((r) => r.date_mutation),
      rows.map((r) => r.valeur_fonciere),
      rows.map((r) => r.type_local),
      rows.map((r) => r.surface_reelle_bati),
      rows.map((r) => r.nb_pieces),
      rows.map((r) => r.code_insee),
      rows.map((r) => r.code_departement),
      rows.map((r) => r.code_postal),
      rows.map((r) => r.lon),
      rows.map((r) => r.lat),
    ]
  );
}

async function upsertCommunesRef(
  client: Client,
  communes: Map<string, CommuneRef>
) {
  const entries = [...communes.entries()].map(([insee, ref]) => {
    let bestCp: string | null = null;
    let bestCount = 0;
    for (const [cp, count] of ref.cpCounts) {
      if (count > bestCount) {
        bestCp = cp;
        bestCount = count;
      }
    }
    return { insee, nom: ref.nom, dept: ref.dept, cp: bestCp };
  });

  for (const batch of chunk(entries, BATCH_SIZE)) {
    await client.query(
      `insert into communes_ref (code_insee, nom_commune, code_postal, code_departement)
       select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])
       on conflict (code_insee) do update
         set nom_commune = excluded.nom_commune,
             code_postal = coalesce(excluded.code_postal, communes_ref.code_postal),
             code_departement = excluded.code_departement`,
      [
        batch.map((e) => e.insee),
        batch.map((e) => e.nom),
        batch.map((e) => e.cp),
        batch.map((e) => e.dept),
      ]
    );
  }
}

async function importDeptYear(
  client: Client | null,
  year: number,
  dept: string,
  communes: Map<string, CommuneRef>,
  totals: ImportStats
): Promise<"ok" | "absent"> {
  const url = `${BASE_URL}/${year}/departements/${dept}.csv.gz`;
  const stream = await fetchCsvStream(url, { gzip: true });
  if (!stream) return "absent";

  const groups = new Map<string, MutationGroup>();
  const stats = emptyStats();

  for await (const row of stream) {
    stats.rows++;
    accumulateRow(groups, row as unknown as DvfRawRow);
  }

  const cleanRows: CleanMutation[] = [];
  for (const group of groups.values()) {
    stats.mutations++;
    const result = finalizeGroup(group);
    if ("excluded" in result) {
      stats.excluded[result.excluded]++;
      continue;
    }
    stats.kept++;
    cleanRows.push(result.row);

    // Référentiel communes : nom + code postal majoritaire
    const ref = communes.get(result.row.code_insee) ?? {
      nom: result.row.nom_commune,
      dept: result.row.code_departement,
      cpCounts: new Map<string, number>(),
    };
    ref.nom = result.row.nom_commune;
    if (result.row.code_postal) {
      ref.cpCounts.set(
        result.row.code_postal,
        (ref.cpCounts.get(result.row.code_postal) ?? 0) + 1
      );
    }
    communes.set(result.row.code_insee, ref);
  }

  if (client) {
    for (const batch of chunk(cleanRows, BATCH_SIZE)) {
      await insertBatch(client, batch);
    }
  }

  totals.rows += stats.rows;
  totals.mutations += stats.mutations;
  totals.kept += stats.kept;
  for (const key of Object.keys(stats.excluded) as ExclusionReason[]) {
    totals.excluded[key] += stats.excluded[key];
  }

  console.log(
    `  ${year} · ${dept.padEnd(3)} : ${formatCount(stats.rows)} lignes → ` +
    `${formatCount(stats.kept)} mutations gardées / ${formatCount(stats.mutations)}`
  );
  return "ok";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  const skipStats = args.has("skip-stats");

  const years =
    typeof args.get("years") === "string"
      ? String(args.get("years"))
        .split(",")
        .map((y) => Number.parseInt(y.trim(), 10))
      : await detectYears(3);

  const depts =
    typeof args.get("depts") === "string"
      ? String(args.get("depts"))
        .split(",")
        .map((d) => d.trim().toUpperCase().padStart(2, "0"))
      : DVF_DEPARTEMENTS;

  const fullScope = depts.length === DVF_DEPARTEMENTS.length;

  console.log(
    `Import DVF ${dryRun ? "(DRY-RUN) " : ""}- millésimes ${years.join(", ")} - ` +
    `${fullScope ? "France entière" : depts.join(", ")}`
  );

  const client = dryRun ? null : getDbClient();
  if (client) await client.connect();

  const communes = new Map<string, CommuneRef>();
  const totals = emptyStats();
  const started = Date.now();

  try {
    for (const year of years) {
      if (client) {
        // Idempotence : purge du millésime sur le périmètre traité
        const deleted = fullScope
          ? await client.query(
            `delete from dvf_mutations
               where date_mutation >= make_date($1, 1, 1)
                 and date_mutation < make_date($1 + 1, 1, 1)`,
            [year]
          )
          : await client.query(
            `delete from dvf_mutations
               where date_mutation >= make_date($1, 1, 1)
                 and date_mutation < make_date($1 + 1, 1, 1)
                 and code_departement = any($2)`,
            [year, depts]
          );
        console.log(
          `${year} : ${formatCount(deleted.rowCount ?? 0)} lignes existantes purgées`
        );
      }

      for (const dept of depts) {
        const status = await importDeptYear(client, year, dept, communes, totals);
        if (status === "absent") {
          console.log(`  ${year} · ${dept.padEnd(3)} : fichier absent (ignoré)`);
        }
      }
    }

    if (client) {
      console.log(`Référentiel communes : ${formatCount(communes.size)} communes…`);
      await upsertCommunesRef(client, communes);

      if (!skipStats) {
        console.log("Recalcul de communes_stats…");
        await client.query("select public.refresh_communes_stats()");
      }
    }
  } finally {
    if (client) await client.end();
  }

  const minutes = ((Date.now() - started) / 60_000).toFixed(1);
  console.log("\n=== Bilan ===");
  console.log(`Lignes CSV lues     : ${formatCount(totals.rows)}`);
  console.log(`Mutations vues      : ${formatCount(totals.mutations)}`);
  console.log(`Mutations gardées   : ${formatCount(totals.kept)}`);
  for (const [reason, count] of Object.entries(totals.excluded)) {
    console.log(`  exclues (${reason}) : ${formatCount(count)}`);
  }
  console.log(`Durée : ${minutes} min`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
