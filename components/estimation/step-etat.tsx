"use client";

import { useTranslations } from "next-intl";
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
  EtatGeneral,
  Exterieur,
  Stationnement,
} from "@/lib/estimation/types";

const ETATS: readonly EtatGeneral[] = ["a_renover", "a_rafraichir", "bon", "refait_neuf"];
const AGES: readonly AgeTranche[] = ["moins_5", "5_10", "10_20", "plus_20"];
const EXTERIEURS: readonly Exterieur[] = ["balcon", "terrasse", "jardin"];
const STATIONNEMENTS: readonly Stationnement[] = ["aucun", "place", "garage_box"];
// "Dernier étage" n'est plus demandé : il est déduit automatiquement de
// l'étage et du nombre d'étages de l'immeuble saisis à l'étape 2.
const ATOUTS: readonly Atout[] = ["vue_degagee", "lumineux", "calme", "traversant"];
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
  const t = useTranslations("estimation.etat");
  const tl = useTranslations("labels");
  const ages = AGES.map((value) => ({ value, label: tl(`age.${value}`) }));

  return (
    <div>
      <StepHeader title={t("titre")} subtitle={t("sousTitre")} />

      <SectionLabel>{t("etatGeneral")}</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {ETATS.map((e) => (
          <ConditionCard
            key={e}
            title={tl(`etatGeneral.${e}`)}
            sub={tl(`etatGeneralSous.${e}`)}
            selected={state.etatGeneral === e}
            onClick={() => setField("etatGeneral", e)}
          />
        ))}
      </div>
      <FieldMsg message={errors["etatGeneral"]} />

      <Section label={t("ageCuisine")} error={errors["ageCuisine"]}>
        <Segmented
          options={ages}
          value={state.ageCuisine}
          onChange={(v) => setField("ageCuisine", v)}
        />
      </Section>

      <Section label={t("ageSdb")} error={errors["ageSdb"]}>
        <Segmented
          options={ages}
          value={state.ageSdb}
          onChange={(v) => setField("ageSdb", v)}
        />
      </Section>

      <Section label={t("dpe")} error={errors["dpe"]}>
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
            label={tl("dpe.ne_sait_pas")}
            filled={false}
            selected={state.dpe === "ne_sait_pas"}
            onClick={() => setField("dpe", "ne_sait_pas")}
          />
        </div>
      </Section>

      <Section label={t("exterieur")} hint={t("plusieursChoix")}>
        <div style={chipRow}>
          {EXTERIEURS.map((e) => (
            <Pill
              key={e}
              label={tl(`exterieur.${e}`)}
              selected={state.exterieur.includes(e)}
              onClick={() =>
                setField(
                  "exterieur",
                  state.exterieur.includes(e)
                    ? state.exterieur.filter((x) => x !== e)
                    : [...state.exterieur, e]
                )
              }
            />
          ))}
        </div>
      </Section>

      <Section label={t("stationnement")} error={errors["stationnement"]}>
        <div style={chipRow}>
          {STATIONNEMENTS.map((s) => (
            <Pill
              key={s}
              label={tl(`stationnement.${s}`)}
              showMark={false}
              selected={state.stationnement === s}
              onClick={() => setField("stationnement", s)}
            />
          ))}
        </div>
      </Section>

      <Section label={t("atouts")} hint={t("optionnel")}>
        <div style={chipRow}>
          {ATOUTS.map((a) => (
            <Pill
              key={a}
              label={tl(`atouts.${a}`)}
              selected={state.atouts.includes(a)}
              onClick={() =>
                setField(
                  "atouts",
                  state.atouts.includes(a)
                    ? state.atouts.filter((x) => x !== a)
                    : [...state.atouts, a]
                )
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
