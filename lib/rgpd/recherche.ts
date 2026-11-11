/**
 * Recherche d'un prospect dans l'admin (email, téléphone, nom) - fonction
 * pure qui transforme la saisie en filtre PostgREST `.or()`.
 */
import { normaliserTelephone } from "@/lib/leads/schema";

export interface CritereRecherche {
  /** Saisie nettoyée (trim), vide si rien à chercher. */
  texte: string;
  /** Filtre PostgREST pour `.or()`, ou null si la saisie est vide. */
  filtre: string | null;
}

/** Retire les caractères qui auraient un sens dans la syntaxe de filtre PostgREST. */
function echapper(valeur: string): string {
  return valeur.replace(/[,().*\\"']/g, " ").replace(/\s+/g, " ").trim();
}

export function critereRecherche(saisie: string | undefined | null): CritereRecherche {
  const texte = (saisie ?? "").trim();
  if (!texte) return { texte: "", filtre: null };

  const motif = echapper(texte);
  if (!motif) return { texte, filtre: null };

  const clauses: string[] = [
    `email.ilike.*${motif}*`,
    `nom.ilike.*${motif}*`,
    `prenom.ilike.*${motif}*`,
  ];

  // « 06 12 34 56 78 », « +33 6 12… » → « 0612345678 » (forme stockée).
  const chiffres = texte.replace(/[\s.()-]/g, "");
  if (/^(\+|00)?\d{6,}$/.test(chiffres)) {
    clauses.push(`telephone.ilike.*${normaliserTelephone(chiffres)}*`);
  }

  return { texte, filtre: clauses.join(",") };
}
