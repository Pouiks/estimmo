"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { C, FieldMsg, SectionLabel, StepHeader, TextField } from "./design";
import type { StepProps } from "./form-state";

export function StepContact({ state, setField, errors }: StepProps) {
  const t = useTranslations("estimation.contact");

  return (
    <div>
      <StepHeader title={t("titre")} subtitle={t("sousTitre")} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <SectionLabel>{t("prenom")}</SectionLabel>
          <TextField
            autoComplete="given-name"
            placeholder={t("placeholders.prenom")}
            value={state.prenom}
            onChange={(e) => setField("prenom", e.target.value)}
          />
          <FieldMsg message={errors["prenom"]} />
        </div>
        <div>
          <SectionLabel>{t("nom")}</SectionLabel>
          <TextField
            autoComplete="family-name"
            placeholder={t("placeholders.nom")}
            value={state.nom}
            onChange={(e) => setField("nom", e.target.value)}
          />
          <FieldMsg message={errors["nom"]} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <SectionLabel>{t("email")}</SectionLabel>
        <TextField
          type="email"
          autoComplete="email"
          placeholder={t("placeholders.email")}
          value={state.email}
          onChange={(e) => setField("email", e.target.value)}
        />
        <FieldMsg message={errors["email"]} />
      </div>

      {/* Pot de miel : invisible et hors tabulation pour un humain, rempli
          par les robots qui complètent tous les champs. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -10000,
          top: "auto",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="site-web">{t("siteWeb")}</label>
        <input
          id="site-web"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={state.siteWeb}
          onChange={(e) => setField("siteWeb", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel hint={t("telephoneHint")}>{t("telephone")}</SectionLabel>
        <TextField
          type="tel"
          autoComplete="tel"
          placeholder={t("placeholders.telephone")}
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
          {t.rich("consentement", {
            lien: (chunks) => (
              <Link
                href="/politique-confidentialite"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                style={{ color: C.accent, textDecoration: "underline" }}
              >
                {chunks}
              </Link>
            ),
          })}
        </span>
      </div>
      <FieldMsg message={errors["consentement"]} />
    </div>
  );
}
