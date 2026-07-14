import { AlertTriangle } from "lucide-react";
import { LeadsTable, type LeadRow } from "@/components/admin/leads-table";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Estimations manuelles",
  robots: { index: false },
};

export default async function AdminEstimationsManuellesPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, prenom, nom, telephone, email, projet, type_bien, surface, adresse_libelle, score_lead, statut, estimation_manuelle"
    )
    .eq("estimation_manuelle", true)
    .order("statut", { ascending: true }) // 'nouveau' est alphabétiquement après... trié ci-dessous
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  // Les leads « nouveau » (pas encore traités) en tête de file
  const leads = ((data ?? []) as LeadRow[]).sort((a, b) => {
    const aNew = a.statut === "nouveau" ? 0 : 1;
    const bNew = b.statut === "nouveau" ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    return b.created_at.localeCompare(a.created_at);
  });

  const aTraiter = leads.filter((l) => l.statut === "nouveau").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Estimations manuelles
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {aTraiter > 0 ? (
            <>
              <AlertTriangle className="size-4 text-red-600" />
              <strong className="text-red-600">
                {aTraiter} estimation(s) à envoyer sous 24 h
              </strong>{" "}
              — zone non couverte par les données publiques (Alsace-Moselle,
              Mayotte) ou comparables insuffisants.
            </>
          ) : (
            "Aucune estimation manuelle en attente. Les leads en zone non couverte apparaissent ici."
          )}
        </p>
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}
