import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, PhoneCall, PhoneIncoming, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HORIZON_LABELS,
  PROJET_LABELS,
  ScoreBadge,
} from "@/components/admin/badges";
import {
  LeadNotesForm,
  LeadStatutSelect,
  RetryCrmButton,
} from "@/components/admin/lead-actions";
import { LeadMenu } from "@/components/admin/lead-menu";
import { AnonymiserProspect, BoutonsExport } from "@/components/admin/rgpd-actions";
import { leadsDuProspect } from "@/lib/rgpd/serveur";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Détail lead", robots: { index: false } };

const LABELS: Record<string, Record<string, string>> = {
  etat: {
    a_renover: "À rénover",
    a_rafraichir: "À rafraîchir",
    bon: "Bon état",
    refait_neuf: "Refait à neuf",
  },
  age: {
    moins_5: "Moins de 5 ans",
    "5_10": "5 – 10 ans",
    "10_20": "10 – 20 ans",
    plus_20: "Plus de 20 ans",
  },
  annee: {
    avant_1950: "Avant 1950",
    "1950_1975": "1950 – 1975",
    "1975_2000": "1975 – 2000",
    "2000_2012": "2000 – 2012",
    apres_2012: "Après 2012",
  },
  stationnement: {
    aucun: "Aucun",
    place: "Place de parking",
    garage_box: "Garage / box",
  },
  atout: {
    vue_degagee: "Vue dégagée",
    lumineux: "Lumineux",
    calme: "Calme",
    dernier_etage: "Dernier étage",
    traversant: "Traversant",
  },
};

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!lead) notFound();

  const { data: syncRows } = await supabase
    .from("crm_sync_queue")
    .select("id, status, attempts, last_error, sent_at, next_retry_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  // Autres demandes d'estimation du même prospect (même email).
  const groupe = lead.anonymise_le ? [] : await leadsDuProspect(id);
  const autres = groupe.filter((l) => l.id !== id);
  const anonymise = Boolean(lead.anonymise_le);

  const est = lead.estimation as Record<string, unknown> | null;
  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/leads"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Tous les leads
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {anonymise ? "Prospect anonymisé" : `${lead.prenom ?? ""} ${lead.nom ?? ""}`}{" "}
            <ScoreBadge score={lead.score_lead} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Reçu le {dateFmt.format(new Date(lead.created_at))}
            {anonymise && (
              <Badge className="ml-2 bg-slate-200 text-slate-800">
                <UserX className="size-3" /> Anonymisé le{" "}
                {dateFmt.format(new Date(lead.anonymise_le as string))}
              </Badge>
            )}
            {lead.estimation_manuelle && (
              <Badge className="ml-2 bg-red-100 text-red-800">
                <PhoneCall className="size-3" /> Estimation manuelle à faire
              </Badge>
            )}
            {lead.demande_rappel && (
              <Badge className="ml-2 bg-blue-100 text-blue-800">
                <PhoneIncoming className="size-3" /> Rappel demandé
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatutSelect leadId={lead.id} statut={lead.statut} />
          <LeadMenu
            leadId={lead.id}
            libelle={
              [lead.prenom, lead.nom].filter(Boolean).join(" ") || lead.email
            }
            afficherFiche={false}
            apresSuppression="/admin/leads"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            {anonymise ? (
              <p className="pb-2 text-sm text-muted-foreground">
                Identité, coordonnées, adresse et notes effacées à la demande de la
                personne. Les autres données servent uniquement aux statistiques.
              </p>
            ) : (
              <>
                <Row label="Téléphone">
                  <a href={`tel:${lead.telephone}`} className="text-primary">
                    {lead.telephone}
                  </a>
                </Row>
                <Row label="Email">
                  <a href={`mailto:${lead.email}`} className="text-primary">
                    {lead.email}
                  </a>
                </Row>
              </>
            )}
            <Row label="Consentement RGPD">
              {lead.consentement_rgpd ? "Oui" : "Non"} -{" "}
              {dateFmt.format(new Date(lead.date_consentement))}
            </Row>
            <Row label="Projet">
              {PROJET_LABELS[lead.projet]}
              {lead.horizon ? ` · ${HORIZON_LABELS[lead.horizon]}` : ""}
            </Row>
            {lead.demande_rappel && (
              <Row label="Demande de rappel">
                <span className="text-blue-700">
                  Oui
                  {lead.demande_rappel_at
                    ? ` - ${dateFmt.format(new Date(lead.demande_rappel_at))}`
                    : ""}
                </span>
              </Row>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimation</CardTitle>
          </CardHeader>
          <CardContent>
            {est === null ? (
              <p className="text-sm text-muted-foreground">
                Aucune estimation automatique - analyse personnalisée à envoyer
                sous 24 h.
              </p>
            ) : lead.projet === "vente" ? (
              <>
                <Row label="Fourchette">
                  {euro(Number(est.fourchetteBasse))} -{" "}
                  <strong>{euro(Number(est.mediane))}</strong> -{" "}
                  {euro(Number(est.fourchetteHaute))}
                </Row>
                <Row label="Prix/m² zone">{euro(Number(est.prixM2Zone))}</Row>
                <Row label="Comparables">
                  {String(est.nbComparables)}{" "}
                  {est.rayonM ? `(rayon ${String(est.rayonM)} m)` : `(${String(est.palier)})`}
                </Row>
                <Row label="Confiance">{String(est.confiance)}</Row>
                <Row label="Ajustement">{String(est.ajustementPct)} %</Row>
              </>
            ) : (
              <>
                <Row label="Loyer estimé">
                  {euro(Number(est.loyerBas))} -{" "}
                  <strong>{euro(Number(est.loyerMedian))}</strong> -{" "}
                  {euro(Number(est.loyerHaut))}
                </Row>
                <Row label="Loyer m² ANIL">
                  {String(est.loyerM2Zone)} €/m² ({String(est.typologie)},{" "}
                  {String(est.millesime)})
                </Row>
                <Row label="Ajustement">{String(est.ajustementPct)} %</Row>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bien</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Type">
              {lead.type_bien === "appartement" ? "Appartement" : "Maison"} ·{" "}
              {Number(lead.surface)} m²{" "}
              {lead.surface_type === "carrez" ? "(Carrez)" : "(habitable)"}
            </Row>
            <Row label="Adresse">
              {lead.adresse_libelle ?? (anonymise ? `Commune ${lead.code_insee ?? "-"}` : "-")}
            </Row>
            <Row label="Pièces / chambres">
              {lead.pieces} / {lead.chambres}
            </Row>
            {lead.type_bien === "appartement" ? (
              <Row label="Étage / ascenseur">
                {lead.etage === 0 ? "RDC" : `Étage ${lead.etage}`}
                {lead.etages_immeuble
                  ? ` sur ${lead.etages_immeuble}`
                  : ""}{" "}
                · {lead.ascenseur ? "ascenseur" : "sans ascenseur"}
              </Row>
            ) : (
              <Row label="Terrain">{Number(lead.surface_terrain ?? 0)} m²</Row>
            )}
            <Row label="Construction">
              {LABELS.annee[lead.annee_construction ?? ""] ?? "-"}
            </Row>
            <Row label="Extérieur">
              {(lead.exterieur as string[]).length > 0
                ? (lead.exterieur as string[]).join(", ")
                : "Aucun"}
            </Row>
            <Row label="Stationnement">
              {LABELS.stationnement[lead.stationnement ?? ""] ?? "-"}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">État du bien</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="État général">
              {LABELS.etat[lead.etat_general ?? ""] ?? "-"}
            </Row>
            <Row label="Cuisine">{LABELS.age[lead.age_cuisine ?? ""] ?? "-"}</Row>
            <Row label="Salle de bain">
              {LABELS.age[lead.age_sdb ?? ""] ?? "-"}
            </Row>
            <Row label="DPE">
              {lead.dpe === "ne_sait_pas" ? "Ne sait pas" : lead.dpe}
            </Row>
            <Row label="Atouts">
              {(lead.atouts as string[]).length > 0
                ? (lead.atouts as string[])
                  .map((a) => LABELS.atout[a] ?? a)
                  .join(", ")
                : "-"}
            </Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synchronisation CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(syncRows ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune entrée dans la file CRM.
            </p>
          )}
          {(syncRows ?? []).map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="space-y-0.5">
                <p>
                  <Badge
                    className={
                      row.status === "sent"
                        ? "bg-green-100 text-green-800"
                        : row.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }
                  >
                    {row.status === "sent"
                      ? "Envoyé"
                      : row.status === "failed"
                        ? "Échec définitif"
                        : "En attente"}
                  </Badge>{" "}
                  <span className="text-muted-foreground">
                    {row.attempts} tentative(s)
                    {row.sent_at &&
                      ` · envoyé le ${dateFmt.format(new Date(row.sent_at))}`}
                  </span>
                </p>
                {row.last_error && (
                  <p className="max-w-xl truncate text-xs text-destructive">
                    {row.last_error}
                  </p>
                )}
              </div>
              {row.status !== "sent" && <RetryCrmButton queueId={row.id} />}
            </div>
          ))}
        </CardContent>
      </Card>

      {!anonymise && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              Pas de donnée sensible (santé, situation familiale, opinions…) : ces notes
              font partie des données communiquées à la personne si elle demande l'accès.
            </p>
            <LeadNotesForm leadId={lead.id} notes={lead.notes} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">RGPD - droits de la personne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {anonymise ? (
            <p className="text-muted-foreground">
              Demande traitée : plus aucune donnée personnelle sur cette fiche. Le
              journal des demandes est dans <Link href="/admin/rgpd" className="text-primary hover:underline">RGPD</Link>.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {autres.length === 0
                  ? "Ce prospect n'a fait qu'une demande d'estimation."
                  : `Ce prospect a fait ${groupe.length} demandes d'estimation avec cet email ; les actions ci-dessous peuvent porter sur l'ensemble.`}
              </p>
              {autres.length > 0 && (
                <ul className="space-y-1">
                  {autres.map((autre) => (
                    <li key={autre.id}>
                      <Link
                        href={`/admin/leads/${autre.id}`}
                        className="text-primary hover:underline"
                      >
                        {dateFmt.format(new Date(autre.created_at))} ·{" "}
                        {PROJET_LABELS[String(autre.projet)]} ·{" "}
                        {String(autre.adresse_libelle ?? "")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2">
                <p className="font-medium">Demande d'accès (copie des données)</p>
                <BoutonsExport leadId={lead.id} tous={autres.length > 0} />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Demande d'effacement</p>
                <AnonymiserProspect
                  leadId={lead.id}
                  email={lead.email}
                  nombreDemandes={groupe.length}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Réponse sous un mois, à l'adresse email enregistrée. Chaque action est
                consignée dans le journal RGPD avec les copies externes à traiter (CRM,
                Resend, boîte mail).
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {!anonymise && (
        <p className="flex gap-4 text-sm">
          <a
            className="flex items-center gap-1 text-primary hover:underline"
            href={`tel:${lead.telephone}`}
          >
            <PhoneCall className="size-4" /> Appeler
          </a>
          <a
            className="flex items-center gap-1 text-primary hover:underline"
            href={`mailto:${lead.email}`}
          >
            <Mail className="size-4" /> Écrire
          </a>
        </p>
      )}
    </div>
  );
}
