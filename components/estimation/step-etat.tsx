"use client";

import { Hammer, Paintbrush, Sparkles, ThumbsUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FieldError, OptionCard, OptionChip } from "./option-card";
import type { StepProps } from "./form-state";
import { cn } from "@/lib/utils";

const ETATS = [
  {
    value: "a_renover",
    label: "À rénover",
    description: "Gros travaux à prévoir",
    icon: Hammer,
  },
  {
    value: "a_rafraichir",
    label: "À rafraîchir",
    description: "Peintures, sols…",
    icon: Paintbrush,
  },
  {
    value: "bon",
    label: "Bon état",
    description: "Habitable en l'état",
    icon: ThumbsUp,
  },
  {
    value: "refait_neuf",
    label: "Refait à neuf",
    description: "Rénové récemment",
    icon: Sparkles,
  },
] as const;

const AGES = [
  { value: "moins_5", label: "Moins de 5 ans" },
  { value: "5_10", label: "5 – 10 ans" },
  { value: "10_20", label: "10 – 20 ans" },
  { value: "plus_20", label: "Plus de 20 ans" },
] as const;

const DPE_CLASSES: Record<string, string> = {
  A: "bg-green-600 text-white border-green-600",
  B: "bg-green-500 text-white border-green-500",
  C: "bg-lime-500 text-white border-lime-500",
  D: "bg-yellow-400 text-yellow-950 border-yellow-400",
  E: "bg-orange-400 text-white border-orange-400",
  F: "bg-orange-600 text-white border-orange-600",
  G: "bg-red-600 text-white border-red-600",
};

const ATOUTS = [
  { value: "vue_degagee", label: "Vue dégagée" },
  { value: "lumineux", label: "Lumineux" },
  { value: "calme", label: "Calme" },
  { value: "dernier_etage", label: "Dernier étage" },
  { value: "traversant", label: "Traversant" },
] as const;

export function StepEtat({ state, setField, errors }: StepProps) {
  return (
    <div className="space-y-8">
      <div>
        <Label className="text-base font-semibold">État général du bien</Label>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ETATS.map((e) => (
            <OptionCard
              key={e.value}
              icon={e.icon}
              title={e.label}
              description={e.description}
              selected={state.etatGeneral === e.value}
              onClick={() => setField("etatGeneral", e.value)}
            />
          ))}
        </div>
        <FieldError message={errors["etatGeneral"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">Âge de la cuisine</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {AGES.map((a) => (
            <OptionChip
              key={a.value}
              label={a.label}
              selected={state.ageCuisine === a.value}
              onClick={() => setField("ageCuisine", a.value)}
            />
          ))}
        </div>
        <FieldError message={errors["ageCuisine"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">Âge de la salle de bain</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {AGES.map((a) => (
            <OptionChip
              key={a.value}
              label={a.label}
              selected={state.ageSdb === a.value}
              onClick={() => setField("ageSdb", a.value)}
            />
          ))}
        </div>
        <FieldError message={errors["ageSdb"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">
          Diagnostic de performance énergétique (DPE)
        </Label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["A", "B", "C", "D", "E", "F", "G"] as const).map((lettre) => (
            <button
              key={lettre}
              type="button"
              aria-pressed={state.dpe === lettre}
              onClick={() => setField("dpe", lettre)}
              className={cn(
                "size-11 rounded-lg border-2 text-base font-bold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                state.dpe === lettre
                  ? cn(DPE_CLASSES[lettre], "scale-110 shadow-md")
                  : "border-border bg-background text-foreground hover:border-primary/50"
              )}
            >
              {lettre}
            </button>
          ))}
          <OptionChip
            label="Je ne sais pas"
            selected={state.dpe === "ne_sait_pas"}
            onClick={() => setField("dpe", "ne_sait_pas")}
          />
        </div>
        <FieldError message={errors["dpe"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">
          Les atouts de votre bien{" "}
          <span className="font-normal text-muted-foreground">(optionnel)</span>
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {ATOUTS.map((a) => (
            <OptionChip
              key={a.value}
              label={a.label}
              selected={state.atouts.includes(a.value)}
              onClick={() =>
                setField(
                  "atouts",
                  state.atouts.includes(a.value)
                    ? state.atouts.filter((x) => x !== a.value)
                    : [...state.atouts, a.value]
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
