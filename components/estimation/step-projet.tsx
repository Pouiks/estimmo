"use client";

import { Building2, Home, KeyRound, Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "./address-autocomplete";
import { FieldError, OptionCard, OptionChip } from "./option-card";
import type { StepProps } from "./form-state";

const HORIZONS = [
  { value: "en_vente", label: "Déjà en vente" },
  { value: "moins_3_mois", label: "Moins de 3 mois" },
  { value: "3_6_mois", label: "3 à 6 mois" },
  { value: "curiosite", label: "Simple curiosité" },
] as const;

export function StepProjet({ state, setField, errors }: StepProps) {
  return (
    <div className="space-y-8">
      <div>
        <Label className="text-base font-semibold">Votre projet</Label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <OptionCard
            icon={Tag}
            title="Vendre"
            description="Estimer le prix de vente"
            selected={state.projet === "vente"}
            onClick={() => setField("projet", "vente")}
          />
          <OptionCard
            icon={KeyRound}
            title="Mettre en location"
            description="Estimer le loyer mensuel"
            selected={state.projet === "location"}
            onClick={() => {
              setField("projet", "location");
              setField("horizon", null);
            }}
          />
        </div>
        <FieldError message={errors["projet"]} />
      </div>

      {state.projet === "vente" && (
        <div>
          <Label className="text-base font-semibold">
            Quel est votre horizon de vente&nbsp;?
          </Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {HORIZONS.map((h) => (
              <OptionChip
                key={h.value}
                label={h.label}
                selected={state.horizon === h.value}
                onClick={() => setField("horizon", h.value)}
              />
            ))}
          </div>
          <FieldError message={errors["horizon"]} />
        </div>
      )}

      <div>
        <Label className="text-base font-semibold">Type de bien</Label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <OptionCard
            icon={Building2}
            title="Appartement"
            selected={state.typeBien === "appartement"}
            onClick={() => setField("typeBien", "appartement")}
          />
          <OptionCard
            icon={Home}
            title="Maison"
            selected={state.typeBien === "maison"}
            onClick={() => setField("typeBien", "maison")}
          />
        </div>
        <FieldError message={errors["typeBien"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">Adresse du bien</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          L'adresse précise permet de comparer avec les ventes de votre
          quartier. Elle reste confidentielle.
        </p>
        <div className="mt-3">
          <AddressAutocomplete
            value={state.adresse}
            onChange={(adresse) => setField("adresse", adresse)}
          />
        </div>
        <FieldError
          message={
            errors["adresse"] ??
            errors["adresse.libelle"] ??
            errors["adresse.codeInsee"]
          }
        />
      </div>
    </div>
  );
}
