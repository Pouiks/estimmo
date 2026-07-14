import "server-only";
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { normaliserTelephone } from "@/lib/leads/schema";
import { SITE } from "@/lib/config";
import { renderEmailProspect } from "./template";

/**
 * Emails transactionnels Brevo (API v3).
 * Sans BREVO_API_KEY / BREVO_SENDER_EMAIL (dev) : mode simulation, contenu
 * loggé en console. Les échecs sont remontés à l'appelant qui ne doit JAMAIS
 * bloquer le lead.
 */
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
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
      sender: { email: senderEmail, name: `${SITE.agent.name} · ${SITE.name}` },
      to: params.to,
      replyTo: params.replyTo,
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

export async function envoyerEmailsLead(params: {
  lead: LeadPayload;
  leadId: string;
  score: number;
  estimation: EstimationResultat;
}): Promise<void> {
  const { lead, leadId, score, estimation } = params;

  // --- 1. Email prospect (template designé) ---
  const { subject, html } = renderEmailProspect({ lead, estimation });
  await envoyerEmail({
    to: [{ email: lead.email, name: `${lead.prenom} ${lead.nom}` }],
    subject,
    htmlContent: html,
    // Les réponses des prospects arrivent directement à l'agent.
    replyTo: { email: SITE.agent.email, name: SITE.agent.name },
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
    to: [{ email: adminEmail }],
    subject: `[Lead ${score}/100] ${lead.prenom} ${lead.nom} — ${lead.projet} ${lead.typeBien}${
      estimation === null ? " — MANUELLE" : ""
    }`,
    htmlContent: htmlInterne,
    replyTo: { email: lead.email, name: `${lead.prenom} ${lead.nom}` },
  });
}
