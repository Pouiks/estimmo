"use client";

import {
  ConditionCard,
  DpeChip,
  FieldMsg,
  Pill,
  SectionLabel,
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

const AGES: { value: AgeTranche; label: string }[] = [
  { value: "moins_5", label: "< 5 ans" },
  { value: "5_10", label: "5-10 ans" },
  { value: "10_20", label: "10-20 ans" },
  { value: "plus_20", label: "20 ans +" },
];

const EXTERIEURS: { value: Exterieur; label: string }[] = [
  { value: "balcon", label: "Balcon" },
  { value: "terrasse", label: "Terrasse" },
  { value: "jardin", label: "Jardin" },
];

const STATIONNEMENTS: { value: Stationnement; label: string }[] = [
  { value: "aucun", label: "Aucun" },
  { value: "place", label: "Place" },
  { value: "garage_box", label: "Garage / box" },
];

const ATOUTS: { value: Atout; label: string }[] = [
  { value: "vue_degagee", label: "Vue dégagée" },
  { value: "lumineux", label: "Lumineux" },
  { value: "calme", label: "Calme" },
  { value: "dernier_etage", label: "Dernier étage" },
  { value: "traversant", label: "Traversant" },
];

const DPE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const chipRow = { display: "flex", flexWrap: "wrap", gap: 8 } as const;

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
          marginBottom: 22,
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

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Classe énergie (DPE)</SectionLabel>
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
        <FieldMsg message={errors["dpe"]} />
      </div>

      <div style={{ marginTop: 22, display: "grid", gap: 22, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <SectionLabel>Âge cuisine</SectionLabel>
          <div style={chipRow}>
            {AGES.map((a) => (
              <Pill
                key={a.value}
                label={a.label}
                showMark={false}
                selected={state.ageCuisine === a.value}
                onClick={() => setField("ageCuisine", a.value)}
              />
            ))}
          </div>
          <FieldMsg message={errors["ageCuisine"]} />
        </div>
        <div>
          <SectionLabel>Âge salle de bain</SectionLabel>
          <div style={chipRow}>
            {AGES.map((a) => (
              <Pill
                key={a.value}
                label={a.label}
                showMark={false}
                selected={state.ageSdb === a.value}
                onClick={() => setField("ageSdb", a.value)}
              />
            ))}
          </div>
          <FieldMsg message={errors["ageSdb"]} />
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Extérieur</SectionLabel>
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
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Stationnement</SectionLabel>
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
        <FieldMsg message={errors["stationnement"]} />
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionLabel hint="optionnel">Atouts</SectionLabel>
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
      </div>
    </div>
  );
}
