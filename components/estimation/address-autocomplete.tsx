"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import type { Adresse } from "@/lib/leads/schema";
import { C } from "./design";

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "13px 16px",
          borderRadius: 14,
          border: `2px solid ${C.accent}`,
          background: C.sel,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14.5,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          <MapPin size={16} style={{ flexShrink: 0, color: C.accent }} />
          {value.libelle}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          aria-label="Modifier l'adresse"
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: C.muted,
            padding: 2,
            display: "flex",
          }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: 15,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.accent,
          pointerEvents: "none",
        }}
      >
        <MapPin size={18} />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="12 rue des Lilas, 75011 Paris"
        autoComplete="off"
        inputMode="text"
        aria-label="Adresse du bien"
        style={{
          width: "100%",
          padding: "15px 44px 15px 44px",
          borderRadius: 14,
          border: `1.5px solid ${C.border}`,
          fontSize: 15,
          background: C.inputBg,
          color: C.ink,
          transition: "border-color .15s",
        }}
      />
      {loading && (
        <Loader2
          size={16}
          className="animate-spin"
          style={{
            position: "absolute",
            right: 15,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.faint,
          }}
        />
      )}

      {open && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 20,
            marginTop: 6,
            width: "100%",
            listStyle: "none",
            padding: 6,
            overflow: "hidden",
            borderRadius: 14,
            border: `1px solid ${C.borderSoft}`,
            background: "#fff",
            boxShadow: "0 16px 40px -18px rgba(12,31,28,.3)",
          }}
        >
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: 14,
                  color: C.ink,
                  cursor: "pointer",
                  font: "inherit",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = C.cardBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
                onClick={() => {
                  onChange({
                    libelle: s.label,
                    codeInsee: s.codeInsee,
                    codePostal: s.codePostal,
                    lat: s.lat,
                    lon: s.lon,
                  });
                  setOpen(false);
                  // Préchauffe le cache quartier pendant que l'utilisateur
                  // remplit le formulaire : l'écran résultat l'aura tout prêt.
                  try {
                    void fetch(`/api/quartier?lat=${s.lat}&lon=${s.lon}`);
                  } catch {
                    // best-effort uniquement
                  }
                }}
              >
                <MapPin size={16} style={{ flexShrink: 0, color: C.faint }} />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && suggestions.length === 0 && query.length >= 3 && (
        <p
          style={{
            position: "absolute",
            zIndex: 20,
            marginTop: 6,
            width: "100%",
            borderRadius: 14,
            border: `1px solid ${C.borderSoft}`,
            background: "#fff",
            padding: "12px 14px",
            fontSize: 14,
            color: C.muted,
            boxShadow: "0 16px 40px -18px rgba(12,31,28,.3)",
          }}
        >
          Aucune adresse trouvée - précisez le numéro et la ville.
        </p>
      )}
    </div>
  );
}
