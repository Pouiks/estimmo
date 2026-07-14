import "server-only";
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { normaliserTelephone } from "@/lib/leads/schema";
import { rappelToken } from "@/lib/leads/rappel-token";
import { SITE } from "@/lib/config";
import { renderEmailProspect } from "./template";

/**
 * Emails transactionnels via Resend.
 * Sans RESEND_API_KEY / EMAIL_FROM (dev) : mode simulation, contenu loggé en
 * console. Les échecs sont remontés à l'appelant qui ne doit JAMAIS bloquer
 * le lead.
 *
 * EMAIL_FROM doit utiliser un domaine vérifié dans Resend, au format
 * « Nom affiché <adresse@domaine-verifie> » (ex. earlypanel.fr).
 */
const RESEND_URL = "https://api.resend.com/emails";

interface EmailParams {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

async function envoyerEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(
      `[email:simulation] À: ${params.to.join(", ")} — Sujet: ${params.subject}`
    );
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status} : ${detail.slice(0, 300)}`);
  }
}

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export async function envoyerEmailsLead(params: {
  lead: LeadPayload;
  leadId: string;
  score: number;
  estimation: EstimationResultat;
}): Promise<void> {
  const { lead, leadId, score, estimation } = params;

  // --- 1. Email prospect (template designé) ---
  // Lien signé « être rappelé » → pose le flag demande_rappel (RGPD).
  const rappelUrl = `${SITE.url}/rappel?lead=${leadId}&t=${rappelToken(leadId)}`;
  const { subject, html } = renderEmailProspect({ lead, estimation, rappelUrl });
  await envoyerEmail({
    to: [lead.email],
    subject,
    html,
    // Les réponses des prospects arrivent directement à l'agent.
    replyTo: SITE.agent.email,
  });

  // --- 2. Notification interne à l'agent ---
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE.agent.email;
  const tel = normaliserTelephone(lead.telephone);
  const recapBien = `${lead.typeBien === "appartement" ? "Appartement" : "Maison"} · ${lead.surface} m² · ${lead.pieces} pièce(s) — ${lead.adresse.libelle}`;

  const htmlInterne = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:560px">
    <h2 style="font-size:18px">Nouveau lead ${SITE.name} — score ${score}/100${
      estimation === null ? " — ⚠️ ESTIMATION MANUELLE" : ""
    }</h2>
    <ul style="line-height:1.7">
      <li><strong>${lead.prenom} ${lead.nom}</strong> — <a href="tel:${tel}">${tel}</a> — ${lead.email}</li>
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
    <p><a href="${SITE.url}/admin/leads">Ouvrir la fiche dans l'admin</a> (lead ${leadId})</p>
  </div>`;

  await envoyerEmail({
    to: [adminEmail],
    subject: `[Lead ${score}/100] ${lead.prenom} ${lead.nom} — ${lead.projet} ${lead.typeBien}${
      estimation === null ? " — MANUELLE" : ""
    }`,
    html: htmlInterne,
    replyTo: lead.email,
  });
}
