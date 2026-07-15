"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Palette du design Estimation.dc (teal ESTIMMO). */
export const C = {
  accent: "#2E90E5",
  accentDark: "#2168A5",
  accentLight: "#A1CDF3",
  ink: "#0C1F1C",
  muted: "#5E706C",
  label: "#3A4C48",
  faint: "#8A9793",
  faint2: "#9BA8A4",
  border: "#E2E8E5",
  borderSoft: "#ECF0EE",
  inputBg: "#FBFCFB",
  cardBg: "#F5F8F6",
  sel: "#EAF4FC",
  iconBg: "#F1F5F3",
} as const;

export function SectionLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: C.label,
        margin: "0 0 10px",
        textTransform: "uppercase",
        letterSpacing: ".05em",
      }}
    >
      {children}
      {hint && (
        <span
          style={{
            fontWeight: 500,
            color: C.faint2,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {" "}
          · {hint}
        </span>
      )}
    </div>
  );
}

export function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <h2
        className="dcx-serif"
        style={{
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1.15,
          margin: "0 0 4px",
          letterSpacing: "-.01em",
          color: C.ink,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "0 0 22px", color: C.muted, fontSize: 15 }}>
        {subtitle}
      </p>
    </>
  );
}

export function FieldMsg({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p style={{ margin: "8px 2px 0", fontSize: 13, color: "#C2410C" }}>
      {message}
    </p>
  );
}

function SelectedTick({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        position: "absolute",
        top: 11,
        right: 11,
        width: size,
        height: size,
        borderRadius: 99,
        background: C.accent,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Check size={size * 0.6} strokeWidth={3} />
    </span>
  );
}

/** Grande carte à icône (projet / type de bien). */
export function ChoiceCard({
  icon: Icon,
  title,
  sub,
  selected,
  onClick,
  orientation = "column",
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
  orientation?: "column" | "row";
}) {
  const row = orientation === "row";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: row ? "row" : "column",
        alignItems: row ? "center" : "flex-start",
        gap: row ? 12 : 0,
        padding: row ? "15px 16px" : "18px 16px",
        borderRadius: 16,
        border: `2px solid ${selected ? C.accent : C.border}`,
        background: selected ? C.sel : "#fff",
        transition: "all .18s ease",
        textAlign: "left",
        width: "100%",
        font: "inherit",
      }}
    >
      <span
        style={{
          width: row ? 36 : 40,
          height: row ? 36 : 40,
          borderRadius: row ? 10 : 11,
          background: selected ? C.accent : C.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: row ? 0 : 12,
          color: selected ? "#fff" : C.muted,
          flexShrink: 0,
        }}
      >
        <Icon size={row ? 18 : 20} />
      </span>
      <span>
        <span
          style={{
            display: "block",
            fontWeight: 700,
            fontSize: row ? 15 : 16,
            marginBottom: sub ? 2 : 0,
            color: C.ink,
          }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{ display: "block", fontSize: 13, color: C.muted, lineHeight: 1.3 }}
          >
            {sub}
          </span>
        )}
      </span>
      {selected && <SelectedTick size={row ? 20 : 22} />}
    </button>
  );
}

/** Petite carte titre + sous-titre (état général). */
export function ConditionCard({
  title,
  sub,
  selected,
  onClick,
}: {
  title: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        cursor: "pointer",
        padding: "13px 15px",
        borderRadius: 14,
        border: `2px solid ${selected ? C.accent : C.border}`,
        background: selected ? C.sel : "#fff",
        transition: "all .18s",
        textAlign: "left",
        width: "100%",
        font: "inherit",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 1, color: C.ink }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted }}>{sub}</div>
    </button>
  );
}

/** Chip carrée DPE (A-G colorées quand sélectionnées, "Je ne sais pas" en teinte). */
export function DpeChip({
  label,
  selected,
  filled,
  onClick,
}: {
  label: string;
  selected: boolean;
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        cursor: "pointer",
        minWidth: 44,
        height: 44,
        padding: "0 12px",
        borderRadius: 11,
        border: `2px solid ${selected ? C.accent : C.border}`,
        background: selected ? (filled ? C.accent : C.sel) : "#fff",
        color: selected ? (filled ? "#fff" : C.accent) : C.label,
        fontWeight: 800,
        fontSize: 15,
        font: "inherit",
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  );
}

/** Pill rond (atouts / extérieur / stationnement). */
export function Pill({
  label,
  selected,
  onClick,
  showMark = true,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  showMark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 15px",
        borderRadius: 99,
        border: `1.5px solid ${selected ? C.accent : C.border}`,
        background: selected ? C.sel : "#fff",
        color: selected ? C.accent : C.muted,
        fontWeight: 600,
        fontSize: 14,
        font: "inherit",
        transition: "all .15s",
      }}
    >
      {showMark && <span style={{ fontSize: 13 }}>{selected ? "✓" : "+"}</span>}
      {label}
    </button>
  );
}

/** Contrôle segmenté pleine largeur (tranches d'âge, choix exclusifs courts). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 6,
        padding: 6,
        borderRadius: 14,
        border: `1.5px solid ${C.border}`,
        background: C.inputBg,
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              padding: "10px 6px",
              borderRadius: 10,
              border: "none",
              background: on ? C.accent : "transparent",
              color: on ? "#fff" : C.muted,
              fontWeight: on ? 700 : 600,
              fontSize: 13.5,
              cursor: "pointer",
              font: "inherit",
              transition: "all .15s",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compteur − valeur + (pièces / chambres). */
export function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    fontWeight: 700,
    font: "inherit",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 8,
        borderRadius: 14,
        border: `1.5px solid ${C.border}`,
        background: C.inputBg,
      }}
    >
      <button
        type="button"
        onClick={onDec}
        aria-label="Diminuer"
        style={{ ...btn, background: "#EEF3F1", color: C.ink }}
      >
        −
      </button>
      <span style={{ fontSize: 19, fontWeight: 800, color: C.ink }}>{value}</span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Augmenter"
        style={{ ...btn, background: C.accent, color: "#fff" }}
      >
        +
      </button>
    </div>
  );
}

/** Interrupteur (ascenseur). */
export function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 16px",
        borderRadius: 14,
        border: `2px solid ${on ? C.accent : C.border}`,
        background: on ? C.sel : C.inputBg,
        width: "100%",
        font: "inherit",
        transition: "all .18s",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{label}</span>
      <span
        style={{
          width: 44,
          height: 26,
          borderRadius: 99,
          background: on ? C.accent : "#CBD5D1",
          position: "relative",
          transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: 99,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,.25)",
            transition: "left .2s",
          }}
        />
      </span>
    </button>
  );
}

/** Champ texte au style design (focus géré par .dcx dans globals.css). */
export function TextField({
  style,
  suffix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { suffix?: string }) {
  const input = (
    <input
      {...props}
      style={{
        width: "100%",
        padding: suffix ? "16px 58px 16px 18px" : "14px 16px",
        borderRadius: 14,
        border: `1.5px solid ${C.border}`,
        fontSize: 15,
        background: C.inputBg,
        color: C.ink,
        transition: "border-color .15s",
        ...style,
      }}
    />
  );
  if (!suffix) return input;
  return (
    <div style={{ position: "relative" }}>
      {input}
      <span
        style={{
          position: "absolute",
          right: 18,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.faint,
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {suffix}
      </span>
    </div>
  );
}
