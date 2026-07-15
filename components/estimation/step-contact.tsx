"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { C, FieldMsg, SectionLabel, StepHeader, TextField } from "./design";
import type { StepProps } from "./form-state";

export function StepContact({ state, setField, errors }: StepProps) {
  return (
    <div>
      <StepHeader
        title="Recevez votre estimation"
        subtitle="Résultat immédiat à l'écran et récapitulatif par email."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <SectionLabel>Prénom</SectionLabel>
          <TextField
            autoComplete="given-name"
            placeholder="Camille"
            value={state.prenom}
            onChange={(e) => setField("prenom", e.target.value)}
          />
          <FieldMsg message={errors["prenom"]} />
        </div>
        <div>
          <SectionLabel>Nom</SectionLabel>
          <TextField
            autoComplete="family-name"
            placeholder="Durand"
            value={state.nom}
            onChange={(e) => setField("nom", e.target.value)}
          />
          <FieldMsg message={errors["nom"]} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Email</SectionLabel>
        <TextField
          type="email"
          autoComplete="email"
          placeholder="camille.durand@email.fr"
          value={state.email}
          onChange={(e) => setField("email", e.target.value)}
        />
        <FieldMsg message={errors["email"]} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel hint="pour être rappelé(e)">Téléphone</SectionLabel>
        <TextField
          type="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          value={state.telephone}
          onChange={(e) => setField("telephone", e.target.value)}
        />
        <FieldMsg message={errors["telephone"]} />
      </div>

      <div
        onClick={() => setField("consentement", !state.consentement)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          padding: 14,
          borderRadius: 14,
          background: C.cardBg,
          border: `1px solid ${C.borderSoft}`,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            border: `2px solid ${state.consentement ? C.accent : "#C9D3CF"}`,
            background: state.consentement ? C.accent : "#fff",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
            transition: "all .15s",
          }}
        >
          {state.consentement && <Check size={13} strokeWidth={3} />}
        </span>
        <span style={{ fontSize: 13, color: "#4A5C58", lineHeight: 1.4 }}>
          J&apos;accepte que mes données soient utilisées pour me recontacter au
          sujet de mon projet immobilier - voir la{" "}
          <Link
            href="/politique-confidentialite"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            style={{ color: C.accent, textDecoration: "underline" }}
          >
            politique de confidentialité
          </Link>
          .
        </span>
      </div>
      <FieldMsg message={errors["consentement"]} />
    </div>
  );
}
