import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Stats", robots: { index: false } };

const JOURS_SERIE = 30;

async function chargerStats() {
  const supabase = createAdminClient();

  const depuis30j = new Date(Date.now() - JOURS_SERIE * 24 * 3600 * 1000);
  const depuis7j = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [total, semaine, manuelles, recents, scores, events] =
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
      supabase
        .from("form_events")
        .select("session_id, step, event")
        .gte("created_at", depuis30j.toISOString())
        .limit(50_000),
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

  // --- Entonnoir de complétion (30 jours) ---
  const vues = [1, 2, 3, 4].map(() => new Set<string>());
  const completes = [1, 2, 3, 4].map(() => new Set<string>());
  const soumissions = new Set<string>();
  for (const ev of events.data ?? []) {
    const index = Number(ev.step) - 1;
    if (index < 0 || index > 3) continue;
    if (ev.event === "view") vues[index].add(ev.session_id);
    if (ev.event === "complete") completes[index].add(ev.session_id);
    if (ev.event === "submit") soumissions.add(ev.session_id);
  }
  const baseFunnel = Math.max(1, vues[0].size);

  return {
    totalCount: total.count ?? 0,
    semaineCount: semaine.count ?? 0,
    manuellesCount: manuelles.count ?? 0,
    serieJours,
    maxJour,
    tranches,
    maxTranche,
    scoreMoyen,
    vues: vues.map((set) => set.size),
    soumissions: soumissions.size,
    baseFunnel,
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
    vues,
    soumissions,
    baseFunnel,
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

        {/* Entonnoir de complétion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Complétion du formulaire - 30 jours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Projet", "Bien", "État", "Coordonnées"].map((label, i) => {
              const n = vues[i];
              const pct = Math.round((n / baseFunnel) * 100);
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      Étape {i + 1} - {label}
                    </span>
                    <span className="font-semibold">
                      {n} <span className="text-muted-foreground">({pct} %)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="font-medium">Estimations envoyées</span>
              <span className="font-semibold">
                {soumissions}{" "}
                <span className="text-muted-foreground">
                  ({Math.round((soumissions / baseFunnel) * 100)} % des
                  visiteurs du formulaire)
                </span>
              </span>
            </div>
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
