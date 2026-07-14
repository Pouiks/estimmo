/**
 * Applique les migrations SQL de supabase/migrations sur la base cible.
 *
 * Usage : pnpm db:migrate
 * Requiert SUPABASE_DB_URL (chaîne Postgres — utiliser le « Session pooler »
 * de Supabase, port 5432, compatible IPv4).
 *
 * Idempotent : les fichiers déjà appliqués (table _migrations) sont ignorés.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL manquant. Renseigne la chaîne de connexion Postgres (Session pooler) dans .env.local"
    );
  }

  const client = new Client({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url)
      ? undefined
      : { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(
    `create table if not exists _migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`
  );

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await client.query<{ name: string }>(
    "select name from _migrations"
  );
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    process.stdout.write(`→ ${file} … `);
    const sql = readFileSync(path.join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("OK");
      count++;
    } catch (err) {
      await client.query("rollback");
      console.log("ÉCHEC");
      throw err;
    }
  }

  console.log(
    count === 0 ? "Base déjà à jour." : `${count} migration(s) appliquée(s).`
  );
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
