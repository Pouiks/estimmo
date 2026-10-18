"use client";

import { useTranslations } from "next-intl";
import { Building2, Home, KeyRound, Lock, Tag } from "lucide-react";
import { AddressAutocomplete } from "./address-autocomplete";
import { QuartierStrip } from "./quartier-block";
import {
  C,
  ChoiceCard,
  FieldMsg,
  Pill,
  SectionLabel,
  StepHeader,
} from "./design";
import type { StepProps } from "./form-state";

const HORIZONS = ["en_vente", "moins_3_mois", "3_6_mois", "curiosite"] as const;

export function StepProjet({ state, setField, errors }: StepProps) {
  const t = useTranslations("estimation.projet");
  const tl = useTranslations("labels");

  return (
    <div>
      <StepHeader title={t("titre")} subtitle={t("sousTitre")} />

      {/* L'adresse en premier : c'est la donnée qui pèse le plus dans
          l'estimation, et le champ le plus engageant du tunnel. */}
      <SectionLabel>{t("adresse")}</SectionLabel>
      <AddressAutocomplete
        value={state.adresse}
        onChange={(adresse) => setField("adresse", adresse)}
      />
      {state.adresse ? (
        <QuartierStrip
          key={state.adresse.libelle}
          adresse={state.adresse}
          onLoaded={(stats) => setField("quartierStats", stats)}
        />
      ) : (
        <p
          style={{
            margin: "9px 2px 0",
            fontSize: 12.5,
            color: C.faint,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Lock size={13} />
          {t("confidentialite")}
        </p>
      )}
      <FieldMsg
        message={
          errors["adresse"] ??
          errors["adresse.libelle"] ??
          errors["adresse.codeInsee"]
        }
      />

      <div style={{ marginTop: 24 }}>
        <SectionLabel>{t("souhait")}</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <ChoiceCard
            icon={Tag}
            title={t("vendre")}
            sub={t("vendreSous")}
            selected={state.projet === "vente"}
            onClick={() => setField("projet", "vente")}
          />
          <ChoiceCard
            icon={KeyRound}
            title={t("louer")}
            sub={t("louerSous")}
            selected={state.projet === "location"}
            onClick={() => {
              setField("projet", "location");
              setField("horizon", null);
            }}
          />
        </div>
        <FieldMsg message={errors["projet"]} />
      </div>

      {state.projet === "vente" && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel>{t("horizon")}</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HORIZONS.map((h) => (
              <Pill
                key={h}
                label={tl(`horizon.${h}`)}
                showMark={false}
                selected={state.horizon === h}
                onClick={() => setField("horizon", h)}
              />
            ))}
          </div>
          <FieldMsg message={errors["horizon"]} />
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <SectionLabel>{t("typeBien")}</SectionLabel>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <ChoiceCard
            orientation="row"
            icon={Building2}
            title={tl("typeBien.appartement")}
            selected={state.typeBien === "appartement"}
            onClick={() => setField("typeBien", "appartement")}
          />
          <ChoiceCard
            orientation="row"
            icon={Home}
            title={tl("typeBien.maison")}
            selected={state.typeBien === "maison"}
            onClick={() => setField("typeBien", "maison")}
          />
        </div>
        <FieldMsg message={errors["typeBien"]} />
      </div>
    </div>
  );
}
