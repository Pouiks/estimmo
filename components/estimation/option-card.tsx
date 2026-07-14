"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Grande carte sélectionnable (choix exclusif). */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon: Icon,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-start gap-1.5 rounded-xl border-2 bg-background p-4 text-left transition-all",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border",
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "size-5",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        />
      )}
      <span className="text-sm font-semibold">{title}</span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </button>
  );
}

/** Puce sélectionnable compacte (choix exclusif ou multiple). */
export function OptionChip({
  selected,
  onClick,
  label,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground",
        className
      )}
    >
      {label}
    </button>
  );
}

/** Message d'erreur de champ. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-destructive">{message}</p>;
}
