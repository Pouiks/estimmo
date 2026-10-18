"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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

type CleQuartier = keyof QuartierStats;

const EQUIPEMENTS: readonly { cle: CleQuartier; icon: LucideIcon }[] = [
  { cle: "ecoles", icon: GraduationCap },
  { cle: "transports", icon: Bus },
  { cle: "commerces", icon: ShoppingBag },
  { cle: "parcs", icon: Trees },
];

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
  const t = useTranslations("quartier");
  const { stats, loading } = useQuartierStats(adresse, onLoaded);

  if (!adresse) return null;

  // "3 écoles · 2 transports" : pluriels gérés par les messages ICU.
  const parts = stats
    ? EQUIPEMENTS.filter((e) => stats[e.cle] > 0).map((e) =>
        t(e.cle, { n: stats[e.cle] })
      )
    : [];
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
        <span className="animate-pulse">{t("analyse")}</span>
      ) : (
        <span>
          {t.rich("analyseFait", {
            liste: parts.join(t("separateur")),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
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
  const t = useTranslations("quartier");
  const fetched = useQuartierStats(statsInitiales ? null : adresse);
  const stats = statsInitiales ?? fetched.stats;

  if (!stats) return null;

  const tiles = EQUIPEMENTS.filter((e) => stats[e.cle] > 0);
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
        {t("titre")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)}, 1fr)`,
          gap: 10,
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.cle}
            style={{
              padding: 14,
              borderRadius: 14,
              background: C.cardBg,
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            <tile.icon size={16} style={{ color: C.accent }} />
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: C.ink,
                marginTop: 6,
              }}
            >
              {t(tile.cle, { n: stats[tile.cle] })}
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
              {t(`sous.${tile.cle}`)}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 2px 0", fontSize: 11, color: C.faint2 }}>
        {t("source")}
      </p>
    </div>
  );
}
