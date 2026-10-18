import type { Arbre } from "./catalogue";

/** Surcharges d'une langue : clé à points → texte. */
export type Surcharges = Record<string, string>;

/**
 * Applique des surcharges (admin) sur les messages embarqués, sans muter
 * l'original. Une clé inconnue est ignorée : impossible de créer une clé
 * depuis l'admin, seulement de reformuler une clé existante (le code et le
 * typage restent la référence).
 */
export function appliquerSurcharges<T extends Arbre>(messages: T, surcharges: Surcharges): T {
  const entrees = Object.entries(surcharges);
  if (entrees.length === 0) return messages;

  const copie = structuredClone(messages) as Arbre;
  for (const [cle, valeur] of entrees) {
    const segments = cle.split(".");
    const feuille = segments.pop();
    if (!feuille) continue;
    let noeud: Arbre | undefined = copie;
    for (const segment of segments) {
      const suivant: string | Arbre | undefined = noeud?.[segment];
      noeud = typeof suivant === "object" ? suivant : undefined;
      if (!noeud) break;
    }
    if (noeud && typeof noeud[feuille] === "string") noeud[feuille] = valeur;
  }
  return copie as T;
}
