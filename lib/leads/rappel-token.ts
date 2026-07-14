import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton signé (HMAC) pour les liens « être rappelé » des emails.
 * Empêche qu'un tiers ne pose le flag demande_rappel sur un lead arbitraire
 * (pas d'énumération/forge possible sans le secret).
 */
function secret(): string {
  return process.env.CRON_SECRET ?? "estimmo-dev-secret";
}

export function rappelToken(leadId: string): string {
  return createHmac("sha256", secret())
    .update(`rappel:${leadId}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyRappelToken(leadId: string, token: string): boolean {
  const expected = rappelToken(leadId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
