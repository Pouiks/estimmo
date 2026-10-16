import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton signé (HMAC) pour les liens « être rappelé » des emails.
 * Empêche qu'un tiers ne pose le flag demande_rappel sur un lead arbitraire
 * (pas d'énumération/forge possible sans le secret).
 */
const DEV_SECRET = "estimmo-dev-secret";

/**
 * En production le secret est obligatoire : sans lui les jetons seraient
 * forgeables (valeur de repli connue). En dev on tolère le repli.
 */
function secret(): string | null {
  const configured = process.env.CRON_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_SECRET;
}

export function rappelToken(leadId: string): string {
  const key = secret();
  if (!key) {
    throw new Error("CRON_SECRET requis en production (jetons de rappel)");
  }
  return createHmac("sha256", key)
    .update(`rappel:${leadId}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyRappelToken(leadId: string, token: string): boolean {
  if (!secret()) return false;
  const expected = rappelToken(leadId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
