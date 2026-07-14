import "server-only";
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { normaliserTelephone } from "@/lib/leads/schema";
import { MENTIONS, SITE } from "@/lib/config";

/**
 * Emails transactionnels Brevo (API v3).
 * Sans BREVO_API_KEY (dev) : mode simulation, contenu loggé en console.
 * Les échecs sont remontés à l'appelant qui ne doit JAMAIS bloquer le lead.
 */
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

async function envoyerEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.log(
      `[brevo:simulation] À: ${params.to.map((t) => t.email).join(", ")} — ` +
        `Sujet: ${params.subject}`
    );
    return;
  }

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: SITE.name },
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status} : ${detail.slice(0, 300)}`);
  }
}

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

function blocEstimationHtml(estimation: EstimationResultat): string {
  if (estimation === null) {
    return `
      <p style="font-size:16px"><strong>Votre secteur nécessite une analyse personnalisée.</strong></p>
      <p>Votre bien se situe dans une zone où les données publiques de vente ne permettent pas
      une estimation automatique fiable. <strong>${SITE.agent.name} vous prépare une estimation
      offerte sous 24&nbsp;h</strong> et vous rappelle au numéro indiqué.</p>`;
  }

  if (estimation.projet === "vente") {
    return `
      <p style="font-size:16px">Notre estimation de votre bien :</p>
      <table role="presentation" width="100%" style="text-align:center;margin:12px 0">
        <tr>
          <td style="color:#6b7280">Fourchette basse<br><strong style="font-size:18px">${euro(estimation.fourchetteBasse)}</strong></td>
          <td style="color:#0f766e">Estimation<br><strong style="font-size:24px">${euro(estimation.mediane)}</strong></td>
          <td style="color:#6b7280">Fourchette haute<br><strong style="font-size:18px">${euro(estimation.fourchetteHaute)}</strong></td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:13px">
        Prix moyen de la zone : ${euro(estimation.prixM2Zone)}/m² —
        fondé sur ${estimation.nbComparables} ventes comparables${
          estimation.rayonM ? ` dans un rayon de ${estimation.rayonM} m` : ""
        } (confiance ${estimation.confiance}). ${MENTIONS.dvf}.
      </p>`;
  }

  return `
    <p style="font-size:16px">Notre estimation du loyer mensuel (charges comprises) :</p>
    <table role="presentation" width="100%" style="text-align:center;margin:12px 0">
      <tr>
        <td style="color:#6b7280">Basse<br><strong style="font-size:18px">${euro(estimation.loyerBas)}</strong></td>
        <td style="color:#0f766e">Loyer estimé<br><strong style="font-size:24px">${euro(estimation.loyerMedian)}</strong></td>
        <td style="color:#6b7280">Haute<br><strong style="font-size:18px">${euro(estimation.loyerHaut)}</strong></td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:13px">${MENTIONS.anil}.</p>`;
}

export async function envoyerEmailsLead(params: {
  lead: LeadPayload;
  leadId: string;
  score: number;
  estimation: EstimationResultat;
}): Promise<void> {
  const { lead, leadId, score, estimation } = params;
  const siteUrl = SITE.url;

  const recapBien = `${lead.typeBien === "appartement" ? "Appartement" : "Maison"} · ${
    lead.surface
  } m² · ${lead.pieces} pièce(s) — ${lead.adresse.libelle}`;

  // --- 1. Email prospect ---
  const htmlProspect = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827">
    <h1 style="font-size:20px">Votre estimation ${SITE.name}</h1>
    <p>Bonjour ${lead.prenom},</p>
    <p>Merci pour votre confiance. Récapitulatif de votre bien :</p>
    <p style="background:#f3f4f6;padding:10px;border-radius:8px">${recapBien}</p>
    ${blocEstimationHtml(estimation)}
    <div style="background:#ecfdf5;border-radius:8px;padding:14px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Vendez au meilleur prix, accompagné.</strong></p>
      <p style="margin:0 0 8px">Honoraires <strong>${SITE.honoraires.exclusif}</strong> en mandat exclusif
      (diffusion prioritaire, photos professionnelles, engagement de moyens) contre
      ${SITE.honoraires.simple} en mandat simple.</p>
      <p style="margin:0"><a href="${SITE.agent.phoneHref}" style="color:#0f766e;font-weight:bold">
        Prendre rendez-vous : ${SITE.agent.phone}</a></p>
    </div>
    <p>Votre conseillère :<br>
      <strong>${SITE.agent.name}</strong><br>
      ${SITE.agent.phone} — <a href="mailto:${SITE.agent.email}">${SITE.agent.email}</a></p>
    <p style="color:#6b7280;font-size:12px">${MENTIONS.disclaimer}</p>
    <p style="color:#9ca3af;font-size:11px">
      Vous recevez cet email suite à votre demande d'estimation sur ${SITE.name}.
      <a href="${siteUrl}/politique-confidentialite">Politique de confidentialité</a> ·
      Pour ne plus être contacté, répondez « STOP » à cet email ou écrivez à
      <a href="mailto:${SITE.agent.email}">${SITE.agent.email}</a>.
    </p>
  </div>`;

  await envoyerEmail({
    to: [{ email: lead.email, name: `${lead.prenom} ${lead.nom}` }],
    subject:
      estimation === null
        ? `${SITE.name} — votre estimation personnalisée arrive sous 24 h`
        : `Votre estimation ${SITE.name} : ${recapBien.split("—")[0].trim()}`,
    htmlContent: htmlProspect,
  });

  // --- 2. Notification interne ---
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE.agent.email;
  const htmlInterne = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827">
    <h2 style="font-size:18px">Nouveau lead ${SITE.name} — score ${score}/100${
      estimation === null ? " — ⚠️ ESTIMATION MANUELLE" : ""
    }</h2>
    <ul>
      <li><strong>${lead.prenom} ${lead.nom}</strong> — <a href="tel:${normaliserTelephone(
        lead.telephone
      )}">${normaliserTelephone(lead.telephone)}</a> — ${lead.email}</li>
      <li>Projet : ${lead.projet}${lead.horizon ? ` (${lead.horizon})` : ""}</li>
      <li>Bien : ${recapBien}</li>
      <li>Estimation : ${
        estimation === null
          ? "manuelle à réaliser sous 24 h"
          : estimation.projet === "vente"
            ? `${euro(estimation.mediane)} (${euro(estimation.fourchetteBasse)} – ${euro(estimation.fourchetteHaute)})`
            : `${euro(estimation.loyerMedian)}/mois`
      }</li>
    </ul>
    <p><a href="${siteUrl}/admin/leads">Ouvrir la fiche dans l'admin</a> (lead ${leadId})</p>
  </div>`;

  await envoyerEmail({
    to: [{ email: adminEmail }],
    subject: `[Lead ${score}/100] ${lead.prenom} ${lead.nom} — ${
      lead.projet
    } ${lead.typeBien}${estimation === null ? " — MANUELLE" : ""}`,
    htmlContent: htmlInterne,
  });
}
