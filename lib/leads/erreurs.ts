import type { z } from "zod";

/**
 * Erreurs de validation du tunnel, partagées client/serveur.
 * Les schémas Zod portent des clés de traduction (validation.*) à la place
 * des messages ; ce module les convertit en messages lisibles.
 */
export type ErreursChamps = Record<string, string>;
export type Traduire = (cle: string) => string;

/**
 * Error map Zod (passée à chaque safeParse) : les règles sans message
 * explicite (int, min, max, enum, type) reçoivent une clé générique au lieu
 * du message anglais par défaut de Zod.
 */
export const cleGenerique: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null
        ? "validation.generique.requis"
        : "validation.generique.type";
    case "too_small":
      return "validation.generique.tropPetit";
    case "too_big":
      return "validation.generique.tropGrand";
    case "invalid_value":
      return "validation.generique.choix";
    case "invalid_format":
      return "validation.generique.format";
    default:
      return "validation.generique.invalide";
  }
};

/** Contexte à passer en second argument de safeParse. */
export const AVEC_CLES = { error: cleGenerique } as const;

/**
 * Regroupe les issues Zod par champ (première erreur conservée) et traduit
 * les clés. Le chemin vide (superRefine global) est rangé sous "form".
 */
export function traduireIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
  traduire: Traduire
): ErreursChamps {
  const erreurs: ErreursChamps = {};
  for (const issue of issues) {
    const champ = issue.path.map(String).join(".") || "form";
    if (!(champ in erreurs)) erreurs[champ] = traduire(issue.message);
  }
  return erreurs;
}
