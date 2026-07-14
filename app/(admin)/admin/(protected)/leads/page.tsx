import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadsTable, type LeadRow } from "@/components/admin/leads-table";
import { STATUTS_LEAD } from "@/components/admin/badges";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Leads", robots: { index: false } };

const PAGE_SIZE = 50;

interface Filters {
  statut?: string;
  projet?: string;
  score?: string;
  tri?: string;
  page?: string;
}

function buildQueryString(filters: Filters, patch: Partial<Filters>): string {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);

  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select(
      "id, created_at, prenom, nom, telephone, email, projet, type_bien, surface, adresse_libelle, score_lead, statut, estimation_manuelle, demande_rappel",
      { count: "exact" }
    );

  if (filters.statut) query = query.eq("statut", filters.statut);
  if (filters.projet) query = query.eq("projet", filters.projet);
  if (filters.score) {
    const min = Number.parseInt(filters.score, 10);
    if (Number.isFinite(min)) query = query.gte("score_lead", min);
  }

  if (filters.tri === "date") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query
      .order("score_lead", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const leads = (data ?? []) as LeadRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString("fr-FR")} lead(s)
            {filters.statut || filters.projet || filters.score
              ? " avec ces filtres"
              : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={
            <a
              href={`/admin/leads/export${buildQueryString(filters, { page: undefined })}`}
            />
          }
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Statut :</span>
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { statut: undefined, page: undefined })}`}
          active={!filters.statut}
          label="Tous"
        />
        {STATUTS_LEAD.map((s) => (
          <FilterLink
            key={s.value}
            href={`/admin/leads${buildQueryString(filters, { statut: s.value, page: undefined })}`}
            active={filters.statut === s.value}
            label={s.label}
          />
        ))}
        <span className="ml-4 text-muted-foreground">Projet :</span>
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { projet: undefined, page: undefined })}`}
          active={!filters.projet}
          label="Tous"
        />
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { projet: "vente", page: undefined })}`}
          active={filters.projet === "vente"}
          label="Vente"
        />
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { projet: "location", page: undefined })}`}
          active={filters.projet === "location"}
          label="Location"
        />
        <span className="ml-4 text-muted-foreground">Score ≥ :</span>
        {["50", "75"].map((s) => (
          <FilterLink
            key={s}
            href={`/admin/leads${buildQueryString(filters, { score: filters.score === s ? undefined : s, page: undefined })}`}
            active={filters.score === s}
            label={s}
          />
        ))}
        <span className="ml-4 text-muted-foreground">Tri :</span>
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { tri: undefined, page: undefined })}`}
          active={filters.tri !== "date"}
          label="Score"
        />
        <FilterLink
          href={`/admin/leads${buildQueryString(filters, { tri: "date", page: undefined })}`}
          active={filters.tri === "date"}
          label="Date"
        />
      </div>

      <LeadsTable leads={leads} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              className="rounded-md border px-3 py-1.5 hover:bg-muted"
              href={`/admin/leads${buildQueryString(filters, { page: String(page - 1) })}`}
            >
              ← Précédent
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              className="rounded-md border px-3 py-1.5 hover:bg-muted"
              href={`/admin/leads${buildQueryString(filters, { page: String(page + 1) })}`}
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      {label}
    </Link>
  );
}
