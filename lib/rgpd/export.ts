/**
 * Export des données d'un prospect (droit d'accès, art. 15 ; portabilité,
 * art. 20) - fonctions pures. Deux formes : JSON structuré (portabilité) et
 * résumé texte prêt à coller dans la réponse envoyée par mail.
 */
import type { Locale } from "@/lib/i18n/routing";

/** Colonnes de `leads` telles que renvoyées par Supabase (select *). */
export type LeadBrut = Record<string, unknown> & {
  id: string;
  created_at: string;
  email: string | null;
};

export interface EnvoiCrm {
  lead_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface ExportProspect {
  genere_le: string;
  politique_version: string;
  responsable: { nom: string; email: string };
  prospect: { email: string | null; nombre_demandes: number };
  demandes: Array<Record<string, unknown>>;
  transmissions_crm: EnvoiCrm[];
}

/** Colonnes internes qui ne sont pas des données de la personne. */
const COLONNES_INTERNES = new Set(["anonymise_le", "estimation_manuelle"]);

/** Ordre et libellés des champs dans le résumé texte. */
const CHAMPS: Array<{ cle: string; fr: string; en: string }> = [
  { cle: "created_at", fr: "Demande reçue le", en: "Request received on" },
  { cle: "prenom", fr: "Prénom", en: "First name" },
  { cle: "nom", fr: "Nom", en: "Last name" },
  { cle: "email", fr: "Email", en: "Email" },
  { cle: "telephone", fr: "Téléphone", en: "Phone" },
  { cle: "projet", fr: "Projet", en: "Project" },
  { cle: "horizon", fr: "Horizon", en: "Timeframe" },
  { cle: "type_bien", fr: "Type de bien", en: "Property type" },
  { cle: "adresse_libelle", fr: "Adresse du bien", en: "Property address" },
  { cle: "code_insee", fr: "Code INSEE", en: "INSEE code" },
  { cle: "surface", fr: "Surface (m²)", en: "Surface (sq m)" },
  { cle: "pieces", fr: "Pièces", en: "Rooms" },
  { cle: "chambres", fr: "Chambres", en: "Bedrooms" },
  { cle: "etage", fr: "Étage", en: "Floor" },
  { cle: "surface_terrain", fr: "Terrain (m²)", en: "Land (sq m)" },
  { cle: "annee_construction", fr: "Construction", en: "Built" },
  { cle: "etat_general", fr: "État général", en: "Condition" },
  { cle: "dpe", fr: "DPE", en: "Energy rating" },
  { cle: "consentement_rgpd", fr: "Consentement", en: "Consent" },
  { cle: "date_consentement", fr: "Date du consentement", en: "Consent date" },
  { cle: "demande_rappel_at", fr: "Rappel demandé le", en: "Callback requested on" },
  { cle: "statut", fr: "Suivi commercial", en: "Sales status" },
  { cle: "score_lead", fr: "Score interne", en: "Internal score" },
  { cle: "notes", fr: "Notes internes", en: "Internal notes" },
  { cle: "utm", fr: "Source de la visite", en: "Visit source" },
  { cle: "locale", fr: "Langue", en: "Language" },
];

export function construireExport(params: {
  leads: LeadBrut[];
  envois: EnvoiCrm[];
  responsable: { nom: string; email: string };
  politiqueVersion: string;
  maintenant?: Date;
}): ExportProspect {
  const { leads, envois, responsable, politiqueVersion } = params;
  const tries = [...leads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    genere_le: (params.maintenant ?? new Date()).toISOString(),
    politique_version: politiqueVersion,
    responsable,
    prospect: {
      email: tries.find((l) => l.email)?.email ?? null,
      nombre_demandes: tries.length,
    },
    demandes: tries.map((lead) =>
      Object.fromEntries(
        Object.entries(lead).filter(([cle]) => !COLONNES_INTERNES.has(cle))
      )
    ),
    transmissions_crm: envois.filter((e) => tries.some((l) => l.id === e.lead_id)),
  };
}

function formaterValeur(cle: string, valeur: unknown, locale: Locale): string | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  if (cle === "consentement_rgpd") {
    return valeur ? (locale === "fr" ? "oui" : "yes") : locale === "fr" ? "non" : "no";
  }
  if (typeof valeur === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valeur)) {
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(valeur));
  }
  if (Array.isArray(valeur)) return valeur.length ? valeur.join(", ") : null;
  if (typeof valeur === "object") {
    const entrees = Object.entries(valeur as Record<string, unknown>);
    return entrees.length ? entrees.map(([k, v]) => `${k}=${String(v)}`).join(", ") : null;
  }
  return String(valeur);
}

function estimationTexte(lead: LeadBrut, locale: Locale): string | null {
  const est = lead.estimation as Record<string, unknown> | null;
  if (!est) return null;
  const euro = (n: unknown) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Number(n));
  if (lead.projet === "vente") {
    return `${euro(est.fourchetteBasse)} - ${euro(est.mediane)} - ${euro(est.fourchetteHaute)}`;
  }
  return `${euro(est.loyerBas)} - ${euro(est.loyerMedian)} - ${euro(est.loyerHaut)}${locale === "fr" ? " / mois" : " / month"}`;
}

/**
 * Résumé lisible, en français ou en anglais (langue du prospect), à coller
 * dans la réponse. Toutes les données détenues y figurent, y compris les
 * notes internes et le score (art. 15 : la personne a droit à l'ensemble).
 */
export function resumeTexte(exp: ExportProspect, locale: Locale): string {
  const fr = locale === "fr";
  const lignes: string[] = [];
  lignes.push(
    fr
      ? `Données personnelles détenues par ${exp.responsable.nom} (ESTIMMO)`
      : `Personal data held by ${exp.responsable.nom} (ESTIMMO)`
  );
  lignes.push(
    (fr ? "Document généré le " : "Document generated on ") +
      (formaterValeur("genere_le", exp.genere_le, locale) ?? exp.genere_le)
  );
  lignes.push(
    fr
      ? `Nombre de demandes d'estimation : ${exp.prospect.nombre_demandes}`
      : `Number of valuation requests: ${exp.prospect.nombre_demandes}`
  );

  exp.demandes.forEach((lead, index) => {
    lignes.push("");
    lignes.push(
      fr
        ? `--- Demande ${index + 1} / ${exp.demandes.length} ---`
        : `--- Request ${index + 1} / ${exp.demandes.length} ---`
    );
    for (const champ of CHAMPS) {
      const valeur = formaterValeur(champ.cle, lead[champ.cle], locale);
      if (valeur !== null) lignes.push(`${fr ? champ.fr : champ.en} : ${valeur}`);
    }
    const estimation = estimationTexte(lead as LeadBrut, locale);
    if (estimation) {
      lignes.push(`${fr ? "Estimation communiquée" : "Valuation provided"} : ${estimation}`);
    }
    const envois = exp.transmissions_crm.filter((e) => e.lead_id === lead.id);
    if (envois.length > 0) {
      const envoye = envois.some((e) => e.status === "sent");
      lignes.push(
        fr
          ? `Transmission au CRM : ${envoye ? "oui" : "non (en attente ou abandonnée)"}`
          : `Sent to CRM: ${envoye ? "yes" : "no (pending or abandoned)"}`
      );
    }
  });

  lignes.push("");
  lignes.push(
    fr
      ? `Destinataires : Supabase (base de données, UE), Vercel (hébergement), Resend (emails), CRM du responsable. Politique de confidentialité version ${exp.politique_version}.`
      : `Recipients: Supabase (database, EU), Vercel (hosting), Resend (emails), the controller's CRM. Privacy policy version ${exp.politique_version}.`
  );
  lignes.push(
    fr
      ? `Pour toute question ou pour demander l'effacement : ${exp.responsable.email}`
      : `Questions or erasure requests: ${exp.responsable.email}`
  );
  return lignes.join("\n");
}
