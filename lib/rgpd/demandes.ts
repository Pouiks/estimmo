/**
 * Journal des demandes d'exercice des droits - fonctions pures (échéances,
 * états, libellés). Les requêtes sont dans `lib/rgpd/serveur.ts`.
 */
import { RGPD } from "./constantes";

export const TYPES_DEMANDE = [
  { value: "acces", label: "Accès (copie des données)" },
  { value: "effacement", label: "Effacement" },
  { value: "opposition", label: "Opposition au recontact" },
  { value: "rectification", label: "Rectification" },
  { value: "portabilite", label: "Portabilité" },
  { value: "limitation", label: "Limitation" },
] as const;

export type TypeDemande = (typeof TYPES_DEMANDE)[number]["value"];

export const ACTIONS_DEMANDE = [
  { value: "export", label: "Export envoyé" },
  { value: "anonymisation", label: "Anonymisation" },
  { value: "suppression", label: "Suppression" },
  { value: "rectification", label: "Rectification" },
  { value: "refus", label: "Refus motivé" },
  { value: "autre", label: "Autre" },
] as const;

export type ActionDemande = (typeof ACTIONS_DEMANDE)[number]["value"];

/** Copies hors base à traiter à la main après un export ou un effacement. */
export const CONTROLES_EXTERNES = [
  { cle: "crm", label: "CRM externe : fiche supprimée ou anonymisée" },
  { cle: "resend", label: "Resend : journal d'envoi purgé (ou rétention désactivée)" },
  { cle: "boite_mail", label: "Boîte mail : emails de notification supprimés" },
  { cle: "exports", label: "Exports CSV téléchargés : lignes supprimées" },
] as const;

export type ControleExterne = (typeof CONTROLES_EXTERNES)[number]["cle"];

export interface DemandeRgpd {
  id: string;
  created_at: string;
  type: TypeDemande;
  recue_le: string;
  demandeur: string;
  leads: string[];
  echeance: string;
  traitee_le: string | null;
  action: ActionDemande | null;
  reponse_envoyee: boolean;
  controles: Partial<Record<ControleExterne, boolean>>;
  notes: string | null;
}

export type EtatDemande = "a_traiter" | "en_retard" | "traitee";

/** Date au format AAAA-MM-JJ (fuseau du serveur : seuls les jours comptent). */
export function jourIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Échéance de réponse : un mois après réception (art. 12.3), ou trois mois
 * si la demande est prolongée (complexité, nombre de demandes).
 */
export function echeanceDemande(recueLe: string, prolongee = false): string {
  const [a, m, j] = recueLe.split("-").map(Number);
  const mois = RGPD.delaiReponseMois + (prolongee ? RGPD.prolongationMois : 0);
  // Date.UTC gère le débordement de mois (31/01 + 1 mois → 03/03) comme le
  // ferait un calendrier : on retombe sur le dernier jour du mois cible.
  const cible = new Date(Date.UTC(a, m - 1 + mois, 1));
  const dernierJour = new Date(Date.UTC(a, m + mois, 0)).getUTCDate();
  cible.setUTCDate(Math.min(j, dernierJour));
  return jourIso(cible);
}

export function etatDemande(
  demande: Pick<DemandeRgpd, "traitee_le" | "echeance">,
  aujourdHui: string
): EtatDemande {
  if (demande.traitee_le) return "traitee";
  return demande.echeance < aujourdHui ? "en_retard" : "a_traiter";
}

/** Jours restants avant l'échéance (négatif si dépassée). */
export function joursRestants(echeance: string, aujourdHui: string): number {
  const ms = Date.parse(`${echeance}T00:00:00Z`) - Date.parse(`${aujourdHui}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function libelleType(type: string): string {
  return TYPES_DEMANDE.find((t) => t.value === type)?.label ?? type;
}

export function libelleAction(action: string | null): string {
  if (!action) return "-";
  return ACTIONS_DEMANDE.find((a) => a.value === action)?.label ?? action;
}

/** Nombre de contrôles externes restant à cocher. */
export function controlesRestants(
  controles: DemandeRgpd["controles"] | null | undefined
): number {
  return CONTROLES_EXTERNES.filter((c) => !controles?.[c.cle]).length;
}
