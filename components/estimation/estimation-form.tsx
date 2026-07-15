"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  etape1Schema,
  etape2Schema,
  etape3Schema,
  etape4Schema,
} from "@/lib/leads/schema";
import {
  initialFormState,
  toNumber,
  type EstimationFormState,
  type FieldErrors,
} from "./form-state";
import { StepProjet } from "./step-projet";
import { StepBien } from "./step-bien";
import { StepEtat } from "./step-etat";
import { StepContact } from "./step-contact";
import { ResultatEstimation, type ResultatApi } from "./resultat";
import { C } from "./design";

const STEP_NAMES = ["Votre projet", "Le bien", "État & atouts", "Vos coordonnées"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

type ParseResult =
  | { success: true }
  | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };

function track(sessionId: string | null, step: number, event: string) {
  if (!sessionId) return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, step, event }),
      keepalive: true,
    });
  } catch {
    // le tracking ne bloque jamais le parcours
  }
}

export function EstimationForm() {
  const [state, setState] = useState<EstimationFormState>(initialFormState);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultat, setResultat] = useState<ResultatApi | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const utmRef = useRef<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionIdRef.current) return;
    sessionIdRef.current = crypto.randomUUID();
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utmRef.current[key.replace("utm_", "")] = value;
    }
    track(sessionIdRef.current, 1, "view");
  }, []);

  const setField = useCallback(
    <K extends keyof EstimationFormState>(
      key: K,
      value: EstimationFormState[K]
    ) => {
      setState((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  function parseEtape(n: number, s: EstimationFormState): ParseResult {
    if (n === 1) {
      return etape1Schema.safeParse({
        projet: s.projet ?? undefined,
        horizon: s.horizon,
        typeBien: s.typeBien ?? undefined,
        adresse: s.adresse ?? undefined,
      });
    }
    if (n === 2) {
      return etape2Schema(s.typeBien ?? "appartement").safeParse({
        surface: toNumber(s.surface),
        pieces: toNumber(s.pieces),
        chambres: toNumber(s.chambres),
        etage: toNumber(s.etage) ?? null,
        etagesImmeuble: toNumber(s.etagesImmeuble) ?? null,
        ascenseur: s.ascenseur,
        surfaceTerrain: null,
        anneeConstruction: s.anneeConstruction ?? undefined,
      });
    }
    if (n === 3) {
      return etape3Schema.safeParse({
        etatGeneral: s.etatGeneral ?? undefined,
        exterieur: s.exterieur,
        stationnement: s.stationnement ?? undefined,
        ageCuisine: s.ageCuisine ?? undefined,
        ageSdb: s.ageSdb ?? undefined,
        dpe: s.dpe ?? undefined,
        atouts: s.atouts,
      });
    }
    return etape4Schema.safeParse({
      prenom: s.prenom,
      nom: s.nom,
      email: s.email,
      telephone: s.telephone,
      consentement: s.consentement,
    });
  }

  function validerEtape(n: number): boolean {
    const parsed = parseEtape(n, state);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const map: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!(key in map)) map[key] = issue.message;
    }
    setErrors(map);
    return false;
  }

  function suivant() {
    if (!validerEtape(step)) return;
    track(sessionIdRef.current, step, "complete");
    setStep((s) => s + 1);
    track(sessionIdRef.current, step + 1, "view");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function precedent() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  async function soumettre() {
    if (!validerEtape(4)) return;
    setSubmitting(true);

    const payload = {
      projet: state.projet,
      horizon: state.projet === "vente" ? state.horizon : null,
      typeBien: state.typeBien,
      adresse: state.adresse,
      surface: toNumber(state.surface),
      pieces: toNumber(state.pieces),
      chambres: toNumber(state.chambres),
      etage: state.typeBien === "appartement" ? toNumber(state.etage) ?? null : null,
      etagesImmeuble:
        state.typeBien === "appartement"
          ? toNumber(state.etagesImmeuble) ?? null
          : null,
      ascenseur: state.typeBien === "appartement" ? state.ascenseur : null,
      surfaceTerrain: null,
      anneeConstruction: state.anneeConstruction,
      exterieur: state.exterieur,
      stationnement: state.stationnement,
      etatGeneral: state.etatGeneral,
      ageCuisine: state.ageCuisine,
      ageSdb: state.ageSdb,
      dpe: state.dpe,
      atouts: state.atouts,
      prenom: state.prenom,
      nom: state.nom,
      email: state.email,
      telephone: state.telephone,
      consentement: state.consentement,
      sessionId: sessionIdRef.current ?? undefined,
      utm: utmRef.current,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          details?: { champ: string; message: string }[];
        } | null;
        if (res.status === 400 && data?.details) {
          const map: FieldErrors = {};
          for (const d of data.details) map[d.champ] = d.message;
          setErrors(map);
          toast.error("Certaines informations sont invalides.");
        } else {
          toast.error("Une erreur est survenue, merci de réessayer.");
        }
        return;
      }

      const data = (await res.json()) as ResultatApi;
      track(sessionIdRef.current, 4, "submit");
      setResultat(data);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      toast.error("Connexion impossible, vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const isResult = resultat !== null;
  const peutAvancer = isResult || parseEtape(step, state).success;
  const stepLabel = isResult
    ? "Estimation"
    : `Étape ${step} sur 4 · ${STEP_NAMES[step - 1]}`;
  const progressWidth = isResult ? "100%" : `${(step / 4) * 100}%`;

  return (
    <div ref={topRef}>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 26,
          boxShadow:
            "0 26px 60px -28px rgba(12,31,28,.34),0 2px 6px rgba(12,31,28,.04)",
          overflow: "hidden",
        }}
      >
        {/* Progression */}
        <div style={{ padding: "22px 30px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: ".04em",
                color: C.muted,
                textTransform: "uppercase",
              }}
            >
              {stepLabel}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.accent }}>
              {progressWidth}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 99,
              background: "#EAEFEC",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                background: `linear-gradient(90deg,${C.accent},${C.accentLight})`,
                width: progressWidth,
                transition: "width .55s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
        </div>

        {/* Contenu */}
        <div style={{ padding: "26px 30px 30px", minHeight: 360 }}>
          {isResult ? (
            <ResultatEstimation
              resultat={resultat}
              state={state}
              onRestart={() => {
                setResultat(null);
                setState(initialFormState);
                setStep(1);
                setErrors({});
                topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ) : (
            <form
              className="dcx-step"
              key={step}
              onSubmit={(e) => {
                e.preventDefault();
                if (step < 4) suivant();
                else void soumettre();
              }}
              noValidate
            >
              {step === 1 && (
                <StepProjet state={state} setField={setField} errors={errors} />
              )}
              {step === 2 && (
                <StepBien state={state} setField={setField} errors={errors} />
              )}
              {step === 3 && (
                <StepEtat state={state} setField={setField} errors={errors} />
              )}
              {step === 4 && (
                <StepContact state={state} setField={setField} errors={errors} />
              )}
            </form>
          )}
        </div>

        {/* Navigation */}
        {!isResult && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 30px",
              borderTop: "1px solid #F0F3F1",
              background: "#FCFDFC",
            }}
          >
            {step > 1 && (
              <button
                type="button"
                onClick={precedent}
                style={{
                  padding: "14px 20px",
                  borderRadius: 13,
                  border: `1.5px solid ${C.border}`,
                  background: "#fff",
                  color: C.label,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  font: "inherit",
                }}
              >
                <ArrowLeft size={16} strokeWidth={2.4} />
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={() => (step < 4 ? suivant() : void soumettre())}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "15px 22px",
                borderRadius: 13,
                border: "none",
                background: C.accent,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15.5,
                // Toujours cliquable : un clic sur le bouton grisé affiche
                // les messages d'erreur sous les champs concernés.
                cursor: submitting ? "wait" : "pointer",
                opacity: peutAvancer && !submitting ? 1 : 0.55,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: `0 8px 20px -8px ${C.accent}`,
                transition: "opacity .18s",
                font: "inherit",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Calcul en cours…
                </>
              ) : (
                <>
                  {step === 4 ? "Voir mon estimation" : "Continuer"}
                  <ArrowRight size={17} strokeWidth={2.4} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
