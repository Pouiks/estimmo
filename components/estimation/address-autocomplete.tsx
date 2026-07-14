"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Adresse } from "@/lib/leads/schema";
import { cn } from "@/lib/utils";

interface Suggestion {
  label: string;
  codeInsee: string;
  codePostal: string;
  ville: string;
  lat: number;
  lon: number;
}

/**
 * Autocomplétion d'adresse via /api/geocode (proxy Géoplateforme IGN),
 * debounce 300 ms, annulation des requêtes obsolètes.
 */
export function AddressAutocomplete({
  value,
  onChange,
}: {
  value: Adresse | null;
  onChange: (adresse: Adresse | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(
      async () => {
        if (q.length < 3) {
          abortRef.current?.abort();
          setSuggestions([]);
          setOpen(false);
          setLoading(false);
          return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          const data = (await res.json()) as { suggestions?: Suggestion[] };
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        } catch {
          // requête annulée ou réseau : on n'affiche rien
        } finally {
          setLoading(false);
        }
      },
      q.length < 3 ? 0 : 300
    );

    return () => clearTimeout(timer);
  }, [query]);

  // Fermeture au clic extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="size-4 shrink-0 text-primary" />
          {value.libelle}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          aria-label="Modifier l'adresse"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="12 rue de la République, Nice"
          autoComplete="off"
          inputMode="text"
          aria-label="Adresse du bien"
          className="h-11 pr-9"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm",
                  "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                )}
                onClick={() => {
                  onChange({
                    libelle: s.label,
                    codeInsee: s.codeInsee,
                    codePostal: s.codePostal,
                    lat: s.lat,
                    lon: s.lon,
                  });
                  setOpen(false);
                }}
              >
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && suggestions.length === 0 && query.length >= 3 && (
        <p className="absolute z-20 mt-1 w-full rounded-xl border bg-popover px-4 py-2.5 text-sm text-muted-foreground shadow-lg">
          Aucune adresse trouvée — précisez le numéro et la ville.
        </p>
      )}
    </div>
  );
}
