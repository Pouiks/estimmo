/**
 * Configuration marque / agent - source unique pour le site, les emails
 * et l'écran résultat.
 */
export const SITE = {
  name: "ESTIMMO",
  baseline: "Estimation immobilière gratuite, partout en France",
  description:
    "Estimez gratuitement le prix de vente ou le loyer de votre bien immobilier en 2 minutes, sur la base des données officielles DVF et ANIL.",
  // Slash final retiré : SITE.url est concaténé (sitemap, canoniques JSON-LD,
  // robots, emails) - un "/" final produirait des URLs à double slash.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  ),
  agent: {
    name: "Carenza Brown",
    phone: "06 12 34 56 78",
    phoneHref: "tel:+33612345678",
    email: "browncarenza@gmail.com",
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
