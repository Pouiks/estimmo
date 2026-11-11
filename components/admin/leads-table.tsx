import Link from "next/link";
import { PhoneCall, PhoneIncoming, UserX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PROJET_LABELS, ScoreBadge, StatutBadge } from "./badges";
import { LeadMenu } from "./lead-menu";

export interface LeadRow {
  id: string;
  created_at: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  email: string | null;
  projet: string;
  type_bien: string;
  surface: number;
  adresse_libelle: string | null;
  score_lead: number | null;
  statut: string;
  estimation_manuelle: boolean;
  demande_rappel?: boolean;
  anonymise_le?: string | null;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadsTable({
  leads,
  demandesParEmail,
}: {
  leads: LeadRow[];
  /** Nombre de demandes par email (minuscules) : badge « ×N » si > 1. */
  demandesParEmail?: Map<string, number>;
}) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucun lead ne correspond à ces filtres.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Bien</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="relative">
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFormat.format(new Date(lead.created_at))}
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="font-medium hover:underline"
                >
                  {lead.anonymise_le ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <UserX className="size-3.5" /> Prospect anonymisé
                    </span>
                  ) : (
                    `${lead.prenom ?? ""} ${lead.nom ?? ""}`.trim() || lead.email
                  )}
                  {/* étend la zone cliquable à toute la ligne */}
                  <span className="absolute inset-0" aria-hidden />
                </Link>
                {lead.email && (demandesParEmail?.get(lead.email.toLowerCase()) ?? 0) > 1 && (
                  <Link
                    href={`/admin/leads?q=${encodeURIComponent(lead.email)}`}
                    className="relative z-10 ml-2"
                    title="Toutes les demandes de ce prospect"
                  >
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                      ×{demandesParEmail?.get(lead.email.toLowerCase())} demandes
                    </Badge>
                  </Link>
                )}
                {lead.demande_rappel && (
                  <Badge className="relative z-10 ml-2 bg-blue-100 text-blue-800">
                    <PhoneIncoming className="size-3" /> Rappel demandé
                  </Badge>
                )}
                {!lead.anonymise_le && (
                  <p className="text-xs text-muted-foreground">
                    {lead.telephone} · {lead.email}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <p className="text-sm">
                  {PROJET_LABELS[lead.projet]} ·{" "}
                  {lead.type_bien === "appartement" ? "Appt" : "Maison"}{" "}
                  {Number(lead.surface)} m²
                  {lead.estimation_manuelle && (
                    <Badge className="relative z-10 ml-2 bg-red-100 text-red-800">
                      <PhoneCall className="size-3" /> Manuelle
                    </Badge>
                  )}
                </p>
                <p className="max-w-72 truncate text-xs text-muted-foreground">
                  {lead.adresse_libelle}
                </p>
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={lead.score_lead} />
              </TableCell>
              <TableCell>
                <StatutBadge statut={lead.statut} />
              </TableCell>
              <TableCell className="text-right">
                <LeadMenu
                  leadId={lead.id}
                  libelle={
                    [lead.prenom, lead.nom].filter(Boolean).join(" ") ||
                    lead.email ||
                    "ce prospect anonymisé"
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
