import "server-only";
import { getFormatter, getTranslations } from "next-intl/server";
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { normaliserTelephone } from "@/lib/leads/schema";
import { rappelToken } from "@/lib/leads/rappel-token";
import { SITE } from "@/lib/config";
import { urlAbsolue } from "@/lib/i18n/seo";
import { escapeHtml } from "@/lib/security/html";
import { renderEmailProspect } from "./template";

/**
 * Emails transactionnels via Resend.
 * Sans RESEND_API_KEY / EMAIL_FROM (dev) : mode simulation, contenu loggé en
 * console. Les échecs sont remontés à l'appelant qui ne doit JAMAIS bloquer
 * le lead.
 *
 * EMAIL_FROM doit utiliser un domaine vérifié dans Resend, au format
 * « Nom affiché <adresse@domaine-verifie> » (ex. estimmo-direct.com).
 */
const RESEND_URL = "https://api.resend.com/emails";

interface EmailParams {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Garantit un nom d'expéditeur lisible dans la boîte mail : si EMAIL_FROM
 * est une adresse nue (« no-reply@… »), Gmail afficherait « no-reply ».
 * On la préfixe alors avec SITE.emailSender.
 */
export function expediteur(from: string | undefined): string | undefined {
  if (!from) return undefined;
  const brut = from.trim().replace(/^"(.*)"$/, "$1");
  if (!brut) return undefined;
  if (brut.includes("<")) return brut;
  return `${SITE.emailSender} <${brut}>`;
}

async function envoyerEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = expediteur(process.env.EMAIL_FROM);

  if (!apiKey || !from) {
    console.log(
      `[email:simulation] À: ${params.to.join(", ")} - Sujet: ${params.subject}`
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

export async function envoyerEmailsLead(params: {
  lead: LeadPayload;
  leadId: string;
  score: number;
  estimation: EstimationResultat;
}): Promise<void> {
  const { lead, leadId, score, estimation } = params;
  const locale = lead.locale;

  // --- 1. Email prospect (template designé, dans la langue du prospect) ---
  // Lien signé « être rappelé » → pose le flag demande_rappel (RGPD).
  const rappelUrl = `${urlAbsolue("/rappel", locale)}?lead=${leadId}&t=${rappelToken(leadId)}`;
  const [t, format] = await Promise.all([
    getTranslations({ locale }),
    getFormatter({ locale }),
  ]);
  const { subject, html } = renderEmailProspect({
    lead,
    estimation,
    locale,
    t,
    format,
    rappelUrl,
  });
  await envoyerEmail({
    to: [lead.email],
    subject,
    html,
    // Les réponses des prospects arrivent directement à l'agent.
    replyTo: SITE.agent.email,
  });

  // --- 2. Notification interne à l'agent (toujours en français) ---
  const [tfr, formatFr] = await Promise.all([
    getTranslations({ locale: "fr" }),
    getFormatter({ locale: "fr" }),
  ]);
  const euro = (n: number) => formatFr.number(n, "currency");
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE.agent.email;
  const tel = normaliserTelephone(lead.telephone);
  // Valeurs saisies par le prospect : toujours échappées avant insertion HTML.
  const prenom = escapeHtml(lead.prenom);
  const nom = escapeHtml(lead.nom);
  const email = escapeHtml(lead.email);
  const typeBien = tfr(`labels.typeBien.${lead.typeBien}`);
  const projet = tfr(`labels.projet.${lead.projet}`);
  const horizon = lead.horizon ? ` (${tfr(`labels.horizon.${lead.horizon}`)})` : "";
  const recapBien = `${typeBien} · ${lead.surface} m² · ${tfr("email.recap.pieces", { n: lead.pieces })} - ${escapeHtml(lead.adresse.libelle)}`;

  const htmlInterne = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:560px">
    <h2 style="font-size:18px">Nouveau lead ${SITE.name} - score ${score}/100${estimation === null ? " - ⚠️ ESTIMATION MANUELLE" : ""
    }</h2>
    <ul style="line-height:1.7">
      <li><strong>${prenom} ${nom}</strong> - <a href="tel:${tel}">${tel}</a> - ${email}</li>
      <li>Projet : ${projet}${horizon}</li>
      <li>Bien : ${recapBien}</li>
      <li>Estimation : ${estimation === null
      ? "manuelle à réaliser sous 24 h"
      : estimation.projet === "vente"
        ? `${euro(estimation.mediane)} (${euro(estimation.fourchetteBasse)} – ${euro(estimation.fourchetteHaute)})`
        : `${euro(estimation.loyerMedian)}/mois`
    }</li>
      <li>${tfr("email.interne.langue", { langue: tfr(`common.langues.${locale}`) })}</li>
    </ul>
    <p><a href="${SITE.url}/admin/leads">Ouvrir la fiche dans l'admin</a> (lead ${leadId})</p>
  </div>`;

  await envoyerEmail({
    to: [adminEmail],
    subject: `[Lead ${score}/100] ${lead.prenom} ${lead.nom} - ${projet.toLowerCase()} ${typeBien.toLowerCase()}${estimation === null ? " - MANUELLE" : ""
      }`,
    html: htmlInterne,
    replyTo: lead.email,
  });
}
