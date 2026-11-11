import "server-only";
import { SITE } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { RGPD, STATUTS_CLIENTS } from "./constantes";
import {
  echeanceDemande,
  jourIso,
  type ActionDemande,
  type DemandeRgpd,
  type TypeDemande,
} from "./demandes";
import { construireExport, type EnvoiCrm, type LeadBrut } from "./export";

/**
 * Accès base du module RGPD (service_role). Les fonctions pures sont dans
 * `demandes.ts`, `export.ts`, `recherche.ts`.
 */

/** Tous les leads (non anonymisés) partageant l'email d'un lead donné. */
export async function leadsDuProspect(leadId: string): Promise<LeadBrut[]> {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) return [];
  if (!lead.email) return [lead as LeadBrut];

  const { data, error: erreurListe } = await supabase
    .from("leads")
    .select("*")
    .eq("email", String(lead.email).toLowerCase())
    .is("anonymise_le", null)
    .order("created_at", { ascending: true });
  if (erreurListe) throw new Error(erreurListe.message);
  return (data ?? []) as LeadBrut[];
}

/** Nombre de demandes par email pour une liste de leads (badge « ×N »). */
export async function demandesParEmail(
  emails: Array<string | null>
): Promise<Map<string, number>> {
  const uniques = [...new Set(emails.filter((e): e is string => !!e).map((e) => e.toLowerCase()))];
  const compte = new Map<string, number>();
  if (uniques.length === 0) return compte;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("email")
    .in("email", uniques)
    .is("anonymise_le", null)
    .limit(10_000);
  for (const ligne of data ?? []) {
    const cle = String(ligne.email).toLowerCase();
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  return compte;
}

export async function exportProspect(leadId: string, tous: boolean) {
  const supabase = createAdminClient();
  const groupe = await leadsDuProspect(leadId);
  const leads = tous ? groupe : groupe.filter((l) => l.id === leadId);
  if (leads.length === 0) return null;

  const { data: envois } = await supabase
    .from("crm_sync_queue")
    .select("lead_id, status, sent_at, created_at")
    .in(
      "lead_id",
      leads.map((l) => l.id)
    );

  return construireExport({
    leads,
    envois: (envois ?? []) as EnvoiCrm[],
    responsable: { nom: SITE.agent.name, email: SITE.agent.email },
    politiqueVersion: RGPD.politiqueVersion,
  });
}

/** Anonymisation atomique (leads + file CRM) ; renvoie le nombre de leads traités. */
export async function anonymiserLeads(ids: string[]): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("anonymiser_leads", { p_ids: ids });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export interface NouvelleDemande {
  type: TypeDemande;
  demandeur: string;
  leads?: string[];
  recueLe?: string;
  prolongee?: boolean;
  /** Si fournie, la demande est créée déjà traitée (action faite depuis la fiche). */
  action?: ActionDemande;
  notes?: string;
}

export async function enregistrerDemande(demande: NouvelleDemande): Promise<DemandeRgpd> {
  const supabase = createAdminClient();
  const recueLe = demande.recueLe ?? jourIso(new Date());
  const { data, error } = await supabase
    .from("demandes_rgpd")
    .insert({
      type: demande.type,
      demandeur: demande.demandeur.trim().slice(0, 200),
      leads: demande.leads ?? [],
      recue_le: recueLe,
      echeance: echeanceDemande(recueLe, demande.prolongee),
      action: demande.action ?? null,
      traitee_le: demande.action ? new Date().toISOString() : null,
      notes: demande.notes?.slice(0, 2000) ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as DemandeRgpd;
}

export async function listerDemandes(): Promise<DemandeRgpd[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("demandes_rgpd")
    .select("*")
    .order("traitee_le", { ascending: true, nullsFirst: true })
    .order("echeance", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as DemandeRgpd[];
}

export interface ResultatPurge {
  leads_anonymises: number;
  evenements_supprimes: number;
  demandes_supprimees: number;
  conservation: string;
}

/** Purge selon les durées de `RGPD` ; trace écrite par la fonction SQL. */
export async function executerPurge(): Promise<ResultatPurge> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("purger_rgpd", {
    p_conservation: `${RGPD.conservationLeadsAnnees} years`,
    p_evenements: `${RGPD.conservationEvenementsMois} months`,
    p_journal: `${RGPD.conservationJournalAnnees} years`,
  });
  if (error) throw new Error(error.message);
  return data as ResultatPurge;
}

export async function dernierePurge(): Promise<{
  executee_le: string;
  resultat: ResultatPurge;
} | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("purges_rgpd")
    .select("executee_le, resultat")
    .order("executee_le", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { executee_le: string; resultat: ResultatPurge } | null) ?? null;
}

/** Leads qui seront anonymisés dans les `preavisPurgeJours` prochains jours. */
export async function leadsAVenir(): Promise<
  Array<{ id: string; prenom: string | null; nom: string | null; email: string | null; dernier_contact_le: string; statut: string }>
> {
  const supabase = createAdminClient();
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - RGPD.conservationLeadsAnnees);
  limite.setDate(limite.getDate() + RGPD.preavisPurgeJours);
  const { data } = await supabase
    .from("leads")
    .select("id, prenom, nom, email, dernier_contact_le, statut")
    .is("anonymise_le", null)
    .lt("dernier_contact_le", limite.toISOString())
    .not("statut", "in", `(${STATUTS_CLIENTS.join(",")})`)
    .order("dernier_contact_le", { ascending: true })
    .limit(200);
  return data ?? [];
}
