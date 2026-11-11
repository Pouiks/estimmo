"use server";

import { revalidatePath } from "next/cache";
import { processCrmQueue } from "@/lib/crm/sync";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUTS_LEAD } from "@/components/admin/badges";
import {
  anonymiserLeads,
  enregistrerDemande,
  leadsDuProspect,
} from "@/lib/rgpd/serveur";

export interface ActionResult {
  ok: boolean;
  message: string;
}

interface DemandeRgpdSaisie {
  /** Toutes les demandes partageant l'email du lead, ou ce lead seul. */
  tous: boolean;
  /** Email ou téléphone tel que reçu (journal). */
  demandeur: string;
  notes?: string;
}

function revaliderLeads(leadIds: string[]) {
  revalidatePath("/admin/leads");
  for (const id of leadIds) revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/estimations-manuelles");
  revalidatePath("/admin/stats");
  revalidatePath("/admin/rgpd");
  revalidatePath("/admin", "layout");
}

/**
 * Anonymisation sur demande du prospect (droit à l'effacement) : identité,
 * coordonnées, adresse et notes effacées, statistiques conservées. Atomique
 * (fonction SQL `anonymiser_leads`, file CRM comprise) et journalisée.
 */
export async function anonymiserProspect(
  leadId: string,
  saisie: DemandeRgpdSaisie
): Promise<ActionResult> {
  await requireAdmin();
  if (saisie.demandeur.trim().length < 3) {
    return { ok: false, message: "Indiquez l'email ou le téléphone du demandeur" };
  }

  try {
    const groupe = await leadsDuProspect(leadId);
    const ids = (saisie.tous ? groupe : groupe.filter((l) => l.id === leadId)).map(
      (l) => l.id
    );
    if (ids.length === 0) return { ok: false, message: "Lead introuvable" };

    const nb = await anonymiserLeads(ids);
    await enregistrerDemande({
      type: "effacement",
      demandeur: saisie.demandeur,
      leads: ids,
      action: "anonymisation",
      notes: saisie.notes,
    });
    revaliderLeads(ids);
    return { ok: true, message: `${nb} demande(s) anonymisée(s)` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur inattendue" };
  }
}

/** Suppression définitive sur demande du prospect, journalisée. */
export async function supprimerProspectRgpd(
  leadId: string,
  saisie: DemandeRgpdSaisie
): Promise<ActionResult> {
  await requireAdmin();
  if (saisie.demandeur.trim().length < 3) {
    return { ok: false, message: "Indiquez l'email ou le téléphone du demandeur" };
  }

  try {
    const groupe = await leadsDuProspect(leadId);
    const ids = (saisie.tous ? groupe : groupe.filter((l) => l.id === leadId)).map(
      (l) => l.id
    );
    if (ids.length === 0) return { ok: false, message: "Lead introuvable" };

    const supabase = createAdminClient();
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return { ok: false, message: error.message };

    await enregistrerDemande({
      type: "effacement",
      demandeur: saisie.demandeur,
      leads: ids,
      action: "suppression",
      notes: saisie.notes,
    });
    revaliderLeads(ids);
    return { ok: true, message: `${ids.length} demande(s) supprimée(s)` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur inattendue" };
  }
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

/**
 * Suppression définitive d'un lead (la file CRM suit par cascade). Le CRM
 * externe, s'il a déjà reçu le lead, n'est pas prévenu.
 */
export async function deleteLead(leadId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) {
    return { ok: false, message: "Lead introuvable (déjà supprimé ?)" };
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/estimations-manuelles");
  revalidatePath("/admin/stats");
  revalidatePath("/admin", "layout"); // compteur des manuelles dans le menu
  return { ok: true, message: "Lead supprimé" };
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
      message: "Nouvel échec - voir le détail de l'erreur sur la fiche.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur inattendue",
    };
  }
}
