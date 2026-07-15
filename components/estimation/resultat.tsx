"use client";

import { PhoneCall, RotateCcw } from "lucide-react";
import type {
  EstimationLocation,
  EstimationVente,
} from "@/lib/estimation/types";
import type { EstimationFormState } from "./form-state";
import { C } from "./design";
import { QuartierBlock } from "./quartier-block";
import { MENTIONS, SITE } from "@/lib/config";

export type ResultatApi = {
  leadId: string;
  manuelle: boolean;
  estimation: EstimationVente | EstimationLocation | null;
};

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const initiales = SITE.agent.name
  .split(/\s+/)
  .map((w) => w[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

function Badge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 14px",
        borderRadius: 99,
        background: "#E8F1FB",
        color: C.accent,
        fontSize: 12.5,
        fontWeight: 700,
        marginBottom: 18,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: C.accent,
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
}

function CarenzaCard({ vente }: { vente: boolean }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: `linear-gradient(135deg,${C.accent},${C.accentDark})`,
        color: "#fff",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 99,
            background: "rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontWeight: 800,
          }}
        >
          {initiales}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Affinez votre prix avec {SITE.agent.name}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Un rappel pour un avis de valeur précis, sans engagement.
          </div>
        </div>
      </div>
      {vente && (
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 12 }}>
          Honoraires {SITE.honoraires.exclusif} en mandat exclusif contre{" "}
          {SITE.honoraires.simple} en mandat simple.
        </div>
      )}
      <a
        href={SITE.agent.phoneHref}
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 18px",
          borderRadius: 12,
          background: "#fff",
          color: C.accent,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
        }}
      >
        <PhoneCall size={16} /> Être rappelé(e) — {SITE.agent.phone}
      </a>
    </div>
  );
}

function RestartLink({ onRestart }: { onRestart?: () => void }) {
  return (
    <button
      type="button"
      onClick={onRestart}
      style={{
        marginTop: 16,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        color: C.faint,
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "underline",
        font: "inherit",
      }}
    >
      <RotateCcw size={13} /> Refaire une estimation
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: C.cardBg,
        border: `1px solid ${C.borderSoft}`,
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: C.faint,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{value}</div>
    </div>
  );
}

export function ResultatEstimation({
  resultat,
  state,
  onRestart,
}: {
  resultat: ResultatApi;
  state: EstimationFormState;
  onRestart?: () => void;
}) {
  const est = resultat.estimation;

  // --- Analyse manuelle (zone non couverte / trop peu de comparables) ---
  if (resultat.manuelle || est === null) {
    return (
      <div className="dcx-step" style={{ textAlign: "center", paddingTop: 6 }}>
        <Badge label="Analyse personnalisée" />
        <div
          className="dcx-serif"
          style={{
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1.15,
            margin: "0 0 8px",
            color: C.ink,
          }}
        >
          Estimation offerte sous 24&nbsp;h
        </div>
        <p
          style={{
            margin: "0 auto 22px",
            maxWidth: 440,
            color: C.muted,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Votre secteur mérite une analyse sur mesure. {SITE.agent.name} réalise
          votre estimation et vous rappelle au numéro indiqué. Un email de
          confirmation vient de vous être envoyé.
        </p>
        <QuartierBlock adresse={state.adresse} />
        <CarenzaCard vente />
        <br />
        <RestartLink onRestart={onRestart} />
      </div>
    );
  }

  const vente = est.projet === "vente";
  const low = vente ? est.fourchetteBasse : est.loyerBas;
  const high = vente ? est.fourchetteHaute : est.loyerHaut;
  const perM2 = vente ? est.prixM2Zone : est.loyerM2Zone;
  const confidence = vente
    ? est.confiance === "haute"
      ? "Élevée"
      : est.confiance === "moyenne"
        ? "Correcte"
        : "Indicative"
    : "Indicative";

  return (
    <div className="dcx-step" style={{ textAlign: "center", paddingTop: 6 }}>
      <Badge label="Estimation prête" />
      <p style={{ margin: "0 0 6px", color: C.muted, fontSize: 15 }}>
        {vente
          ? "Votre bien est estimé entre"
          : "Votre bien pourrait se louer entre"}
      </p>
      <div
        className="dcx-serif"
        style={{
          fontWeight: 400,
          fontSize: 46,
          lineHeight: 1.05,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
          color: C.ink,
        }}
      >
        {euro(low)} <span style={{ color: "#B7C2BE", fontSize: 30 }}>–</span>{" "}
        {euro(high)}
      </div>
      <p style={{ margin: "0 0 22px", color: C.faint, fontSize: 14 }}>
        soit environ{" "}
        <b style={{ color: C.label }}>
          {perM2.toLocaleString("fr-FR")} €
        </b>{" "}
        {vente ? "/ m²" : "/ m² / mois"}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 22,
          textAlign: "left",
        }}
      >
        <StatCard label="Surface" value={`${state.surface || "?"} m²`} />
        <StatCard label="Confiance" value={confidence} />
        <StatCard label="Source" value={vente ? "DVF" : "ANIL"} />
      </div>

      <QuartierBlock adresse={state.adresse} />

      <CarenzaCard vente={vente} />

      <p style={{ margin: "14px 0 0", fontSize: 11.5, color: C.faint2 }}>
        {vente
          ? `Basé sur ${est.nbComparables} ventes comparables. ${MENTIONS.dvf}.`
          : `${MENTIONS.anil}.`}
      </p>

      <RestartLink onRestart={onRestart} />
    </div>
  );
}
