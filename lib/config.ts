/**
 * Configuration marque / agent - source unique pour le site, les emails
 * et l'écran résultat.
 */
/**
 * Une faute dans NEXT_PUBLIC_SITE_URL (ex. « htps:// ») casse canoniques,
 * sitemap et liens des emails pour tout le site : on répare le schéma et on
 * retire le slash final (sinon URLs à double slash).
 */
export function normaliserUrlSite(brut: string): string {
  // Ne retire que ce qui ressemble à un schéma (lettres + « : ») et les
  // slashs qui suivent ; « www.site.fr » reste intact.
  const sansSchema = brut.trim().replace(/^(?:[a-z]+:)?\/*/i, "");
  const schema = /^http:\/\/(localhost|127\.0\.0\.1)/i.test(brut.trim())
    ? "http://"
    : "https://";
  return (schema + sansSchema).replace(/\/+$/, "");
}

export const SITE = {
  name: "ESTIMMO",
  baseline: "Estimation immobilière gratuite, partout en France",
  description:
    "Estimez gratuitement le prix de vente ou le loyer de votre bien immobilier en 2 minutes, sur la base des données officielles DVF et ANIL.",
  // Slash final retiré : SITE.url est concaténé (sitemap, canoniques JSON-LD,
  // robots, emails) - un "/" final produirait des URLs à double slash.
  url: normaliserUrlSite(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000")
  ),
  agent: {
    name: "Carenza Brown",
    phone: "06 11 11 84 69",
    phoneHref: "tel:+33611118469",
    email: "carenza.brown@iadfrance.fr",
  },
  honoraires: {
    exclusif: "à partir de 3 %",
    simple: "minimum 6 %",
  },
} as const;

export const MENTIONS = {
  anil: "Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin",
  dvf: "Source : DVF - data.gouv.fr",
  disclaimer:
    "Estimation indicative fondée sur les données publiques DVF/ANIL, ne constitue pas un avis de valeur. Une visite est nécessaire pour un prix précis.",
} as const;
