/**
 * Exécute une requête SQL sur la base (outil de développement).
 * Usage : pnpm sql "select count(*) from leads"
 */
import { getDbClient } from "./util";

async function main() {
  const sql = process.argv[2];
  if (!sql) throw new Error('Usage : pnpm sql "select …"');

  const client = getDbClient();
  await client.connect();
  try {
    const result = await client.query(sql);
    if (result.rows.length > 0) console.table(result.rows);
    console.log(`(${result.rowCount ?? 0} ligne(s) - ${result.command})`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
