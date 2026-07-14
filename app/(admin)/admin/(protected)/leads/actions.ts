"use server";

import { revalidatePath } from "next/cache";
import { processCrmQueue } from "@/lib/crm/sync";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUTS_LEAD } from "@/components/admin/badges";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function updateLeadStatut(
  leadId: string,
  statut: string
): Promise<ActionResult> {
  await requireAdmin();

  if (!STATUTS_LEAD.some((s) => s.value === statut)) {
    return { ok: false, message: "Statut inconnu" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ statut })
    .eq("id", leadId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/estimations-manuelles");
  return { ok: true, message: "Statut mis à jour" };
}

export async function saveLeadNotes(
  leadId: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ notes: notes.slice(0, 10_000) })
    .eq("id", leadId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Notes enregistrées" };
}

export async function retryCrmSync(queueId: number): Promise<ActionResult> {
  await requireAdmin();

  try {
    const summary = await processCrmQueue([queueId]);
    if (summary.skipped) {
      return {
        ok: false,
        message: "CRM_WEBHOOK_URL n'est pas configuré sur cet environnement.",
      };
    }
    if (summary.sent > 0) {
      revalidatePath("/admin/leads");
      return { ok: true, message: "Synchronisation CRM réussie" };
    }
    return {
      ok: false,
      message: "Nouvel échec — voir le détail de l'erreur sur la fiche.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur inattendue",
    };
  }
}
