"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { RECHERCHE_MIN } from "@/lib/seo/recherche";
import { cn } from "@/lib/utils";

/** Réponse de /api/communes. */
export interface CommuneTrouvee {
  slug: string;
  nom: string;
  codePostal: string | null;
  departement: string;
}

export interface LibellesRecherche {
  label: string;
  placeholder: string;
  aucun: string;
}

interface Props {
  /** Textes traduits côté serveur (le site n'embarque pas ses messages). */
  libelles: LibellesRecherche;
  /** Restreint la recherche à un département (code : « 06 », « 2A »). */
  departement?: string;
  className?: string;
}

/**
 * Champ de recherche de commune (nom ou code postal) : propose jusqu'à huit
 * pages /prix-immobilier/<slug>. Debounce 250 ms, annulation des requêtes
 * obsolètes, navigation clavier (flèches, Entrée, Échap).
 */
export function RechercheCommune({ libelles, departement, className }: Props) {
  const router = useRouter();
  const id = useId();
  const [saisie, setSaisie] = useState("");
  const [resultats, setResultats] = useState<CommuneTrouvee[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [actif, setActif] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valeur = e.target.value;
    setSaisie(valeur);
    if (valeur.trim().length < RECHERCHE_MIN) {
      abortRef.current?.abort();
      setResultats([]);
      setOuvert(false);
      setChargement(false);
    }
  }

  // Recherche différée de 250 ms après la dernière frappe.
  useEffect(() => {
    const q = saisie.trim();
    if (q.length < RECHERCHE_MIN) return;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setChargement(true);
      try {
        const params = new URLSearchParams({ q });
        if (departement) params.set("dept", departement);
        const res = await fetch(`/api/communes?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { communes?: CommuneTrouvee[] };
        setResultats(data.communes ?? []);
        setActif(-1);
        setOuvert(true);
      } catch {
        // requête annulée ou réseau : on garde l'état courant
      } finally {
        if (!controller.signal.aborted) setChargement(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [saisie, departement]);

  // Fermeture au clic en dehors du champ et de la liste.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOuvert(false);
      return;
    }
    if (!ouvert || resultats.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => (i + 1) % resultats.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => (i <= 0 ? resultats.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      const commune = resultats[actif] ?? resultats[0];
      if (commune) {
        e.preventDefault();
        setOuvert(false);
        router.push(`/prix-immobilier/${commune.slug}`);
      }
    }
  }

  const listeId = `${id}-liste`;

  return (
    <div ref={conteneurRef} className={cn("relative", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {libelles.label}
      </label>
      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={saisie}
          onChange={onChange}
          onFocus={() => resultats.length > 0 && setOuvert(true)}
          onKeyDown={onKeyDown}
          placeholder={libelles.placeholder}
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={actif >= 0 ? `${id}-option-${actif}` : undefined}
          className="h-11 bg-background pr-9 pl-9 text-base"
        />
        {chargement && (
          <Loader2
            aria-hidden="true"
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {ouvert && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {libelles.aucun}
            </li>
          ) : (
            resultats.map((commune, i) => (
              <li
                key={commune.slug}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === actif}
              >
                <Link
                  href={`/prix-immobilier/${commune.slug}`}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => setOuvert(false)}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    i === actif && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="font-medium">
                    {commune.nom}
                    {commune.codePostal && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({commune.codePostal})
                      </span>
                    )}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {commune.departement}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
