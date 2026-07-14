/** Utilitaires partagés par les scripts d'ingestion (hors runtime Vercel). */
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { parse, type Options as CsvOptions } from "csv-parse";
import { Client } from "pg";

export function getDbClient(): Client {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL manquant. Renseigne la chaîne de connexion Postgres (Session pooler, port 5432) dans .env.local"
    );
  }
  return new Client({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url)
      ? undefined
      : { rejectUnauthorized: false },
  });
}

/**
 * Télécharge une URL et retourne un flux de lignes CSV parsées.
 * Retourne null si la ressource n'existe pas (404).
 */
export async function fetchCsvStream(
  url: string,
  options: { gzip?: boolean; csv?: CsvOptions } = {}
): Promise<AsyncIterable<Record<string, string>> | null> {
  const res = await fetch(url, { redirect: "follow" });
  if (res.status === 404) return null;
  if (!res.ok || !res.body) {
    throw new Error(`Téléchargement échoué (${res.status}) : ${url}`);
  }

  let stream: NodeJS.ReadableStream = Readable.fromWeb(
    res.body as import("node:stream/web").ReadableStream
  );
  if (options.gzip) stream = stream.pipe(createGunzip());

  return stream.pipe(
    parse({ columns: true, bom: true, ...options.csv })
  ) as AsyncIterable<Record<string, string>>;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Parsing minimaliste des arguments `--flag` et `--cle valeur1,valeur2`. */
export function parseArgs(argv: string[]): Map<string, string | true> {
  const args = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

/** "9,75" (décimale française) → 9.75 ; chaîne vide/invalide → null. */
export function parseFrenchNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatCount(n: number): string {
  return n.toLocaleString("fr-FR");
}
