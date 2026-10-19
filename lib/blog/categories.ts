/** Catégories éditoriales du blog (libellés : messages/<locale>/blog.json). */
export const CATEGORIES = ["estimation", "vente", "achat-fiscalite"] as const;

export type Categorie = (typeof CATEGORIES)[number];

export function estCategorie(valeur: unknown): valeur is Categorie {
  return CATEGORIES.includes(valeur as Categorie);
}
