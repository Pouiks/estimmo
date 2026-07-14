/**
 * Templates HTML des emails transactionnels ESTIMMO.
 * HTML « email-safe » : layout en tables, styles inline, largeur 600 px,
 * polices web-safe — compatible Gmail, Outlook, Apple Mail.
 * Aucune dépendance serveur ici (pur rendu) → réutilisable en preview.
 */
import type { EstimationResultat } from "@/lib/crm/payload";
import type { LeadPayload } from "@/lib/leads/schema";
import { MENTIONS, SITE } from "@/lib/config";

const COL = {
  brand: "#0f766e",
  brandDark: "#115e56",
  brandLight: "#ecfdf5",
  brandBorder: "#99f6e4",
  ink: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  cardBg: "#f9fafb",
  pageBg: "#eef2f1",
} as const;

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const initiales = SITE.agent.name
  .split(/\s+/)
  .map((w) => w[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

function typeBienLabel(lead: LeadPayload): string {
  return lead.typeBien === "appartement" ? "Appartement" : "Maison";
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
function recapBien(lead: LeadPayload): string {
  const details = [
    typeBienLabel(lead),
    `${lead.surface} m²`,
    `${lead.pieces} pièce${lead.pieces > 1 ? "s" : ""}`,
  ].join(" · ");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.cardBg};border:1px solid ${COL.border};border-radius:12px;margin:0 0 24px">
    <tr>
      <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${COL.faint}">Votre bien</p>
        <p style="margin:0;font-size:15px;font-weight:bold;color:${COL.ink}">${details}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${COL.muted}">${lead.adresse.libelle}</p>
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
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#a7f3d0">${label}</div>
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
function blocEstimation(estimation: EstimationResultat): string {
  // Zone non couverte / trop peu de comparables → analyse manuelle offerte
  if (estimation === null) {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COL.brandLight};border:1px solid ${COL.brandBorder};border-radius:12px;margin:0 0 8px">
      <tr>
        <td style="padding:20px;font-family:Arial,Helvetica,sans-serif;text-align:center">
          <p style="margin:0 0 6px;font-size:17px;font-weight:bold;color:${COL.brandDark}">Votre estimation personnalisée arrive sous 24&nbsp;h</p>
          <p style="margin:0;font-size:14px;color:${COL.ink};line-height:1.6">
            Votre secteur mérite une analyse sur mesure. <strong>${SITE.agent.name}</strong>
            réalise votre estimation offerte et vous rappelle au numéro indiqué
            sous 24&nbsp;heures.
          </p>
        </td>
      </tr>
    </table>`;
  }

  if (estimation.projet === "vente") {
    return `
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COL.muted};text-align:center">Estimation de la valeur de votre bien</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">
      <tr>
        ${colChiffre("Basse", euro(estimation.fourchetteBasse))}
        ${colChiffre("Estimation", euro(estimation.mediane), true)}
        ${colChiffre("Haute", euro(estimation.fourchetteHaute))}
      </tr>
    </table>
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COL.faint};text-align:center;line-height:1.6">
      Prix de votre zone : <strong style="color:${COL.muted}">${euro(estimation.prixM2Zone)}/m²</strong> ·
      ${estimation.nbComparables} ventes comparables${estimation.rayonM ? ` dans un rayon de ${estimation.rayonM} m` : ""} ·
      confiance ${estimation.confiance}.<br>${MENTIONS.dvf}.
    </p>`;
  }

  return `
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COL.muted};text-align:center">Loyer mensuel estimé (charges comprises)</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">
      <tr>
        ${colChiffre("Basse", euro(estimation.loyerBas))}
        ${colChiffre("Loyer estimé", euro(estimation.loyerMedian), true)}
        ${colChiffre("Haute", euro(estimation.loyerHaut))}
      </tr>
    </table>
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COL.faint};text-align:center;line-height:1.6">${MENTIONS.anil}.</p>`;
}

/** Carte « Carenza vous rappelle » — cœur de l'email (recontact + vente). */
function blocCarenza(
  lead: LeadPayload,
  estimation: EstimationResultat,
  ctaHref: string
): string {
  const message =
    estimation === null
      ? `Bonjour ${lead.prenom}, je prépare personnellement votre estimation et je vous rappelle très vite. Ensemble, nous verrons comment valoriser au mieux votre bien.`
      : lead.projet === "vente"
        ? `Bonjour ${lead.prenom}, je vous rappelle personnellement pour affiner cette estimation sur place et, si vous le souhaitez, vendre votre bien au meilleur prix. Photos professionnelles, diffusion prioritaire, négociation : je m'occupe de tout.`
        : `Bonjour ${lead.prenom}, je vous rappelle personnellement pour affiner cette estimation de loyer et vous accompagner dans la mise en location de votre bien, de la recherche du locataire au bail.`;

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
              <div style="font-size:13px;color:${COL.brandDark}">Votre conseillère immobilière</div>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COL.ink}">
          ${message}
        </p>

        ${bouton(ctaHref, "📞 Je souhaite être rappelé(e)")}

        <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COL.muted};text-align:center">
          Ou appelez directement Carenza :
          <a href="${SITE.agent.phoneHref}" style="color:${COL.brand};font-weight:bold;text-decoration:none">${SITE.agent.phone}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

/** Bloc honoraires (exclusif vs simple) — uniquement pour un projet de vente. */
function blocHonoraires(lead: LeadPayload): string {
  if (lead.projet !== "vente") return "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COL.border};border-radius:12px;margin:0 0 24px">
    <tr>
      <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:${COL.ink}">Vendez au meilleur prix, accompagné(e) de bout en bout</p>
        <p style="margin:0;font-size:13px;color:${COL.muted};line-height:1.6">
          Honoraires <strong style="color:${COL.brandDark}">${SITE.honoraires.exclusif}</strong> en mandat exclusif
          (diffusion prioritaire, photos professionnelles, engagement de moyens écrit)
          contre ${SITE.honoraires.simple} en mandat simple.
        </p>
      </td>
    </tr>
  </table>`;
}

/** Enveloppe complète (préheader caché + header + contenu + footer). */
function layout(preheader: string, contenu: string): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
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
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;letter-spacing:.03em;color:#ffffff">ESTI<span style="color:#a7f3d0">MMO</span></div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#d1fae5;margin-top:4px">${SITE.baseline}</div>
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
                <p style="margin:0 0 12px;font-size:11px;color:${COL.faint};line-height:1.6">${MENTIONS.disclaimer}</p>
                <p style="margin:0;font-size:11px;color:${COL.faint};line-height:1.6">
                  Vous recevez cet email suite à votre demande d'estimation sur ${SITE.name}.
                  <a href="${SITE.url}/politique-confidentialite" style="color:${COL.muted}">Politique de confidentialité</a>.
                  Pour ne plus être contacté(e), répondez «&nbsp;STOP&nbsp;» à cet email.
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

/** Email de confirmation envoyé au prospect. */
export function renderEmailProspect(params: {
  lead: LeadPayload;
  estimation: EstimationResultat;
  /** URL signée de demande de rappel (flag RGPD). Défaut : lien tel: (preview). */
  rappelUrl?: string;
}): EmailRendu {
  const { lead, estimation } = params;
  const ctaHref = params.rappelUrl ?? SITE.agent.phoneHref;

  const subject =
    estimation === null
      ? `${lead.prenom}, votre estimation personnalisée arrive sous 24 h`
      : `${lead.prenom}, votre estimation ${SITE.name} est prête`;

  const preheader =
    estimation === null
      ? `${SITE.agent.name} vous prépare une estimation sur mesure et vous rappelle sous 24 h.`
      : `Découvrez votre estimation et échangez avec ${SITE.agent.name}, votre conseillère.`;

  const contenu = `
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${COL.ink}">Bonjour ${lead.prenom},</p>
    <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COL.muted}">
      Merci d'avoir estimé votre bien avec ${SITE.name}. Voici votre résultat,
      fondé sur les ventes réelles de votre quartier.
    </p>
    ${recapBien(lead)}
    ${blocEstimation(estimation)}
    ${blocCarenza(lead, estimation, ctaHref)}
    ${blocHonoraires(lead)}
  `;

  return { subject, html: layout(preheader, contenu) };
}
