import { type NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Export CSV des leads (mêmes filtres que la liste). Séparateur ; + BOM Excel. */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10_000);

  const statut = params.get("statut");
  const projet = params.get("projet");
  const score = params.get("score");
  if (statut) query = query.eq("statut", statut);
  if (projet) query = query.eq("projet", projet);
  if (score) {
    const min = Number.parseInt(score, 10);
    if (Number.isFinite(min)) query = query.gte("score_lead", min);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const colonnes = [
    "created_at",
    "prenom",
    "nom",
    "email",
    "telephone",
    "projet",
    "horizon",
    "type_bien",
    "surface",
    "pieces",
    "chambres",
    "adresse_libelle",
    "code_insee",
    "etat_general",
    "dpe",
    "score_lead",
    "statut",
    "estimation_manuelle",
    "mediane_estimation",
    "notes",
  ];

  const escapeCsv = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lignes = (data ?? []).map((lead) => {
    const est = lead.estimation as Record<string, unknown> | null;
    const mediane = est
      ? ((est.mediane ?? est.loyerMedian) as number | undefined)
      : undefined;
    return colonnes
      .map((col) =>
        col === "mediane_estimation"
          ? escapeCsv(mediane)
          : escapeCsv(lead[col as keyof typeof lead])
      )
      .join(";");
  });

  const csv = "﻿" + [colonnes.join(";"), ...lignes].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-estimmo-${date}.csv"`,
    },
  });
}
