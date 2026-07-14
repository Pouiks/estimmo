import Link from "next/link";
import { PhoneCall } from "lucide-react";
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

export interface LeadRow {
  id: string;
  created_at: string;
  prenom: string | null;
  nom: string | null;
  telephone: string;
  email: string;
  projet: string;
  type_bien: string;
  surface: number;
  adresse_libelle: string | null;
  score_lead: number | null;
  statut: string;
  estimation_manuelle: boolean;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
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
                  {lead.prenom} {lead.nom}
                  {/* étend la zone cliquable à toute la ligne */}
                  <span className="absolute inset-0" aria-hidden />
                </Link>
                <p className="text-xs text-muted-foreground">
                  {lead.telephone} · {lead.email}
                </p>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
