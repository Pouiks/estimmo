/**
 * Calendrier de publication du blog : un article tous les N jours, à heure
 * fixe (heure de Paris, changement d'heure compris). Fonctions pures.
 */

export const FUSEAU = "Europe/Paris";

/** Écart (ms) entre l'heure de Paris et UTC à un instant donné. */
function decalageParis(instantUtc: number): number {
  const parties = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSEAU,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantUtc));
  const v = (type: string) =>
    Number(parties.find((p) => p.type === type)?.value ?? 0);
  const commeUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return commeUtc - instantUtc;
}

/** « 2026-10-20 » + « 07:00 » (heure de Paris) → instant UTC. */
export function instantParis(jour: string, heure: string): Date {
  const [a, m, j] = jour.split("-").map(Number);
  const [h, min] = heure.split(":").map(Number);
  const naif = Date.UTC(a, m - 1, j, h, min);
  // Deux passes : l'écart dépend de l'instant (heure d'été / d'hiver).
  const approx = naif - decalageParis(naif);
  return new Date(naif - decalageParis(approx));
}

/** Ajoute des jours calendaires à une date « AAAA-MM-JJ ». */
export function ajouterJours(jour: string, jours: number): string {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + jours)).toISOString().slice(0, 10);
}

/** Date de publication du rang `index` (0 = premier article). */
export function datePublication(params: {
  debut: string;
  intervalleJours: number;
  heure: string;
  index: number;
}): Date {
  return instantParis(
    ajouterJours(params.debut, params.index * params.intervalleJours),
    params.heure
  );
}

/** « AAAA-MM-JJTHH:MM » en heure de Paris (champ datetime-local de l'admin). */
export function versChampParis(date: Date): string {
  const decale = new Date(date.getTime() + decalageParis(date.getTime()));
  return decale.toISOString().slice(0, 16);
}

/** Inverse de versChampParis. */
export function depuisChampParis(valeur: string): Date {
  const [jour, heure] = valeur.split("T");
  return instantParis(jour, heure.slice(0, 5));
}
