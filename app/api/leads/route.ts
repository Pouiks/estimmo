import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { estLocale, type Locale } from "@/lib/i18n/routing";
import { traduireCle } from "@/lib/i18n/traduire-cle";
import { AVEC_CLES, traduireIssues } from "@/lib/leads/erreurs";
import { rateLimit } from "@/lib/security/rate-limit";
import { buildCrmPayload, type EstimationResultat } from "@/lib/crm/payload";
import { calculerScoreLead } from "@/lib/estimation/score";
import { estimerLocation } from "@/lib/estimation/location";
import { estimerVente } from "@/lib/estimation/vente";
import { isZoneNonCouverte } from "@/lib/estimation/zones";
import {
  fetchComparables,
  fetchLoyersCommune,
} from "@/lib/estimation/repository";
import { leadPayloadSchema, normaliserTelephone } from "@/lib/leads/schema";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Création d'un lead (transactionnel) :
 *  1. validation Zod complète
 *  2. calcul de l'estimation (ou bascule en estimation manuelle)
 *  3. écriture du lead en base - TOUJOURS, quoi qu'il arrive ensuite
 *  4. enqueue CRM (jamais bloquant) - le cron /api/cron/crm-sync dépile
 *  5. emails Resend (prospect + notification interne, jamais bloquants)
 */
export async function POST(request: NextRequest) {
  // Anti-abus : 5 leads / 10 min par IP (chaque lead déclenche 2 emails).
  const limited = rateLimit(request, {
    scope: "leads",
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  // Langue du prospect : champ du payload (next/root-params n'existe pas
  // dans un route handler). Sert aux messages d'erreur, à l'email et au lead.
  const localeBrute = (body as { locale?: unknown } | null)?.locale;
  const locale: Locale = estLocale(localeBrute) ? localeBrute : "fr";
  const t = await getTranslations({ locale });

  if (body === null) {
    return NextResponse.json(
      { error: t("validation.jsonInvalide") },
      { status: 400 }
    );
  }

  const parsed = leadPayloadSchema.safeParse(body, AVEC_CLES);
  if (!parsed.success) {
    // Les schémas portent des clés (validation.*) : traduites ici, dans la
    // langue du prospect, puis affichées telles quelles par le formulaire.
    const erreurs = traduireIssues(parsed.error.issues, (cle) =>
      traduireCle(t, cle)
    );
    const details = Object.entries(erreurs).map(([champ, message]) => ({
      champ,
      message,
    }));
    return NextResponse.json(
      { error: t("validation.formulaireInvalide"), details },
      { status: 400 }
    );
  }

  const lead = parsed.data;

  // Pot de miel : champ invisible pour un humain, rempli par les robots.
  // On répond comme un succès (écran « estimation manuelle ») sans rien
  // enregistrer ni envoyer, pour ne pas renseigner le robot.
  if (lead.website) {
    console.warn("[leads] honeypot déclenché, soumission ignorée");
    return NextResponse.json({
      leadId: crypto.randomUUID(),
      manuelle: true,
      estimation: null,
    });
  }

  const dateConsentement = new Date().toISOString();

  // Dernier étage déduit de étage + étages de l'immeuble : bonus moteur
  // (+5 % avec ascenseur) sans le demander explicitement en atout.
  const atoutsPourMoteur = [...lead.atouts];
  if (
    lead.typeBien === "appartement" &&
    lead.etage != null &&
    lead.etagesImmeuble != null &&
    lead.etage > 0 &&
    lead.etage >= lead.etagesImmeuble &&
    !atoutsPourMoteur.includes("dernier_etage")
  ) {
    atoutsPourMoteur.push("dernier_etage");
  }

  // --- Estimation (une erreur moteur bascule en estimation manuelle,
  //     elle ne doit jamais faire perdre le lead) ---
  let estimation: EstimationResultat = null;
  if (!isZoneNonCouverte(lead.adresse.codeInsee)) {
    try {
      if (lead.projet === "vente") {
        const comparables = await fetchComparables({
          lat: lead.adresse.lat,
          lon: lead.adresse.lon,
          codeInsee: lead.adresse.codeInsee,
          typeBien: lead.typeBien,
          surface: lead.surface,
        });
        estimation = estimerVente(
          {
            typeBien: lead.typeBien,
            surface: lead.surface,
            pieces: lead.pieces,
            etage: lead.etage,
            ascenseur: lead.ascenseur,
            etatGeneral: lead.etatGeneral,
            ageCuisine: lead.ageCuisine,
            ageSdb: lead.ageSdb,
            dpe: lead.dpe,
            exterieur: lead.exterieur,
            stationnement: lead.stationnement,
            atouts: atoutsPourMoteur,
          },
          comparables
        );
      } else {
        const loyers = await fetchLoyersCommune(lead.adresse.codeInsee);
        estimation = estimerLocation(
          {
            typeBien: lead.typeBien,
            surface: lead.surface,
            pieces: lead.pieces,
            etatGeneral: lead.etatGeneral,
            dpe: lead.dpe,
          },
          loyers
        );
      }
    } catch (err) {
      console.error("[leads] erreur moteur d'estimation :", err);
      estimation = null;
    }
  }

  const estimationManuelle = estimation === null;
  const score = calculerScoreLead({
    projet: lead.projet,
    horizon: lead.projet === "vente" ? lead.horizon : null,
    telephoneValide: true, // format validé par le schéma
    dpe: lead.dpe,
    atouts: lead.atouts,
  });

  // --- Écriture du lead (étape critique) ---
  const supabase = createAdminClient();
  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert({
      prenom: lead.prenom,
      nom: lead.nom,
      email: lead.email,
      telephone: normaliserTelephone(lead.telephone),
      consentement_rgpd: lead.consentement,
      date_consentement: dateConsentement,
      projet: lead.projet,
      horizon: lead.projet === "vente" ? lead.horizon : null,
      type_bien: lead.typeBien,
      adresse_libelle: lead.adresse.libelle,
      code_insee: lead.adresse.codeInsee,
      lat: lead.adresse.lat,
      lon: lead.adresse.lon,
      surface: lead.surface,
      surface_type: lead.typeBien === "appartement" ? "carrez" : "habitable",
      pieces: lead.pieces,
      chambres: lead.chambres,
      etage: lead.etage ?? null,
      etages_immeuble: lead.etagesImmeuble ?? null,
      ascenseur: lead.ascenseur ?? null,
      surface_terrain: lead.surfaceTerrain ?? null,
      annee_construction: lead.anneeConstruction,
      exterieur: lead.exterieur,
      stationnement: lead.stationnement,
      etat_general: lead.etatGeneral,
      age_cuisine: lead.ageCuisine,
      age_sdb: lead.ageSdb,
      dpe: lead.dpe,
      atouts: lead.atouts,
      estimation,
      estimation_manuelle: estimationManuelle,
      score_lead: score,
      utm: lead.utm ?? {},
      locale: lead.locale,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[leads] échec d'insertion :", insertError);
    return NextResponse.json(
      { error: t("validation.enregistrementImpossible") },
      { status: 500 }
    );
  }

  const leadId: string = inserted.id;

  // --- Enqueue CRM (jamais bloquant) ---
  try {
    const payload = buildCrmPayload({
      lead,
      leadId,
      score,
      dateConsentement,
      estimation,
    });
    const { error: queueError } = await supabase
      .from("crm_sync_queue")
      .insert({ lead_id: leadId, payload });
    if (queueError) throw queueError;
  } catch (err) {
    console.error("[leads] enqueue CRM échoué (lead conservé) :", err);
  }

  // --- Emails (Phase 5 - branchés ici, jamais bloquants) ---
  try {
    const { envoyerEmailsLead } = await import("@/lib/email/emails");
    await envoyerEmailsLead({ lead, leadId, score, estimation });
  } catch (err) {
    console.error("[leads] envoi emails échoué (lead conservé) :", err);
  }

  return NextResponse.json({
    leadId,
    manuelle: estimationManuelle,
    estimation,
  });
}
