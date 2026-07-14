"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "./option-card";
import type { StepProps } from "./form-state";

export function StepContact({ state, setField, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm">
        <Lock className="mr-1.5 inline size-4 text-primary" />
        Dernière étape : votre estimation s'affiche immédiatement après et vous
        est envoyée par email.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="prenom" className="text-base font-semibold">
            Prénom
          </Label>
          <Input
            id="prenom"
            autoComplete="given-name"
            value={state.prenom}
            onChange={(e) => setField("prenom", e.target.value)}
            className="mt-2 h-11"
          />
          <FieldError message={errors["prenom"]} />
        </div>
        <div>
          <Label htmlFor="nom" className="text-base font-semibold">
            Nom
          </Label>
          <Input
            id="nom"
            autoComplete="family-name"
            value={state.nom}
            onChange={(e) => setField("nom", e.target.value)}
            className="mt-2 h-11"
          />
          <FieldError message={errors["nom"]} />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-base font-semibold">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={state.email}
          onChange={(e) => setField("email", e.target.value)}
          className="mt-2 h-11"
        />
        <FieldError message={errors["email"]} />
      </div>

      <div>
        <Label htmlFor="telephone" className="text-base font-semibold">
          Téléphone
        </Label>
        <Input
          id="telephone"
          type="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          value={state.telephone}
          onChange={(e) => setField("telephone", e.target.value)}
          className="mt-2 h-11"
        />
        <FieldError message={errors["telephone"]} />
      </div>

      <div className="flex items-start gap-3 rounded-xl border p-4">
        <Checkbox
          id="consentement"
          checked={state.consentement}
          onCheckedChange={(checked) =>
            setField("consentement", checked === true)
          }
          className="mt-0.5"
        />
        <div>
          <label
            htmlFor="consentement"
            className="block text-sm leading-relaxed text-foreground select-none"
          >
            J'accepte que mes données soient utilisées pour me recontacter au
            sujet de mon projet immobilier — voir la{" "}
            <Link
              href="/politique-confidentialite"
              target="_blank"
              className="underline underline-offset-4"
            >
              politique de confidentialité
            </Link>
            .
          </label>
          <FieldError message={errors["consentement"]} />
        </div>
      </div>
    </div>
  );
}
