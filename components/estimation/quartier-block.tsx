"use client";

import { useEffect, useRef, useState } from "react";
import { Bus, GraduationCap, ShoppingBag, Sparkles, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Adresse } from "@/lib/leads/schema";
import { C } from "./design";

export interface QuartierStats {
  ecoles: number;
  transports: number;
  commerces: number;
  parcs: number;
}

/**
 * Stats de quartier autour d'une adresse (OpenStreetMap via /api/quartier).
 * Jamais bloquant : en cas d'échec après 2 tentatives, stats reste null et
 * l'UI n'affiche rien. Monter avec key={adresse.libelle} pour réinitialiser
 * quand l'adresse change.
 */
function useQuartierStats(
  adresse: Adresse | null,
  onLoaded?: (stats: QuartierStats) => void
) {
  const [stats, setStats] = useState<QuartierStats | null>(null);
  const [done, setDone] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    if (!adresse) return;
    let alive = true;
    const controller = new AbortController();

    async function charger(tentative: number) {
      try {
        const res = await fetch(
          `/api/quartier?lat=${adresse!.lat}&lon=${adresse!.lon}`,
          { signal: controller.signal }
        );
        const data = res.ok
          ? ((await res.json()) as { stats?: QuartierStats | null })
          : null;
        if (!alive) return;
        if (data?.stats) {
          setStats(data.stats);
          setDone(true);
          onLoadedRef.current?.(data.stats);
          return;
        }
      } catch {
        // annulé ou réseau : on retente ou on abandonne ci-dessous
      }
      if (!alive) return;
      if (tentative < 1) {
        // Overpass répond souvent au second essai une fois sa zone chargée
        setTimeout(() => {
          if (alive) void charger(tentative + 1);
        }, 1_500);
      } else {
        setDone(true);
      }
    }

    void charger(0);
    return () => {
      alive = false;
      controller.abort();
    };
  }, [adresse]);

  return { stats, loading: adresse !== null && !done };
}

function libelles(stats: QuartierStats): string[] {
  const parts: string[] = [];
  if (stats.ecoles > 0)
    parts.push(`${stats.ecoles} école${stats.ecoles > 1 ? "s" : ""}`);
  if (stats.transports > 0)
    parts.push(`${stats.transports} transport${stats.transports > 1 ? "s" : ""}`);
  if (stats.commerces > 0)
    parts.push(`${stats.commerces} commerce${stats.commerces > 1 ? "s" : ""}`);
  if (stats.parcs > 0)
    parts.push(`${stats.parcs} espace${stats.parcs > 1 ? "s" : ""} vert${stats.parcs > 1 ? "s" : ""}`);
  return parts;
}

/**
 * Bandelette compacte affichée à l'étape 1 dès la sélection de l'adresse :
 * l'analyse du quartier démarre immédiatement, l'utilisateur le voit.
 */
export function QuartierStrip({
  adresse,
  onLoaded,
}: {
  adresse: Adresse | null;
  /** Persiste les stats dans l'état du formulaire pour l'écran résultat. */
  onLoaded?: (stats: QuartierStats) => void;
}) {
  const { stats, loading } = useQuartierStats(adresse, onLoaded);

  if (!adresse) return null;

  const parts = stats ? libelles(stats) : [];
  if (!loading && parts.length === 0) return null;

  return (
    <div
      className="dcx-step"
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        background: C.sel,
        border: `1px solid #BBD9F5`,
        fontSize: 13,
        color: C.accentDark,
        lineHeight: 1.5,
      }}
    >
      <Sparkles
        size={15}
        className={loading ? "animate-pulse" : undefined}
        style={{ color: C.accent, flexShrink: 0, marginTop: 2 }}
      />
      {loading ? (
        <span className="animate-pulse">Analyse de votre quartier en cours…</span>
      ) : (
        <span>
          <strong>Quartier analysé :</strong> {parts.join(" · ")} à proximité.
          Détail complet avec votre estimation.
        </span>
      )}
    </div>
  );
}

/**
 * Bloc "Votre quartier" de l'écran résultat : tuiles détaillées.
 */
export function QuartierBlock({
  adresse,
  statsInitiales,
}: {
  adresse: Adresse | null;
  /** Stats déjà chargées à l'étape 1 : pas de refetch, affichage garanti. */
  statsInitiales?: QuartierStats | null;
}) {
  const fetched = useQuartierStats(statsInitiales ? null : adresse);
  const stats = statsInitiales ?? fetched.stats;

  if (!stats) return null;

  const tiles: { icon: LucideIcon; value: number; label: string; sub: string }[] = [
    {
      icon: GraduationCap,
      value: stats.ecoles,
      label: stats.ecoles > 1 ? "écoles" : "école",
      sub: "à moins de 500 m",
    },
    {
      icon: Bus,
      value: stats.transports,
      label: stats.transports > 1 ? "transports" : "transport",
      sub: "bus, gare ou tram",
    },
    {
      icon: ShoppingBag,
      value: stats.commerces,
      label: stats.commerces > 1 ? "commerces" : "commerce",
      sub: "à moins de 500 m",
    },
    {
      icon: Trees,
      value: stats.parcs,
      label: stats.parcs > 1 ? "espaces verts" : "espace vert",
      sub: "parcs et jardins",
    },
  ].filter((t) => t.value > 0);

  if (tiles.length === 0) return null;

  return (
    <div className="dcx-step" style={{ marginBottom: 22, textAlign: "left" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.label,
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        Votre quartier
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)}, 1fr)`,
          gap: 10,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              padding: 14,
              borderRadius: 14,
              background: C.cardBg,
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            <t.icon size={16} style={{ color: C.accent }} />
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: C.ink,
                marginTop: 6,
              }}
            >
              {t.value.toLocaleString("fr-FR")} {t.label}
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
              {t.sub}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 2px 0", fontSize: 11, color: C.faint2 }}>
        Équipements recensés autour de votre adresse · source OpenStreetMap.
      </p>
    </div>
  );
}
