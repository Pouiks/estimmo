import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CloturerDemande,
  NouvelleDemandeForm,
  PurgeButton,
  SuiviDemande,
  SupprimerDemandeButton,
} from "@/components/admin/rgpd-actions";
import { RGPD } from "@/lib/rgpd/constantes";
import {
  controlesRestants,
  etatDemande,
  jourIso,
  joursRestants,
  libelleAction,
  libelleType,
} from "@/lib/rgpd/demandes";
import { dernierePurge, leadsAVenir, listerDemandes } from "@/lib/rgpd/serveur";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata = { title: "RGPD", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateHeureFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const jour = (iso: string) => dateFmt.format(new Date(`${iso}T12:00:00Z`));

export default async function AdminRgpdPage() {
  await requireAdmin();

  let erreur: string | null = null;
  let demandes: Awaited<ReturnType<typeof listerDemandes>> = [];
  let purge: Awaited<ReturnType<typeof dernierePurge>> = null;
  let aVenir: Awaited<ReturnType<typeof leadsAVenir>> = [];
  try {
    [demandes, purge, aVenir] = await Promise.all([
      listerDemandes(),
      dernierePurge(),
      leadsAVenir(),
    ]);
  } catch (err) {
    erreur = err instanceof Error ? err.message : "Erreur inattendue";
  }

  const aujourdHui = jourIso(new Date());
  const enCours = demandes.filter((d) => !d.traitee_le);
  const traitees = demandes.filter((d) => d.traitee_le);
  const enRetard = enCours.filter((d) => etatDemande(d, aujourdHui) === "en_retard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="size-6 text-primary" /> RGPD
        </h1>
        <p className="text-sm text-muted-foreground">
          Journal des demandes d&apos;exercice des droits, réponse sous{" "}
          {RGPD.delaiReponseMois} mois, et purge automatique des données.
        </p>
      </div>

      {erreur && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Le module RGPD n&apos;est pas disponible : {erreur}. La migration{" "}
          <code>20261113100000_rgpd.sql</code> est-elle appliquée (<code>pnpm db:migrate</code>) ?
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Demandes en cours{" "}
          {enCours.length > 0 && (
            <Badge className="ml-1 bg-blue-100 text-blue-800">{enCours.length}</Badge>
          )}
          {enRetard.length > 0 && (
            <Badge className="ml-1 bg-red-100 text-red-800">
              <AlertTriangle className="size-3" /> {enRetard.length} en retard
            </Badge>
          )}
        </h2>
        {enCours.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune demande en attente. Une demande reçue par mail se saisit ci-dessous ;
            un export ou un effacement depuis une fiche lead s&apos;enregistre tout seul.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçue le</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enCours.map((d) => {
                  const restants = joursRestants(d.echeance, aujourdHui);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">{jour(d.recue_le)}</TableCell>
                      <TableCell>{libelleType(d.type)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/leads?q=${encodeURIComponent(d.demandeur)}`}
                          className="text-primary hover:underline"
                        >
                          {d.demandeur}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {jour(d.echeance)}{" "}
                        <Badge
                          className={
                            restants < 0
                              ? "bg-red-100 text-red-800"
                              : restants <= 7
                                ? "bg-amber-100 text-amber-800"
                                : "bg-muted text-muted-foreground"
                          }
                        >
                          {restants < 0
                            ? `${-restants} j de retard`
                            : `${restants} j restants`}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {d.notes}
                      </TableCell>
                      <TableCell className="text-right">
                        <CloturerDemande demande={d} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouvelle demande reçue</CardTitle>
          <CardDescription>
            Par mail ou téléphone. Retrouvez ensuite la personne dans Leads (recherche par
            email ou téléphone) pour exporter ou anonymiser ses données.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NouvelleDemandeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purge automatique</CardTitle>
          <CardDescription>
            Chaque nuit : prospects sans contact depuis{" "}
            {RGPD.conservationLeadsAnnees} ans anonymisés (clients sous mandat exclus),
            événements du formulaire de plus de {RGPD.conservationEvenementsMois} mois
            et demandes traitées depuis plus de {RGPD.conservationJournalAnnees} ans
            supprimés. Un changement de statut, une note ou une demande de rappel
            repoussent la date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Dernière purge :{" "}
            {purge ? (
              <>
                {dateHeureFmt.format(new Date(purge.executee_le))} ·{" "}
                {purge.resultat.leads_anonymises} lead(s) anonymisé(s),{" "}
                {purge.resultat.evenements_supprimes} événement(s),{" "}
                {purge.resultat.demandes_supprimees} demande(s) supprimé(s)
              </>
            ) : (
              <span className="text-muted-foreground">jamais exécutée</span>
            )}
          </p>
          <div>
            <p className="font-medium">
              À anonymiser dans les {RGPD.preavisPurgeJours} prochains jours :{" "}
              {aVenir.length === 0 ? "aucun prospect" : `${aVenir.length} prospect(s)`}
            </p>
            {aVenir.length > 0 && (
              <ul className="mt-2 space-y-1">
                {aVenir.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="text-primary hover:underline">
                      {[l.prenom, l.nom].filter(Boolean).join(" ") || l.email}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      · dernier contact {dateFmt.format(new Date(l.dernier_contact_le))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!erreur && <PurgeButton />}
        </CardContent>
      </Card>

      {traitees.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historique ({traitees.length})</h2>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçue le</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Traitée le</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {traitees.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">{jour(d.recue_le)}</TableCell>
                    <TableCell>{libelleType(d.type)}</TableCell>
                    <TableCell className="max-w-56 truncate">{d.demandeur}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d.traitee_le ? dateHeureFmt.format(new Date(d.traitee_le)) : "-"}
                      {d.traitee_le && d.traitee_le.slice(0, 10) > d.echeance && (
                        <Badge className="ml-1 bg-red-100 text-red-800">hors délai</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {libelleAction(d.action)}
                      {d.leads.length > 0 && (
                        <span className="text-muted-foreground"> · {d.leads.length} lead(s)</span>
                      )}
                      {d.action !== "export" && controlesRestants(d.controles) > 0 && (
                        <Badge className="ml-1 bg-amber-100 text-amber-800">
                          {controlesRestants(d.controles)} copie(s) externe(s) à traiter
                        </Badge>
                      )}
                      {d.notes && (
                        <p className="max-w-64 truncate text-xs text-muted-foreground">{d.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <SuiviDemande demande={d} />
                    </TableCell>
                    <TableCell>
                      <SupprimerDemandeButton id={d.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
