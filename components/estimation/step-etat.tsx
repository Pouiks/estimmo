"use client";

import {
  ConditionCard,
  DpeChip,
  FieldMsg,
  Pill,
  SectionLabel,
  Segmented,
  StepHeader,
} from "./design";
import type { StepProps } from "./form-state";
import type {
  AgeTranche,
  Atout,
  Exterieur,
  Stationnement,
} from "@/lib/estimation/types";

const ETATS = [
  { value: "a_renover", title: "À rénover", sub: "Travaux importants" },
  { value: "a_rafraichir", title: "À rafraîchir", sub: "Habitable, à rafraîchir" },
  { value: "bon", title: "Bon état", sub: "Rien à prévoir" },
  { value: "refait_neuf", title: "Refait à neuf", sub: "Prestations récentes" },
] as const;

const AGES: readonly { value: AgeTranche; label: string }[] = [
  { value: "moins_5", label: "< 5 ans" },
  { value: "5_10", label: "5-10 ans" },
  { value: "10_20", label: "10-20 ans" },
  { value: "plus_20", label: "+ 20 ans" },
];

const EXTERIEURS: { value: Exterieur; label: string }[] = [
  { value: "balcon", label: "Balcon" },
  { value: "terrasse", label: "Terrasse" },
  { value: "jardin", label: "Jardin" },
];

const STATIONNEMENTS: { value: Stationnement; label: string }[] = [
  { value: "aucun", label: "Aucun" },
  { value: "place", label: "Place de parking" },
  { value: "garage_box", label: "Garage / box" },
];

// "Dernier étage" n'est plus demandé : il est déduit automatiquement de
// l'étage et du nombre d'étages de l'immeuble saisis à l'étape 2.
const ATOUTS: { value: Atout; label: string }[] = [
  { value: "vue_degagee", label: "Vue dégagée" },
  { value: "lumineux", label: "Lumineux" },
  { value: "calme", label: "Calme" },
  { value: "traversant", label: "Traversant" },
];

const DPE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const chipRow = { display: "flex", flexWrap: "wrap", gap: 8 } as const;

function Section({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <SectionLabel hint={hint}>{label}</SectionLabel>
      {children}
      <FieldMsg message={error} />
    </div>
  );
}

export function StepEtat({ state, setField, errors }: StepProps) {
  return (
    <div>
      <StepHeader
        title="État & atouts"
        subtitle="Ces détails ajustent la fourchette de prix."
      />

      <SectionLabel>État général</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {ETATS.map((e) => (
          <ConditionCard
            key={e.value}
            title={e.title}
            sub={e.sub}
            selected={state.etatGeneral === e.value}
            onClick={() => setField("etatGeneral", e.value)}
          />
        ))}
      </div>
      <FieldMsg message={errors["etatGeneral"]} />

      <Section label="Âge de la cuisine" error={errors["ageCuisine"]}>
        <Segmented
          options={AGES}
          value={state.ageCuisine}
          onChange={(v) => setField("ageCuisine", v)}
        />
      </Section>

      <Section label="Âge de la salle de bain" error={errors["ageSdb"]}>
        <Segmented
          options={AGES}
          value={state.ageSdb}
          onChange={(v) => setField("ageSdb", v)}
        />
      </Section>

      <Section label="Classe énergie (DPE)" error={errors["dpe"]}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DPE_LETTERS.map((l) => (
            <DpeChip
              key={l}
              label={l}
              filled
              selected={state.dpe === l}
              onClick={() => setField("dpe", l)}
            />
          ))}
          <DpeChip
            label="Je ne sais pas"
            filled={false}
            selected={state.dpe === "ne_sait_pas"}
            onClick={() => setField("dpe", "ne_sait_pas")}
          />
        </div>
      </Section>

      <Section label="Extérieur" hint="plusieurs choix possibles">
        <div style={chipRow}>
          {EXTERIEURS.map((e) => (
            <Pill
              key={e.value}
              label={e.label}
              selected={state.exterieur.includes(e.value)}
              onClick={() =>
                setField(
                  "exterieur",
                  state.exterieur.includes(e.value)
                    ? state.exterieur.filter((x) => x !== e.value)
                    : [...state.exterieur, e.value]
                )
              }
            />
          ))}
        </div>
      </Section>

      <Section label="Stationnement" error={errors["stationnement"]}>
        <div style={chipRow}>
          {STATIONNEMENTS.map((s) => (
            <Pill
              key={s.value}
              label={s.label}
              showMark={false}
              selected={state.stationnement === s.value}
              onClick={() => setField("stationnement", s.value)}
            />
          ))}
        </div>
      </Section>

      <Section label="Atouts" hint="optionnel">
        <div style={chipRow}>
          {ATOUTS.map((a) => (
            <Pill
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
      </Section>
    </div>
  );
}
