"use client";

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
  const isAppartement = state.typeBien === "appartement";
  const typeWord = isAppartement ? "appartement" : "maison";

  const pieces = toNumber(state.pieces) ?? 0;
  const chambres = toNumber(state.chambres) ?? 0;

  return (
    <div>
      <StepHeader
        title="Les caractéristiques"
        subtitle={`Quelques chiffres clés sur votre ${typeWord}.`}
      />

      <SectionLabel hint={isAppartement ? "loi Carrez" : undefined}>
        {isAppartement ? "Surface Carrez" : "Surface habitable"}
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
          <SectionLabel>Pièces</SectionLabel>
          <Stepper
            value={String(pieces || 1)}
            onDec={() => setField("pieces", String(Math.max((pieces || 1) - 1, 1)))}
            onInc={() => setField("pieces", String(Math.min((pieces || 1) + 1, 20)))}
          />
        </div>
        <div>
          <SectionLabel>Chambres</SectionLabel>
          <Stepper
            value={String(chambres)}
            onDec={() => setField("chambres", String(Math.max(chambres - 1, 0)))}
            onInc={() => setField("chambres", String(Math.min(chambres + 1, 15)))}
          />
        </div>
      </div>
      <FieldMsg message={errors["pieces"] ?? errors["chambres"]} />

      {isAppartement && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            alignItems: "end",
            marginTop: 22,
          }}
        >
          <div>
            <SectionLabel>Étage</SectionLabel>
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
          </div>
          <div>
            <SectionLabel>&nbsp;</SectionLabel>
            <Toggle
              label="Ascenseur"
              on={state.ascenseur === true}
              onClick={() => setField("ascenseur", state.ascenseur !== true)}
            />
          </div>
        </div>
      )}
      {isAppartement && (
        <FieldMsg message={errors["etage"] ?? errors["ascenseur"]} />
      )}

      <p style={{ margin: "18px 2px 0", fontSize: 12.5, color: C.faint }}>
        {isAppartement
          ? "Surface Carrez : surface privative hors caves, parkings, balcons et parties sous 1,80 m."
          : "Surface habitable au sens de la loi Boutin."}
      </p>
    </div>
  );
}
