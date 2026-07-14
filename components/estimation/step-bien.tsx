"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FieldError, OptionChip } from "./option-card";
import type { StepProps } from "./form-state";

const ANNEES = [
  { value: "avant_1950", label: "Avant 1950" },
  { value: "1950_1975", label: "1950 – 1975" },
  { value: "1975_2000", label: "1975 – 2000" },
  { value: "2000_2012", label: "2000 – 2012" },
  { value: "apres_2012", label: "Après 2012" },
] as const;

const EXTERIEURS = [
  { value: "balcon", label: "Balcon" },
  { value: "terrasse", label: "Terrasse" },
  { value: "jardin", label: "Jardin" },
] as const;

const STATIONNEMENTS = [
  { value: "aucun", label: "Aucun" },
  { value: "place", label: "Place de parking" },
  { value: "garage_box", label: "Garage / box" },
] as const;

export function StepBien({ state, setField, errors }: StepProps) {
  const isAppartement = state.typeBien === "appartement";

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="surface" className="flex items-center gap-1.5 text-base font-semibold">
            {isAppartement ? "Surface Carrez (m²)" : "Surface habitable (m²)"}
            {isAppartement && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button type="button" aria-label="Qu'est-ce que la surface Carrez ?" />
                  }
                >
                  <Info className="size-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Surface privative hors caves, parkings, balcons et parties
                  sous 1,80 m.
                </TooltipContent>
              </Tooltip>
            )}
          </Label>
          <Input
            id="surface"
            type="number"
            inputMode="decimal"
            min={8}
            placeholder="62"
            value={state.surface}
            onChange={(e) => setField("surface", e.target.value)}
            className="mt-2 h-11"
          />
          <FieldError message={errors["surface"]} />
        </div>

        {!isAppartement && (
          <div>
            <Label htmlFor="terrain" className="text-base font-semibold">
              Surface du terrain (m²)
            </Label>
            <Input
              id="terrain"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="400 (0 si aucun)"
              value={state.surfaceTerrain}
              onChange={(e) => setField("surfaceTerrain", e.target.value)}
              className="mt-2 h-11"
            />
            <FieldError message={errors["surfaceTerrain"]} />
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="pieces" className="text-base font-semibold">
            Nombre de pièces
          </Label>
          <Input
            id="pieces"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            placeholder="3"
            value={state.pieces}
            onChange={(e) => setField("pieces", e.target.value)}
            className="mt-2 h-11"
          />
          <FieldError message={errors["pieces"]} />
        </div>
        <div>
          <Label htmlFor="chambres" className="text-base font-semibold">
            Nombre de chambres
          </Label>
          <Input
            id="chambres"
            type="number"
            inputMode="numeric"
            min={0}
            max={15}
            placeholder="2"
            value={state.chambres}
            onChange={(e) => setField("chambres", e.target.value)}
            className="mt-2 h-11"
          />
          <FieldError message={errors["chambres"]} />
        </div>
      </div>

      {isAppartement && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="etage" className="text-base font-semibold">
              Étage (0 = rez-de-chaussée)
            </Label>
            <Input
              id="etage"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              placeholder="2"
              value={state.etage}
              onChange={(e) => setField("etage", e.target.value)}
              className="mt-2 h-11"
            />
            <FieldError message={errors["etage"]} />
          </div>
          <div>
            <Label className="text-base font-semibold">Ascenseur</Label>
            <div className="mt-2 flex gap-2">
              <OptionChip
                label="Oui"
                selected={state.ascenseur === true}
                onClick={() => setField("ascenseur", true)}
              />
              <OptionChip
                label="Non"
                selected={state.ascenseur === false}
                onClick={() => setField("ascenseur", false)}
              />
            </div>
            <FieldError message={errors["ascenseur"]} />
          </div>
        </div>
      )}

      <div>
        <Label className="text-base font-semibold">Année de construction</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {ANNEES.map((a) => (
            <OptionChip
              key={a.value}
              label={a.label}
              selected={state.anneeConstruction === a.value}
              onClick={() => setField("anneeConstruction", a.value)}
            />
          ))}
        </div>
        <FieldError message={errors["anneeConstruction"]} />
      </div>

      <div>
        <Label className="text-base font-semibold">Extérieur</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Plusieurs choix possibles.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <OptionChip
            label="Aucun"
            selected={state.exterieur.length === 0}
            onClick={() => setField("exterieur", [])}
          />
          {EXTERIEURS.map((e) => (
            <OptionChip
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

      <div>
        <Label className="text-base font-semibold">Stationnement</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATIONNEMENTS.map((s) => (
            <OptionChip
              key={s.value}
              label={s.label}
              selected={state.stationnement === s.value}
              onClick={() => setField("stationnement", s.value)}
            />
          ))}
        </div>
        <FieldError message={errors["stationnement"]} />
      </div>
    </div>
  );
}
