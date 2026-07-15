"use client";

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

const HORIZONS = [
  { value: "en_vente", label: "Déjà en vente" },
  { value: "moins_3_mois", label: "Moins de 3 mois" },
  { value: "3_6_mois", label: "3 à 6 mois" },
  { value: "curiosite", label: "Simple curiosité" },
] as const;

export function StepProjet({ state, setField, errors }: StepProps) {
  return (
    <div>
      <StepHeader
        title="Votre projet immobilier"
        subtitle="Commencez par l'adresse : elle déclenche l'analyse de votre quartier."
      />

      {/* L'adresse en premier : c'est la donnée qui pèse le plus dans
          l'estimation, et le champ le plus engageant du tunnel. */}
      <SectionLabel>Adresse du bien</SectionLabel>
      <AddressAutocomplete
        value={state.adresse}
        onChange={(adresse) => setField("adresse", adresse)}
      />
      {state.adresse ? (
        <QuartierStrip key={state.adresse.libelle} adresse={state.adresse} />
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
          L&apos;adresse affine la comparaison. Elle reste strictement
          confidentielle.
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
        <SectionLabel>Je souhaite</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <ChoiceCard
            icon={Tag}
            title="Vendre"
            sub="Prix de vente estimé"
            selected={state.projet === "vente"}
            onClick={() => setField("projet", "vente")}
          />
          <ChoiceCard
            icon={KeyRound}
            title="Louer"
            sub="Loyer mensuel estimé"
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
          <SectionLabel>Votre horizon de vente</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HORIZONS.map((h) => (
              <Pill
                key={h.value}
                label={h.label}
                showMark={false}
                selected={state.horizon === h.value}
                onClick={() => setField("horizon", h.value)}
              />
            ))}
          </div>
          <FieldMsg message={errors["horizon"]} />
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <SectionLabel>Type de bien</SectionLabel>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <ChoiceCard
            orientation="row"
            icon={Building2}
            title="Appartement"
            selected={state.typeBien === "appartement"}
            onClick={() => setField("typeBien", "appartement")}
          />
          <ChoiceCard
            orientation="row"
            icon={Home}
            title="Maison"
            selected={state.typeBien === "maison"}
            onClick={() => setField("typeBien", "maison")}
          />
        </div>
        <FieldMsg message={errors["typeBien"]} />
      </div>
    </div>
  );
}
