import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const STATUTS_LEAD = [
  { value: "nouveau", label: "Nouveau", className: "bg-blue-100 text-blue-800" },
  { value: "appele", label: "Appelé", className: "bg-sky-100 text-sky-800" },
  { value: "rdv", label: "RDV pris", className: "bg-violet-100 text-violet-800" },
  {
    value: "mandat_simple",
    label: "Mandat simple",
    className: "bg-amber-100 text-amber-800",
  },
  {
    value: "mandat_exclusif",
    label: "Mandat exclusif",
    className: "bg-green-100 text-green-800",
  },
  { value: "perdu", label: "Perdu", className: "bg-muted text-muted-foreground" },
] as const;

export type StatutLead = (typeof STATUTS_LEAD)[number]["value"];

export function StatutBadge({ statut }: { statut: string }) {
  const def = STATUTS_LEAD.find((s) => s.value === statut);
  return (
    <Badge className={cn("font-medium", def?.className)}>
      {def?.label ?? statut}
    </Badge>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  return (
    <span
      className={cn(
        "inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
        s >= 75
          ? "bg-green-600 text-white"
          : s >= 50
            ? "bg-amber-500 text-white"
            : "bg-muted text-muted-foreground"
      )}
    >
      {s}
    </span>
  );
}

export const PROJET_LABELS: Record<string, string> = {
  vente: "Vente",
  location: "Location",
};

export const HORIZON_LABELS: Record<string, string> = {
  en_vente: "Déjà en vente",
  moins_3_mois: "Moins de 3 mois",
  "3_6_mois": "3 à 6 mois",
  curiosite: "Simple curiosité",
};
