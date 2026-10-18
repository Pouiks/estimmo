import type { useTranslations } from "next-intl";

/** Traducteur sans namespace (useTranslations() / getTranslations()). */
export type TraducteurRacine = ReturnType<typeof useTranslations<never>>;

/**
 * Traduit une clé transportée dans une donnée (message Zod, code API) :
 * si la clé est inconnue, elle est renvoyée telle quelle plutôt que de
 * planter l'affichage. Seul point du code où le typage strict des clés est
 * contourné.
 */
export function traduireCle(t: TraducteurRacine, cle: string): string {
  return t.has(cle as never) ? t(cle as never) : cle;
}
