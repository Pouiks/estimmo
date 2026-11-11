"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACTIONS_DEMANDE,
  CONTROLES_EXTERNES,
  TYPES_DEMANDE,
  type ActionDemande,
  type ControleExterne,
  type TypeDemande,
} from "@/lib/rgpd/demandes";
import { enregistrerDemande, executerPurge } from "@/lib/rgpd/serveur";

export interface ActionResult {
  ok: boolean;
  message: string;
}

function estType(v: string): v is TypeDemande {
  return TYPES_DEMANDE.some((t) => t.value === v);
}

function estAction(v: string): v is ActionDemande {
  return ACTIONS_DEMANDE.some((a) => a.value === v);
}

function nettoyerControles(
  brut: Record<string, boolean> | undefined
): Partial<Record<ControleExterne, boolean>> {
  const controles: Partial<Record<ControleExterne, boolean>> = {};
  for (const c of CONTROLES_EXTERNES) {
    if (brut?.[c.cle]) controles[c.cle] = true;
  }
  return controles;
}

/** Demande reçue par mail ou téléphone, saisie à la main dans le journal. */
export async function creerDemande(saisie: {
  type: string;
  demandeur: string;
  recueLe?: string;
  prolongee?: boolean;
  notes?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!estType(saisie.type)) return { ok: false, message: "Type de demande inconnu" };
  const demandeur = saisie.demandeur.trim();
  if (demandeur.length < 3) {
    return { ok: false, message: "Indiquez l'email ou le téléphone du demandeur" };
  }
  const recueLe = saisie.recueLe && /^\d{4}-\d{2}-\d{2}$/.test(saisie.recueLe)
    ? saisie.recueLe
    : undefined;

  try {
    await enregistrerDemande({
      type: saisie.type,
      demandeur,
      recueLe,
      prolongee: saisie.prolongee,
      notes: saisie.notes,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur inattendue" };
  }
  revalidatePath("/admin/rgpd");
  return { ok: true, message: "Demande enregistrée" };
}

/** Clôture : action faite, cases des copies externes, réponse envoyée. */
export async function cloturerDemande(
  id: string,
  saisie: {
    action: string;
    reponseEnvoyee: boolean;
    controles?: Record<string, boolean>;
    notes?: string;
  }
): Promise<ActionResult> {
  await requireAdmin();
  if (!estAction(saisie.action)) return { ok: false, message: "Action inconnue" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("demandes_rgpd")
    .update({
      action: saisie.action,
      reponse_envoyee: saisie.reponseEnvoyee,
      controles: nettoyerControles(saisie.controles),
      notes: saisie.notes?.slice(0, 2000) ?? null,
      traitee_le: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/rgpd");
  return { ok: true, message: "Demande clôturée" };
}

/** Mise à jour des cases (copies externes) et de « réponse envoyée » sans clôturer. */
export async function majDemande(
  id: string,
  saisie: { reponseEnvoyee?: boolean; controles?: Record<string, boolean> }
): Promise<ActionResult> {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (saisie.reponseEnvoyee !== undefined) patch.reponse_envoyee = saisie.reponseEnvoyee;
  if (saisie.controles) patch.controles = nettoyerControles(saisie.controles);

  const supabase = createAdminClient();
  const { error } = await supabase.from("demandes_rgpd").update(patch).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/rgpd");
  return { ok: true, message: "Enregistré" };
}

export async function supprimerDemande(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("demandes_rgpd").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/rgpd");
  return { ok: true, message: "Demande supprimée du journal" };
}

/** Purge immédiate (mêmes règles que le cron quotidien). */
export async function lancerPurge(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const r = await executerPurge();
    revalidatePath("/admin/rgpd");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/stats");
    return {
      ok: true,
      message: `Purge terminée : ${r.leads_anonymises} lead(s) anonymisé(s), ${r.evenements_supprimes} événement(s) et ${r.demandes_supprimees} demande(s) supprimé(s)`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Échec de la purge",
    };
  }
}
