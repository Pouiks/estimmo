/**
 * Configuration marque / agent - source unique pour le site, les emails
 * et l'écran résultat. Uniquement des DONNÉES : tout texte affiché vit dans
 * messages/<locale>/*.json (i18n).
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
  // Baseline, description, mentions légales : voir messages/<locale>/common.json.
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
  /**
   * Nom affiché dans la boîte mail du prospect (colonne « expéditeur »).
   * Utilisé quand EMAIL_FROM ne contient qu'une adresse nue.
   */
  emailSender: "Carenza Brown · ESTIMMO",
  honoraires: {
    /** Taux en % ; les libellés (« à partir de 3 % ») sont dans messages/common. */
    tauxExclusif: 3,
    tauxSimple: 6,
  },
} as const;
