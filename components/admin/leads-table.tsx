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

            const statuts = new Map<string, number>();
            for (const l of groupe.leads) {
              statuts.set(l.statut, (statuts.get(l.statut) ?? 0) + 1);
            }
            return (
              <LigneProspect
                key={groupe.cle}
                lead={premier}
                nombre={groupe.leads.length}
                total={total}
                statuts={[...statuts.entries()]}
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

/**
 * En-tête d'un prospect à plusieurs demandes : pleine largeur, liseré bleu,
 * nom et coordonnées une seule fois, résumé des statuts ; ses demandes
 * suivent avec le même liseré, sans colonne contact.
 */
function LigneProspect({
  lead,
  nombre,
  total,
  statuts,
  rappel,
  children,
}: {
  lead: LeadRow;
  nombre: number;
  total: number;
  statuts: Array<[string, number]>;
  rappel: boolean;
  children: React.ReactNode;
}) {
  const lien = `/admin/leads?q=${encodeURIComponent(lead.email ?? "")}`;
  return (
    <>
      <TableRow className="border-l-4 border-l-primary bg-primary/5 hover:bg-primary/5">
        <TableCell colSpan={3} className="py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Users className="size-4 text-primary" />
            <Link
              href={lien}
              className="text-base font-semibold hover:underline"
              title="Toutes les demandes de ce prospect"
            >
              {nomProspect(lead)}
            </Link>
            <span className="text-sm text-muted-foreground">
              {lead.telephone} · {lead.email}
            </span>
            {rappel && (
              <Badge className="bg-blue-100 text-blue-800">
                <PhoneIncoming className="size-3" /> Rappel demandé
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {total} demandes d&apos;estimation
            {nombre < total && (
              <>
                {" "}· {nombre} sur cette page ·{" "}
                <Link href={lien} className="text-primary hover:underline">
                  tout voir
                </Link>
              </>
            )}
          </p>
        </TableCell>
        <TableCell />
        <TableCell colSpan={2}>
          <div className="flex flex-wrap gap-2">
            {statuts.map(([statut, n]) => (
              <span key={statut} className="inline-flex items-center gap-1 text-xs">
                <StatutBadge statut={statut} />
                {n > 1 && <span className="text-muted-foreground">×{n}</span>}
              </span>
            ))}
          </div>
        </TableCell>
      </TableRow>
      {children}
    </>
  );
}

/**
 * Une demande d'estimation. `contact` = prospect seul (nom et coordonnées
 * affichés) ; sinon la ligne est sous un en-tête de prospect et le bien
 * occupe aussi la colonne contact.
 */
function LigneDemande({ lead, contact }: { lead: LeadRow; contact: boolean }) {
  const fiche = `/admin/leads/${lead.id}`;
  return (
    <TableRow className={cn("relative", !contact && "border-l-4 border-l-primary/30")}>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {dateFormat.format(new Date(lead.created_at))}
      </TableCell>
      {contact && (
        <TableCell>
          <Link href={fiche} className="font-medium hover:underline">
            {lead.anonymise_le ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UserX className="size-3.5" /> Prospect anonymisé
              </span>
            ) : (
              nomProspect(lead)
            )}
            {/* étend la zone cliquable à toute la ligne */}
            <span className="absolute inset-0" aria-hidden />
          </Link>
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
      )}
      <TableCell colSpan={contact ? 1 : 2}>
        {!contact && (
          <Link href={fiche} className="hover:underline">
            {/* la ligne entière ouvre la demande */}
            <span className="absolute inset-0" aria-hidden />
            <span className="sr-only">Ouvrir la demande</span>
          </Link>
        )}
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
        <p className="max-w-96 truncate text-xs text-muted-foreground">
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
