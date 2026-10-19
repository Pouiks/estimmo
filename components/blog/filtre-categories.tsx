"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Filtre de la page /blog. Toutes les cartes sont rendues côté serveur (liens
 * crawlables, page statique) ; le filtre ne fait que les masquer. Sans
 * JavaScript, tout reste visible.
 */
export function FiltreCategories({
  categories,
  cartes,
  libelleGroupe,
  libelleVide,
}: {
  /** [valeur, libellé] ; la première entrée (valeur "") = tous les articles. */
  categories: [string, string][];
  cartes: { categorie: string | null; slug: string; carte: ReactNode }[];
  libelleGroupe: string;
  libelleVide: string;
}) {
  const [active, setActive] = useState("");
  const visibles = cartes.filter((c) => !active || c.categorie === active);

  return (
    <>
      <div role="group" aria-label={libelleGroupe} className="mt-8 flex flex-wrap gap-2">
        {categories.map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            aria-pressed={active === valeur}
            onClick={() => setActive(valeur)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              active === valeur
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-primary hover:text-primary"
            )}
          >
            {libelle}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map((c) => (
          <div key={c.slug} className={cn(!visibles.includes(c) && "hidden")}>
            {c.carte}
          </div>
        ))}
      </div>
      {visibles.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {libelleVide}
        </p>
      )}
    </>
  );
}
