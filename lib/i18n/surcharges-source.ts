import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "./routing";
import type { Surcharges } from "./surcharges";

/** Tag de cache : invalidé par les actions admin de traduction. */
export const TAG_TRADUCTIONS = "traductions";

async function lireSurcharges(locale: Locale): Promise<Surcharges> {
  const { data, error } = await createAdminClient()
    .from("traductions")
    .select("cle, valeur")
    .eq("locale", locale);
  if (error) throw error;
  const surcharges: Surcharges = {};
  for (const ligne of data ?? []) surcharges[ligne.cle] = ligne.valeur;
  return surcharges;
}

const lireSurchargesCachees = unstable_cache(lireSurcharges, ["traductions"], {
  tags: [TAG_TRADUCTIONS],
  revalidate: 3600,
});

/**
 * Surcharges d'une langue, mises en cache (tag `traductions`). Une base
 * injoignable ne doit jamais casser le rendu : on sert alors les JSON.
 */
export async function chargerSurcharges(locale: Locale): Promise<Surcharges> {
  try {
    return await lireSurchargesCachees(locale);
  } catch (err) {
    console.error("[i18n] surcharges indisponibles, messages embarqués servis :", err);
    return {};
  }
}
