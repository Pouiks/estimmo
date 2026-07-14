"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const STEP_TITLES = [
  "Votre projet",
  "Votre bien",
  "État du bien",
  "Vos coordonnées",
];

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

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

  function validerEtape(n: number): boolean {
    let parsed:
      | { success: true }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };

    if (n === 1) {
      parsed = etape1Schema.safeParse({
        projet: state.projet ?? undefined,
        horizon: state.horizon,
        typeBien: state.typeBien ?? undefined,
        adresse: state.adresse ?? undefined,
      });
    } else if (n === 2) {
      parsed = etape2Schema(state.typeBien ?? "appartement").safeParse({
        surface: toNumber(state.surface),
        pieces: toNumber(state.pieces),
        chambres: toNumber(state.chambres),
        etage: toNumber(state.etage) ?? null,
        ascenseur: state.ascenseur,
        surfaceTerrain: toNumber(state.surfaceTerrain) ?? null,
        anneeConstruction: state.anneeConstruction ?? undefined,
        exterieur: state.exterieur,
        stationnement: state.stationnement ?? undefined,
      });
    } else if (n === 3) {
      parsed = etape3Schema.safeParse({
        etatGeneral: state.etatGeneral ?? undefined,
        ageCuisine: state.ageCuisine ?? undefined,
        ageSdb: state.ageSdb ?? undefined,
        dpe: state.dpe ?? undefined,
        atouts: state.atouts,
      });
    } else {
      parsed = etape4Schema.safeParse({
        prenom: state.prenom,
        nom: state.nom,
        email: state.email,
        telephone: state.telephone,
        consentement: state.consentement,
      });
    }

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
      ascenseur: state.typeBien === "appartement" ? state.ascenseur : null,
      surfaceTerrain:
        state.typeBien === "maison" ? toNumber(state.surfaceTerrain) ?? null : null,
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

  if (resultat) {
    return (
      <div ref={topRef}>
        <ResultatEstimation resultat={resultat} />
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <div className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold">
            Étape {step} sur 4 — {STEP_TITLES[step - 1]}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round(((step - 1) / 4) * 100)} %
          </p>
        </div>
        <Progress value={((step - 1) / 4) * 100} aria-label="Progression" />
      </div>

      <form
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

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={precedent}>
              <ArrowLeft className="size-4" /> Précédent
            </Button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <Button type="submit" size="lg">
              Continuer <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Calcul en cours…
                </>
              ) : (
                "Voir mon estimation"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
