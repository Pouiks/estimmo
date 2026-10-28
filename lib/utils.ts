import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Prix de l'immobilier à Saint-Étienne" → "prix-de-l-immobilier-a-saint-etienne" ; ligatures comme unaccent (SQL) : œ → oe */
export function slugify(texte: string): string {
  return texte
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
