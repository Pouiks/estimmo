/**
 * Templates HTML des emails transactionnels ESTIMMO.
 * HTML « email-safe » : layout en tables, styles inline, largeur 600 px,
 * polices web-safe - compatible Gmail, Outlook, Apple Mail.
 * Aucune dépendance serveur ici (pur rendu) → réutilisable en preview.
 *
 * Les textes viennent de messages/<locale>/email.json (+ labels, common) :
 * l'appelant fournit un traducteur racine `t` et un formateur `format`
 * (getTranslations/getFormatter côté serveur, createTranslator/
 * createFormatter dans le script de preview).
 */
import type { useFormatter, useTranslations } from "next-intl";
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { SITE } from "@/lib/config";
import type { Locale } from "@/lib/i18n/routing";
import { urlAbsolue } from "@/lib/i18n/seo";
import { escapeHtml } from "@/lib/security/html";

export type TraducteurEmail = ReturnType<typeof useTranslations<never>>;
export type FormateurEmail = ReturnType<typeof useFormatter>;

const COL = {
  brand: "#2e90e5",
  brandDark: "#1e5c93",
  brandLight: "#eaf4fc",
  brandBorder: "#bbd9f5",
  ink: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  cardBg: "#f9fafb",
  pageBg: "#eef2f1",
} as const;

/**
 * « virgile » → « Virgile », « jean-pierre » → « Jean-Pierre ».
 * Le prénom est saisi librement dans le formulaire ; en sujet d'email une
 * minuscule initiale fait brouillon.
 */
export function prenomPropre(prenom: string): string {
  return prenom
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase("fr-FR"));
}

const initiales = SITE.agent.name
  .split(/\s+/)
  .map((w) => w[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

const prenomAgent = SITE.agent.name.split(/\s+/)[0];

/** Balise <strong> pour t.markup (messages HTML). */
const strong = (chunks: string) => `<strong>${chunks}</strong>`;

interface Contexte {
  lead: LeadPayload;
  estimation: EstimationResultat;
  t: TraducteurEmail;
  format: FormateurEmail;
  euro: (n: number) => string;
}

/** Bouton « bulletproof » (table + cellule colorée). */
function bouton(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto">
    <tr>
      <td align="center" bgcolor="${COL.brand}" style="border-radius:10px">
        <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Récapitulatif du bien (carte grise). */
function recapBien({ lead, t }: Contexte): string {
  const details = [
    t(`labels.typeBien.${lead.typeBien}`),
    t("email.recap.surface", { surface: String(lead.surface) }),
    t("email.recap.pieces", { n: lead.pieces }),
  ].join(" · ");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.cardBg};border:1px solid ${COL.border};border-radius:12px;margin:0 0 24px">
    <tr>
      <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${COL.faint}">${t("email.recap.titre")}</p>
        <p style="margin:0;font-size:15px;font-weight:bold;color:${COL.ink}">${details}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${COL.muted}">${escapeHtml(lead.adresse.libelle)}</p>
      </td>
    </tr>
  </table>`;
}

/** Colonne d'un trio de chiffres (basse / médiane / haute). */
function colChiffre(
  label: string,
  valeur: string,
  mise_en_avant = false
): string {
  if (mise_en_avant) {
    return `
    <td align="center" width="40%" style="padding:6px">
      <div style="background:${COL.brand};border-radius:12px;padding:14px 6px">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#bbdcfb">${label}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;color:#ffffff;line-height:1.2;margin-top:2px">${valeur}</div>
      </div>
    </td>`;
  }
  return `
    <td align="center" width="30%" style="padding:6px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${COL.faint}">${label}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:${COL.ink};margin-top:2px">${valeur}</div>
    </td>`;
}

/** Bloc résultat selon le type d'estimation (vente / location / manuelle). */
function blocEstimation({ estimation, t, euro }: Contexte): string {
  // Zone non couverte / trop peu de comparables → analyse manuelle offerte
  if (estimation === null) {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.brandLight};border:1px solid ${COL.brandBorder};border-radius:12px;margin:0 0 8px">
      <tr>
        <td style="padding:20px;font-family:Arial,Helvetica,sans-serif;text-align:center">
          <p style="margin:0 0 6px;font-size:17px;font-weight:bold;color:${COL.brandDark}">${t("email.manuelle.titre")}</p>
          <p style="margin:0;font-size:14px;color:${COL.ink};line-height:1.6">
            ${t.markup("email.manuelle.texte", { agent: SITE.agent.name, strong })}
          </p>
        </td>
      </tr>
    </table>`;
  }

  if (estimation.projet === "vente") {
    const details = t.markup("email.vente.details", {
      prixM2: euro(estimation.prixM2Zone),
      n: estimation.nbComparables,
      rayon: estimation.rayonM ? String(estimation.rayonM) : "none",
      confiance: t(`labels.confiance.${estimation.confiance}`).toLowerCase(),
      strong: (chunks: string) => `<strong style="color:${COL.muted}">${chunks}</strong>`,
    });
    return `
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COL.muted};text-align:center">${t("email.vente.titre")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">
      <tr>
        ${colChiffre(t("email.vente.basse"), euro(estimation.fourchetteBasse))}
        ${colChiffre(t("email.vente.estimation"), euro(estimation.mediane), true)}
        ${colChiffre(t("email.vente.haute"), euro(estimation.fourchetteHaute))}
      </tr>
    </table>
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COL.faint};text-align:center;line-height:1.6">
      ${details}<br>${t("email.vente.source", { dvf: t("common.mentions.dvf") })}
    </p>`;
  }

  return `
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COL.muted};text-align:center">${t("email.location.titre")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">
      <tr>
        ${colChiffre(t("email.location.basse"), euro(estimation.loyerBas))}
        ${colChiffre(t("email.location.estimation"), euro(estimation.loyerMedian), true)}
        ${colChiffre(t("email.location.haute"), euro(estimation.loyerHaut))}
      </tr>
    </table>
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COL.faint};text-align:center;line-height:1.6">${t("email.location.source", { anil: t("common.mentions.anil") })}</p>`;
}

/** Carte « la conseillère vous rappelle » - cœur de l'email (recontact + vente). */
function blocConseillere(
  { lead, estimation, t }: Contexte,
  prenom: string,
  ctaHref: string
): string {
  const cas =
    estimation === null ? "manuelle" : lead.projet === "vente" ? "vente" : "location";
  const message = t(`email.conseillere.${cas}`, { prenom: escapeHtml(prenom) });

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.brandLight};border:1px solid ${COL.brandBorder};border-radius:14px;margin:8px 0 24px">
    <tr>
      <td style="padding:22px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="56" valign="middle">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="56" height="56" align="center" valign="middle" bgcolor="${COL.brand}" style="width:56px;height:56px;border-radius:28px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff">${initiales}</td>
                </tr>
              </table>
            </td>
            <td valign="middle" style="padding-left:14px;font-family:Arial,Helvetica,sans-serif">
              <div style="font-size:16px;font-weight:bold;color:${COL.ink}">${SITE.agent.name}</div>
              <div style="font-size:13px;color:${COL.brandDark}">${t("email.conseillere.role")}</div>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COL.ink}">
          ${message}
        </p>

        ${bouton(ctaHref, t("email.conseillere.bouton"))}

        <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COL.muted};text-align:center">
          ${t("email.conseillere.ouAppeler", { prenomAgent })}
          <a href="${SITE.agent.phoneHref}" style="color:${COL.brand};font-weight:bold;text-decoration:none">${SITE.agent.phone}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

/** Bloc honoraires (exclusif vs simple) - uniquement pour un projet de vente. */
function blocHonoraires({ lead, t }: Contexte): string {
  if (lead.projet !== "vente") return "";
  const texte = t.markup("email.honoraires.texte", {
    exclusif: t("common.honoraires.exclusif", { taux: SITE.honoraires.tauxExclusif }),
    simple: t("common.honoraires.simple", { taux: SITE.honoraires.tauxSimple }),
    strong: (chunks: string) => `<strong style="color:${COL.brandDark}">${chunks}</strong>`,
  });
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COL.border};border-radius:12px;margin:0 0 24px">
    <tr>
      <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:${COL.ink}">${t("email.honoraires.titre")}</p>
        <p style="margin:0;font-size:13px;color:${COL.muted};line-height:1.6">${texte}</p>
      </td>
    </tr>
  </table>`;
}

/** Enveloppe complète (préheader caché + header + contenu + footer). */
function layout(
  { t }: Contexte,
  locale: Locale,
  preheader: string,
  contenu: string
): string {
  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${SITE.name}</title>
</head>
<body style="margin:0;padding:0;background:${COL.pageBg}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COL.pageBg}">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.pageBg}">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;margin:0 auto">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${COL.brand}" style="padding:26px 24px;border-radius:16px 16px 0 0">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;letter-spacing:.03em;color:#ffffff">ESTI<span style="color:#bbdcfb">MMO</span></div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#dbeafb;margin-top:4px">${t("common.baseline")}</div>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td bgcolor="#ffffff" style="padding:30px 28px">
              ${contenu}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#ffffff" style="padding:0 28px 30px;border-radius:0 0 16px 16px">
              <div style="border-top:1px solid ${COL.border};padding-top:20px;font-family:Arial,Helvetica,sans-serif">
                <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:${COL.ink}">${SITE.agent.name}</p>
                <p style="margin:0 0 12px;font-size:13px;color:${COL.muted}">
                  ${SITE.agent.phone} ·
                  <a href="mailto:${SITE.agent.email}" style="color:${COL.brand};text-decoration:none">${SITE.agent.email}</a>
                </p>
                <p style="margin:0 0 12px;font-size:11px;color:${COL.faint};line-height:1.6">${t("common.mentions.disclaimer")}</p>
                <p style="margin:0;font-size:11px;color:${COL.faint};line-height:1.6">
                  ${t("email.pied.recu", { marque: SITE.name })}
                  <a href="${urlAbsolue("/politique-confidentialite", locale)}" style="color:${COL.muted}">${t("email.pied.confidentialite")}</a>.
                  ${t("email.pied.stop")}
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface EmailRendu {
  subject: string;
  html: string;
}

/** Email de confirmation envoyé au prospect, dans sa langue. */
export function renderEmailProspect(params: {
  lead: LeadPayload;
  estimation: EstimationResultat;
  locale: Locale;
  t: TraducteurEmail;
  format: FormateurEmail;
  /** URL signée de demande de rappel (flag RGPD). Défaut : lien tel: (preview). */
  rappelUrl?: string;
}): EmailRendu {
  const { lead, estimation, locale, t, format } = params;
  const euro = (n: number) => format.number(n, "currency");
  const ctx: Contexte = { lead, estimation, t, format, euro };
  const ctaHref = params.rappelUrl ?? SITE.agent.phoneHref;

  const prenom = prenomPropre(lead.prenom);
  const bien = t(`labels.typeBienMinuscule.${lead.typeBien}`);
  const cas =
    estimation === null ? "manuelle" : estimation.projet === "vente" ? "vente" : "location";

  // Sujet : le chiffre dans l'objet, c'est ce qui fait ouvrir le mail.
  const subject =
    estimation === null
      ? t("email.sujet.manuelle", { prenom })
      : estimation.projet === "vente"
        ? t("email.sujet.vente", {
            prenom,
            bien,
            basse: euro(estimation.fourchetteBasse),
            haute: euro(estimation.fourchetteHaute),
          })
        : t("email.sujet.location", { prenom, bien, loyer: euro(estimation.loyerMedian) });

  const preheader = t(`email.preheader.${cas}`, { agent: SITE.agent.name });

  const contenu = `
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${COL.ink}">${t("email.bonjour", { prenom: escapeHtml(prenom) })}</p>
    <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COL.muted}">
      ${t("email.merci", { marque: SITE.name })}
    </p>
    ${recapBien(ctx)}
    ${blocEstimation(ctx)}
    ${blocConseillere(ctx, prenom, ctaHref)}
    ${blocHonoraires(ctx)}
  `;

  return { subject, html: layout(ctx, locale, preheader, contenu) };
}
