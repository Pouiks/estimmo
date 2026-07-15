"use client";

import { useEffect, useState } from "react";
import { Bus, GraduationCap, ShoppingBag, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Adresse } from "@/lib/leads/schema";
import { C } from "./design";

interface QuartierStats {
  ecoles: number;
  transports: number;
  commerces: number;
  parcs: number;
}

/**
 * Bloc "Votre quartier" : équipements autour de l'adresse estimée
 * (OpenStreetMap). Chargé après l'affichage du résultat, jamais bloquant :
 * si l'API échoue ou que tout est à zéro, le bloc ne s'affiche pas.
 */
export function QuartierBlock({ adresse }: { adresse: Adresse | null }) {
  const [stats, setStats] = useState<QuartierStats | null>(null);

  useEffect(() => {
    if (!adresse) return;
    const controller = new AbortController();
    fetch(`/api/quartier?lat=${adresse.lat}&lon=${adresse.lon}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stats?: QuartierStats | null } | null) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {
        // dégradation silencieuse
      });
    return () => controller.abort();
  }, [adresse]);

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
