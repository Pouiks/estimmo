"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { texteDefaut } from "@/lib/i18n/catalogue";
import { validerSurcharge } from "@/lib/i18n/icu";
import { estLocale } from "@/lib/i18n/routing";
import { TAG_TRADUCTIONS } from "@/lib/i18n/surcharges-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * Après une modification : le cache des surcharges est invalidé et toutes
 * les pages du site (toutes langues) sont régénérées à leur prochaine
 * visite. Les emails lisent les surcharges à l'envoi.
 */
function propager() {
  revalidateTag(TAG_TRADUCTIONS, "max");
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin/traductions");
}

export async function enregistrerTraduction(
  locale: string,
  cle: string,
  valeur: string
): Promise<ActionResult> {
  await requireAdmin();

  if (!estLocale(locale)) return { ok: false, message: "Langue inconnue" };
  const defaut = texteDefaut(locale, cle);
  if (defaut === null) return { ok: false, message: "Clé inconnue" };

  const texte = valeur.trim();
  // Revenir au texte d'origine = supprimer la surcharge (base propre).
  if (texte === defaut) return supprimerTraduction(locale, cle);

  const erreur = validerSurcharge(defaut, texte);
  if (erreur) return { ok: false, message: erreur };

  const { error } = await createAdminClient()
    .from("traductions")
    .upsert(
      { locale, cle, valeur: texte, updated_at: new Date().toISOString() },
      { onConflict: "locale,cle" }
    );
  if (error) return { ok: false, message: error.message };

  propager();
  return { ok: true, message: `Texte ${locale.toUpperCase()} enregistré` };
}

export async function supprimerTraduction(
  locale: string,
  cle: string
): Promise<ActionResult> {
  await requireAdmin();
  if (!estLocale(locale)) return { ok: false, message: "Langue inconnue" };

  const { error } = await createAdminClient()
    .from("traductions")
    .delete()
    .eq("locale", locale)
    .eq("cle", cle);
  if (error) return { ok: false, message: error.message };

  propager();
  return { ok: true, message: "Texte d'origine rétabli" };
}
