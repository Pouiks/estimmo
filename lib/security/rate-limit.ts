import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Limitation de débit par IP, en mémoire (fenêtre fixe).
 *
 * Limite connue : sur Vercel chaque instance serverless a sa propre mémoire,
 * la limite est donc « par instance » et non globale. Elle suffit à casser
 * les scripts naïfs (spam de leads, abus des proxys IGN/Overpass) sans
 * dépendance externe. Pour une limite stricte, brancher un store partagé
 * (Upstash Redis, table Postgres) derrière la même signature.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitOptions {
  /** Préfixe de clé, un par route (ex. "leads"). */
  scope: string;
  /** Nombre maximal de requêtes par fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function purge(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Toujours trop plein (attaque distribuée) : on sacrifie les plus anciens.
  while (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * Retourne une réponse 429 si la limite est dépassée, sinon null.
 * Usage : `const limited = rateLimit(request, {...}); if (limited) return limited;`
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  const key = `${options.scope}:${clientIp(request)}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
    if (buckets.size > MAX_KEYS) purge(now);
  }
  bucket.count++;

  if (bucket.count > options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Trop de requêtes, merci de réessayer dans quelques minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      }
    );
  }
  return null;
}

/** Réinitialise l'état (tests uniquement). */
export function _resetRateLimit() {
  buckets.clear();
}
