/**
 * Agrégats DVF par commune, année civile et type de bien → table
 * communes_stats_annuelles (médiane du prix au m² et nombre de ventes).
 *
 * Les millésimes antérieurs à ceux stockés dans dvf_mutations (3 ans, plan
 * Supabase gratuit) sont lus en flux et agrégés en mémoire, sans être
 * conservés : c'est ce qui permet d'afficher l'évolution sur plusieurs
 * années sur les pages communes. Mêmes règles de nettoyage que l'import
 * principal (scripts/dvf-clean.ts), donc mêmes médianes à périmètre égal.
 *
 * Usage :
 *   pnpm import:dvf:annuel -- --depts 30,34          # départements pilotes
 *   pnpm import:dvf:annuel                           # France entière (long)
 *   pnpm import:dvf:annuel -- --years 2021,2022      # millésimes choisis
 *   pnpm import:dvf:annuel -- --dry-run
 */
import type { Client } from "pg";
import {
  accumulateRow,
  finalizeGroup,
  type DvfRawRow,
  type MutationGroup,
} from "./dvf-clean";
import { DVF_DEPARTEMENTS } from "./dvf-departements";
import { mediane, parseDepartements } from "./stats";
import { chunk, fetchCsvStream, formatCount, getDbClient, parseArgs } from "./util";

const BASE_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv";

interface Agregat {
  code_insee: string;
  annee: number;
  type_local: "A" | "M";
  prix: number[];
}

/** Tous les millésimes publiés (geo-dvf garde les 5 derniers). */
async function millesimesDisponibles(): Promise<number[]> {
  const trouves: number[] = [];
  const courant = new Date().getFullYear();
  for (let y = courant; y >= courant - 8; y--) {
    const res = await fetch(`${BASE_URL}/${y}/departements/01.csv.gz`, { method: "HEAD" });
    if (res.ok) trouves.push(y);
  }
  if (trouves.length === 0) throw new Error("Aucun millésime DVF détecté");
  return trouves.sort();
}

async function agregerDeptAnnee(
  annee: number,
  dept: string,
  agregats: Map<string, Agregat>
): Promise<number> {
  const stream = await fetchCsvStream(`${BASE_URL}/${annee}/departements/${dept}.csv.gz`, {
    gzip: true,
  });
  if (!stream) return -1;

  const groupes = new Map<string, MutationGroup>();
  for await (const row of stream) accumulateRow(groupes, row as unknown as DvfRawRow);

  let gardees = 0;
  for (const groupe of groupes.values()) {
    const resultat = finalizeGroup(groupe);
    if ("excluded" in resultat) continue;
    const m = resultat.row;
    const anneeVente = Number.parseInt(m.date_mutation.slice(0, 4), 10);
    if (anneeVente !== annee) continue;
    const type = m.type_local === "appartement" ? "A" : "M";
    const cle = `${m.code_insee}|${annee}|${type}`;
    const a = agregats.get(cle) ?? { code_insee: m.code_insee, annee, type_local: type, prix: [] };
    a.prix.push(Math.round((m.valeur_fonciere / m.surface_reelle_bati) * 100) / 100);
    agregats.set(cle, a);
    gardees++;
  }
  return gardees;
}

async function ecrire(client: Client, annees: number[], depts: string[], agregats: Agregat[]) {
  await client.query(
    `delete from communes_stats_annuelles
     where annee = any($1::smallint[])
       and exists (
         select 1 from unnest($2::text[]) as d(code)
         where communes_stats_annuelles.code_insee like d.code || '%'
       )`,
    [annees, depts]
  );
  for (const batch of chunk(agregats, 5_000)) {
    await client.query(
      `insert into communes_stats_annuelles (code_insee, annee, type_local, nb_ventes, prix_m2_median)
       select ci, a, t::"char", n, p
       from unnest($1::text[], $2::smallint[], $3::text[], $4::int[], $5::real[]) as u(ci, a, t, n, p)`,
      [
        batch.map((a) => a.code_insee),
        batch.map((a) => a.annee),
        batch.map((a) => a.type_local),
        batch.map((a) => a.prix.length),
        batch.map((a) => mediane(a.prix)),
      ]
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  const annees =
    typeof args.get("years") === "string"
      ? String(args.get("years")).split(",").map((y) => Number.parseInt(y.trim(), 10))
      : await millesimesDisponibles();
  const depts =
    typeof args.get("depts") === "string"
      ? parseDepartements(String(args.get("depts")))
      : DVF_DEPARTEMENTS;

  console.log(
    `Agrégats DVF annuels ${dryRun ? "(DRY-RUN) " : ""}- millésimes ${annees.join(", ")} - ` +
      (depts.length === DVF_DEPARTEMENTS.length ? "France entière" : depts.join(", "))
  );

  const agregats = new Map<string, Agregat>();
  const debut = Date.now();
  for (const annee of annees) {
    for (const dept of depts) {
      const n = await agregerDeptAnnee(annee, dept, agregats);
      console.log(
        `  ${annee} · ${dept.padEnd(3)} : ` +
          (n < 0 ? "fichier absent (ignoré)" : `${formatCount(n)} ventes gardées`)
      );
    }
  }
  const lignes = [...agregats.values()];
  console.log(`${formatCount(lignes.length)} lignes commune × année × type`);
  if (dryRun) return;

  const client = getDbClient();
  await client.connect();
  try {
    await ecrire(client, annees, depts, lignes);
    console.log(`Import terminé en ${((Date.now() - debut) / 60_000).toFixed(1)} min.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
