import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/lib/config";
import { DEFAULT_LOCALE, estLocale } from "@/lib/i18n/routing";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Image de partage 1200×630 (OpenGraph : Facebook, LinkedIn, WhatsApp,
 * Discord, Slack… ; carte Twitter) : marque, titre de la page, sous-titre.
 * URL construite par `imageOgPour` (lib/i18n/seo.ts) : /og.png?t=…&s=…&l=fr
 * Le chemin porte un point : hors du proxy i18n, comme /sitemap.xml.
 * Le texte est rendu en JSX (jamais interprété comme HTML) et tronqué.
 * Cache CDN un an : l'URL change avec le texte.
 */

const BLEU = "#2E90E5";

function tronquer(texte: string, max: number): string {
  const t = texte.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { scope: "og", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const p = request.nextUrl.searchParams;
  const l = p.get("l");
  const locale = estLocale(l) ? l : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "common" });

  const titre = tronquer(p.get("t") ?? "", 110) || `${SITE.name} - ${t("baseline")}`;
  const sousTitre = tronquer(p.get("s") ?? "", 150) || t("baseline");
  const hote = new URL(SITE.url).host;
  const tailleTitre = titre.length > 80 ? 44 : titre.length > 50 ? 52 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px 56px 88px",
          background: "#ffffff",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 20,
            height: 630,
            background: BLEU,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          <span>ESTI</span>
          <span style={{ color: BLEU }}>MMO</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: tailleTitre,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            {titre}
          </div>
          <div style={{ fontSize: 28, color: "#475569", lineHeight: 1.35 }}>
            {sousTitre}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#64748b",
          }}
        >
          <span>{hote}</span>
          <div
            style={{
              display: "flex",
              width: 220,
              height: 10,
              borderRadius: 999,
              background: BLEU,
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    }
  );
}
