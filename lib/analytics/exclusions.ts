/**
 * Exclusion des statistiques du formulaire (tests du propriétaire, admin) :
 * - par adresse IP : variable `ANALYTICS_IPS_EXCLUES` (liste séparée par des
 *   virgules), vérifiée par /api/track ;
 * - par navigateur : cookie `estimmo_sans_suivi=1`, posé par le proxy sur
 *   tout navigateur qui utilise l'admin, lu par le tunnel (aucun envoi) et
 *   revérifié par /api/track.
 * Fonctions pures, sans dépendance au runtime.
 */

export const COOKIE_SANS_SUIVI = "estimmo_sans_suivi";
/** Un an, en secondes. */
export const DUREE_COOKIE_SANS_SUIVI = 365 * 24 * 3600;

/** « ::ffff:1.2.3.4 » (IPv4 encapsulée) → « 1.2.3.4 ». */
export function normaliserIp(ip: string): string {
  const valeur = ip.trim().toLowerCase();
  return valeur.startsWith("::ffff:") ? valeur.slice(7) : valeur;
}

/** Liste d'IP d'une variable d'environnement (virgules, points-virgules, espaces). */
export function listeIps(valeur: string | undefined | null): string[] {
  if (!valeur) return [];
  return valeur
    .split(/[\s,;]+/)
    .map(normaliserIp)
    .filter((ip) => ip.length > 0);
}

export function ipExclue(ip: string, liste: string | undefined | null): boolean {
  const ips = listeIps(liste);
  return ips.length > 0 && ips.includes(normaliserIp(ip));
}

/** Vrai si l'en-tête Cookie (ou document.cookie) porte estimmo_sans_suivi=1. */
export function cookieSansSuivi(cookies: string | undefined | null): boolean {
  if (!cookies) return false;
  return cookies.split(";").some((morceau) => {
    const [nom, ...reste] = morceau.split("=");
    return nom.trim() === COOKIE_SANS_SUIVI && reste.join("=").trim() === "1";
  });
}
