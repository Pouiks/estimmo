import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Stats", robots: { index: false } };

const JOURS_SERIE = 30;

async function chargerStats() {
  const supabase = createAdminClient();

  const depuis30j = new Date(Date.now() - JOURS_SERIE * 24 * 3600 * 1000);
  const depuis7j = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [total, semaine, manuelles, recents, scores] =
    await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", depuis7j.toISOString()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("estimation_manuelle", true)
        .eq("statut", "nouveau"),
      supabase
        .from("leads")
        .select("created_at")
        .gte("created_at", depuis30j.toISOString())
        .limit(10_000),
      supabase.from("leads").select("score_lead").limit(10_000),
    ]);

  // --- Série leads / jour (30 jours) ---
  const parJour = new Map<string, number>();
  for (let i = JOURS_SERIE - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    parJour.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of recents.data ?? []) {
    const key = String(row.created_at).slice(0, 10);
    if (parJour.has(key)) parJour.set(key, (parJour.get(key) ?? 0) + 1);
  }
  const serieJours = [...parJour.entries()];
  const maxJour = Math.max(1, ...serieJours.map(([, n]) => n));

  // --- Répartition des scores ---
  const tranches = [
    { label: "75 – 100 (chauds)", min: 75, max: 100, count: 0, className: "bg-green-600" },
    { label: "50 – 74", min: 50, max: 74, count: 0, className: "bg-amber-500" },
    { label: "25 – 49", min: 25, max: 49, count: 0, className: "bg-orange-400" },
    { label: "0 – 24", min: 0, max: 24, count: 0, className: "bg-muted-foreground/40" },
  ];
  let sommeScores = 0;
  const scoreRows = scores.data ?? [];
  for (const row of scoreRows) {
    const s = row.score_lead ?? 0;
    sommeScores += s;
    const tranche = tranches.find((t) => s >= t.min && s <= t.max);
    if (tranche) tranche.count++;
  }
  const scoreMoyen =
    scoreRows.length > 0 ? Math.round(sommeScores / scoreRows.length) : 0;
  const maxTranche = Math.max(1, ...tranches.map((t) => t.count));

  return {
    totalCount: total.count ?? 0,
    semaineCount: semaine.count ?? 0,
    manuellesCount: manuelles.count ?? 0,
    serieJours,
    maxJour,
    tranches,
    maxTranche,
    scoreMoyen,
  };
}

export default async function AdminStatsPage() {
  await requireAdmin();
  const {
    totalCount,
    semaineCount,
    manuellesCount,
    serieJours,
    maxJour,
    tranches,
    maxTranche,
    scoreMoyen,
  } = await chargerStats();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Leads au total" value={totalCount} />
        <Kpi label="Leads sur 7 jours" value={semaineCount} />
        <Kpi label="Score moyen" value={scoreMoyen} suffix="/100" />
        <Kpi
          label="Manuelles à traiter"
          value={manuellesCount}
          alerte={manuellesCount > 0}
        />
      </div>

      {/* Leads par jour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Leads par jour - {JOURS_SERIE} derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-36 items-end gap-1">
            {serieJours.map(([jour, n]) => (
              <div
                key={jour}
                title={`${new Date(jour).toLocaleDateString("fr-FR")} : ${n} lead(s)`}
                className="group relative flex-1"
              >
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(3, (n / maxJour) * 130)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>
              {new Date(serieJours[0][0]).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span>Aujourd'hui</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Répartition par score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tranches.map((t) => (
              <div key={t.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t.label}</span>
                  <span className="font-semibold">{t.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${t.className}`}
                    style={{ width: `${(t.count / maxTranche) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Le parcours du formulaire a sa propre section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parcours du formulaire</CardTitle>
            <CardDescription>
              Entonnoir par étape, champs qui bloquent, durées, réponses
              données et segments (appareil, langue) : tout est dans la section
              Analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Activity className="size-4" /> Ouvrir les analytics
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  alerte,
}: {
  label: string;
  value: number;
  suffix?: string;
  alerte?: boolean;
}) {
  return (
    <Card className={alerte ? "border-red-300" : undefined}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`text-3xl font-bold ${alerte ? "text-red-600" : ""}`}
        >
          {value.toLocaleString("fr-FR")}
          {suffix && (
            <span className="text-base font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
