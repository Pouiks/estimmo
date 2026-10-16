import { timingSafeEqual } from "node:crypto";

/**
 * Vérifie un en-tête `Authorization: Bearer <secret>` en temps constant.
 * Retourne false si le secret n'est pas configuré (jamais « ouvert par défaut »).
 */
export function isAuthorizedBearer(
  authorization: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !authorization) return false;
  const received = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
