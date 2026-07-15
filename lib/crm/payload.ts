/**
 * Construction du payload CRM - contrat d'interface défini dans starter.md.
 * Fonction pure (testée) : le lead est TOUJOURS en base avant l'enqueue.
 */
import type {
  EstimationLocation,
  EstimationVente,
} from "@/lib/estimation/types";
import type { LeadPayload } from "@/lib/leads/schema";
import { normaliserTelephone } from "@/lib/leads/schema";

export type EstimationResultat = EstimationVente | EstimationLocation | null;

export interface CrmPayload {
  contact: {
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    consentement_rgpd: boolean;
    date_consentement: string;
  };
  bien: {
    projet: string;
    horizon: string;
    type: string;
    adresse: { libelle: string; code_insee: string; lat: number; lon: number };
    surface: number;
    surface_type: "carrez" | "habitable";
    pieces: number;
    chambres: number;
    etage: number | null;
    ascenseur: boolean | null;
    surface_terrain: number | null;
    annee_construction: string;
    exterieur: string[];
    stationnement: string;
    etat_general: string;
    age_cuisine: string;
    age_sdb: string;
    dpe: string;
  };
  estimation: {
    fourchette_basse: number;
    mediane: number;
    fourchette_haute: number;
    prix_m2_zone: number;
    nb_comparables: number;
    rayon_m: number;
    confiance: string;
    manuelle: boolean;
  };
  meta: {
    source: "estimateur_web";
    lead_id: string;
    score_lead: number;
    utm: Record<string, string>;
  };
}

export function buildCrmPayload(params: {
  lead: LeadPayload;
  leadId: string;
  score: number;
  dateConsentement: string;
  estimation: EstimationResultat;
}): CrmPayload {
  const { lead, leadId, score, dateConsentement, estimation } = params;

  let estimationBlock: CrmPayload["estimation"];
  if (estimation === null) {
    estimationBlock = {
      fourchette_basse: 0,
      mediane: 0,
      fourchette_haute: 0,
      prix_m2_zone: 0,
      nb_comparables: 0,
      rayon_m: 0,
      confiance: "",
      manuelle: true,
    };
  } else if (estimation.projet === "vente") {
    estimationBlock = {
      fourchette_basse: estimation.fourchetteBasse,
      mediane: estimation.mediane,
      fourchette_haute: estimation.fourchetteHaute,
      prix_m2_zone: estimation.prixM2Zone,
      nb_comparables: estimation.nbComparables,
      rayon_m: estimation.rayonM ?? 0,
      confiance: estimation.confiance,
      manuelle: false,
    };
  } else {
    // Location : les loyers mensuels occupent les champs de fourchette.
    estimationBlock = {
      fourchette_basse: estimation.loyerBas,
      mediane: estimation.loyerMedian,
      fourchette_haute: estimation.loyerHaut,
      prix_m2_zone: estimation.loyerM2Zone,
      nb_comparables: 0,
      rayon_m: 0,
      confiance: estimation.confiance,
      manuelle: false,
    };
  }

  return {
    contact: {
      prenom: lead.prenom,
      nom: lead.nom,
      email: lead.email,
      telephone: normaliserTelephone(lead.telephone),
      consentement_rgpd: lead.consentement,
      date_consentement: dateConsentement,
    },
    bien: {
      projet: lead.projet,
      horizon: lead.horizon ?? "",
      type: lead.typeBien,
      adresse: {
        libelle: lead.adresse.libelle,
        code_insee: lead.adresse.codeInsee,
        lat: lead.adresse.lat,
        lon: lead.adresse.lon,
      },
      surface: lead.surface,
      surface_type: lead.typeBien === "appartement" ? "carrez" : "habitable",
      pieces: lead.pieces,
      chambres: lead.chambres,
      etage: lead.etage ?? null,
      ascenseur: lead.ascenseur ?? null,
      surface_terrain: lead.surfaceTerrain ?? null,
      annee_construction: lead.anneeConstruction ?? "",
      exterieur: lead.exterieur,
      stationnement: lead.stationnement,
      etat_general: lead.etatGeneral,
      age_cuisine: lead.ageCuisine,
      age_sdb: lead.ageSdb,
      dpe: lead.dpe,
    },
    estimation: estimationBlock,
    meta: {
      source: "estimateur_web",
      lead_id: leadId,
      score_lead: score,
      utm: lead.utm ?? {},
    },
  };
}
