"use client";

import { useTranslations } from "next-intl";
import {
  C,
  FieldMsg,
  SectionLabel,
  StepHeader,
  Stepper,
  TextField,
  Toggle,
} from "./design";
import { toNumber, type StepProps } from "./form-state";

export function StepBien({ state, setField, errors }: StepProps) {
  const t = useTranslations("estimation.bien");
  const tl = useTranslations("labels");
  const isAppartement = state.typeBien === "appartement";
  const typeBien = tl(`typeBienMinuscule.${isAppartement ? "appartement" : "maison"}`);

  const pieces = toNumber(state.pieces) ?? 0;
  const chambres = toNumber(state.chambres) ?? 0;

  return (
    <div>
      <StepHeader title={t("titre")} subtitle={t("sousTitre", { typeBien })} />

      <SectionLabel hint={isAppartement ? t("hintCarrez") : undefined}>
        {isAppartement ? t("surfaceCarrez") : t("surfaceHabitable")}
      </SectionLabel>
      <TextField
        type="number"
        inputMode="numeric"
        min={8}
        placeholder="65"
        value={state.surface}
        onChange={(e) => setField("surface", e.target.value)}
        suffix="m²"
        style={{ fontSize: 19, fontWeight: 700 }}
      />
      <FieldMsg message={errors["surface"]} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 22,
        }}
      >
        <div>
          <SectionLabel>{t("pieces")}</SectionLabel>
          <Stepper
            value={String(pieces || 1)}
            onDec={() => setField("pieces", String(Math.max((pieces || 1) - 1, 1)))}
            onInc={() => setField("pieces", String(Math.min((pieces || 1) + 1, 20)))}
            labelDec={t("diminuer")}
            labelInc={t("augmenter")}
          />
        </div>
        <div>
          <SectionLabel>{t("chambres")}</SectionLabel>
          <Stepper
            value={String(chambres)}
            onDec={() => setField("chambres", String(Math.max(chambres - 1, 0)))}
            onInc={() => setField("chambres", String(Math.min(chambres + 1, 15)))}
            labelDec={t("diminuer")}
            labelInc={t("augmenter")}
          />
        </div>
      </div>
      <FieldMsg message={errors["pieces"] ?? errors["chambres"]} />

      {isAppartement && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginTop: 22,
            }}
          >
            <div>
              <SectionLabel>{t("etage")}</SectionLabel>
              <TextField
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                placeholder="3"
                value={state.etage}
                onChange={(e) => setField("etage", e.target.value)}
                style={{ fontSize: 16, fontWeight: 600 }}
              />
              <FieldMsg message={errors["etage"]} />
            </div>
            <div>
              <SectionLabel>{t("etagesImmeuble")}</SectionLabel>
              <TextField
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                placeholder="6"
                value={state.etagesImmeuble}
                onChange={(e) => setField("etagesImmeuble", e.target.value)}
                style={{ fontSize: 16, fontWeight: 600 }}
              />
              <FieldMsg message={errors["etagesImmeuble"]} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Toggle
              label={t("ascenseur")}
              on={state.ascenseur === true}
              onClick={() => setField("ascenseur", state.ascenseur !== true)}
            />
            <FieldMsg message={errors["ascenseur"]} />
          </div>
        </>
      )}

      <p style={{ margin: "18px 2px 0", fontSize: 12.5, color: C.faint }}>
        {isAppartement ? t("noteCarrez") : t("noteBoutin")}
      </p>
    </div>
  );
}
