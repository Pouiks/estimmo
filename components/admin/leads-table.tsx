import Link from "next/link";
import { PhoneCall, PhoneIncoming, UserX, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

interface Groupe {
  cle: string;
  leads: LeadRow[];
}

/**
 * Un prospect = un email : ses demandes d'estimation (plusieurs biens, ou le
 * même bien en vente et en location) sont regroupées sous une seule ligne,
 * dans l'ordre d'apparition de la page (tri score ou date).
 */
function regrouper(leads: LeadRow[]): Groupe[] {
  const groupes = new Map<string, Groupe>();
  for (const lead of leads) {
    const cle = lead.email && !lead.anonymise_le ? lead.email.toLowerCase() : `id:${lead.id}`;
    const groupe = groupes.get(cle);
    if (groupe) groupe.leads.push(lead);
    else groupes.set(cle, { cle, leads: [lead] });
  }
  return [...groupes.values()];
}

function nomProspect(lead: LeadRow): string {
  return `${lead.prenom ?? ""} ${lead.nom ?? ""}`.trim() || lead.email || "";
}

export function LeadsTable({
  leads,
  demandesParEmail,
}: {
  leads: LeadRow[];
  /** Nombre total de demandes par email (minuscules), toutes pages et filtres confondus. */
  demandesParEmail?: Map<string, number>;
}) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucun lead ne correspond à ces filtres.
      </p>
    );
  }

  const groupes = regrouper(leads);

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
          {groupes.map((groupe) => {
            const premier = groupe.leads[0];
            const total = premier.email
              ? (demandesParEmail?.get(premier.email.toLowerCase()) ?? groupe.leads.length)
              : groupe.leads.length;
            const regroupe = groupe.leads.length > 1 || total > 1;

            if (!regroupe) {
              return <LigneDemande key={premier.id} lead={premier} contact />;
            }

            const meilleurScore = Math.max(...groupe.leads.map((l) => l.score_lead ?? 0));
            return (
              <LigneProspect
                key={groupe.cle}
                lead={premier}
                nombre={groupe.leads.length}
                total={total}
                meilleurScore={meilleurScore}
                rappel={groupe.leads.some((l) => l.demande_rappel)}
              >
                {groupe.leads.map((lead) => (
                  <LigneDemande key={lead.id} lead={lead} contact={false} />
                ))}
              </LigneProspect>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Ligne d'en-tête d'un prospect à plusieurs demandes, suivie de ses demandes. */
function LigneProspect({
  lead,
  nombre,
  total,
  meilleurScore,
  rappel,
  children,
}: {
  lead: LeadRow;
  nombre: number;
  total: number;
  meilleurScore: number;
  rappel: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell className="text-muted-foreground">
          <Users className="size-4" />
        </TableCell>
        <TableCell>
          <Link
            href={`/admin/leads?q=${encodeURIComponent(lead.email ?? "")}`}
            className="font-medium hover:underline"
            title="Toutes les demandes de ce prospect"
          >
            {nomProspect(lead)}
          </Link>
          {rappel && (
            <Badge className="ml-2 bg-blue-100 text-blue-800">
              <PhoneIncoming className="size-3" /> Rappel demandé
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">
            {lead.telephone} · {lead.email}
          </p>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {total} demandes d&apos;estimation
          {nombre < total && (
            <>
              {" "}
              ({nombre} sur cette page ·{" "}
              <Link
                href={`/admin/leads?q=${encodeURIComponent(lead.email ?? "")}`}
                className="text-primary hover:underline"
              >
                tout voir
              </Link>
              )
            </>
          )}
        </TableCell>
        <TableCell className="text-center">
          <ScoreBadge score={meilleurScore} />
        </TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
      {children}
    </>
  );
}

/** Une demande d'estimation ; `contact` = afficher le nom et les coordonnées (prospect seul). */
function LigneDemande({ lead, contact }: { lead: LeadRow; contact: boolean }) {
  return (
    <TableRow className="relative">
      <TableCell
        className={cn(
          "whitespace-nowrap text-muted-foreground",
          !contact && "border-l-4 border-l-muted pl-6"
        )}
      >
        {dateFormat.format(new Date(lead.created_at))}
      </TableCell>
      <TableCell>
        <Link
          href={`/admin/leads/${lead.id}`}
          className={cn("hover:underline", contact ? "font-medium" : "text-sm text-muted-foreground")}
        >
          {contact ? (
            lead.anonymise_le ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UserX className="size-3.5" /> Prospect anonymisé
              </span>
            ) : (
              nomProspect(lead)
            )
          ) : (
            "Ouvrir la demande"
          )}
          {/* étend la zone cliquable à toute la ligne */}
          <span className="absolute inset-0" aria-hidden />
        </Link>
        {contact && lead.demande_rappel && (
          <Badge className="relative z-10 ml-2 bg-blue-100 text-blue-800">
            <PhoneIncoming className="size-3" /> Rappel demandé
          </Badge>
        )}
        {contact && !lead.anonymise_le && (
          <p className="text-xs text-muted-foreground">
            {lead.telephone} · {lead.email}
          </p>
        )}
      </TableCell>
      <TableCell>
        <p className="text-sm">
          {PROJET_LABELS[lead.projet]} ·{" "}
          {lead.type_bien === "appartement" ? "Appt" : "Maison"} {Number(lead.surface)} m²
          {lead.estimation_manuelle && (
            <Badge className="relative z-10 ml-2 bg-red-100 text-red-800">
              <PhoneCall className="size-3" /> Manuelle
            </Badge>
          )}
          {!contact && lead.demande_rappel && (
            <Badge className="relative z-10 ml-2 bg-blue-100 text-blue-800">
              <PhoneIncoming className="size-3" /> Rappel
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
          libelle={nomProspect(lead) || "ce prospect anonymisé"}
        />
      </TableCell>
    </TableRow>
  );
}
