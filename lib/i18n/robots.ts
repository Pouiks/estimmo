/**
 * Détection des robots d'indexation et outils d'audit : ils ne doivent
 * jamais être redirigés selon Accept-Language (Google déconseille les
 * redirections automatiques par langue). Ils voient le français à la racine
 * et découvrent /en via les hreflang et le sitemap. « google » couvre les
 * agents sans « bot » (Google-InspectionTool, GoogleOther, Mediapartners,
 * Google-Site-Verification…) : vérifié le 11/11/2026, ils recevaient le 307
 * de langue quand ils annonçaient un Accept-Language anglais.
 */
const ROBOTS =
  /bot|crawl|spider|slurp|google|facebookexternalhit|embedly|pinterest|whatsapp|telegram|skype|w3c_validator|lighthouse|headlesschrome|duckduck|bingpreview|yandex|baidu|applebot|petalbot|semrush|ahrefs|mj12|seznam|sogou|exabot|ia_archiver|screaming frog|validator/i;

export function estRobot(userAgent: string | null | undefined): boolean {
  // Pas de User-Agent : pas un navigateur, on ne négocie pas.
  if (!userAgent || !userAgent.trim()) return true;
  return ROBOTS.test(userAgent);
}
