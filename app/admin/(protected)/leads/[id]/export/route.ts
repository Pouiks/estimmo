import { type NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/supabase/auth";
import { LOCALES, type Locale } from "@/lib/i18n/routing";
import { resumeTexte } from "@/lib/rgpd/export";
import { enregistrerDemande, exportProspect } from "@/lib/rgpd/serveur";

/**
 * Export des données d'un prospect (droit d'accès / portabilité).
 *   ?format=json (défaut) : structure complète (leads, transmissions CRM)
 *   ?format=txt           : résumé lisible, dans la langue du prospect, à
 *                           coller dans la réponse
 *   ?tous=1               : toutes les demandes partageant le même email
 * Chaque téléchargement est consigné dans le journal RGPD (type « accès »).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "txt" ? "txt" : "json";
  const tous = request.nextUrl.searchParams.get("tous") === "1";

  const exp = await exportProspect(id, tous);
  if (!exp) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });

  await enregistrerDemande({
    type: "acces",
    demandeur: exp.prospect.email ?? id,
    leads: exp.demandes.map((d) => String(d.id)),
    action: "export",
    notes: `Export ${format} (${exp.prospect.nombre_demandes} demande(s)) depuis la fiche`,
  });

  const date = exp.genere_le.slice(0, 10);
  const base = `donnees-${(exp.prospect.email ?? id).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${date}`;

  if (format === "txt") {
    const brut = exp.demandes[exp.demandes.length - 1]?.locale;
    const locale: Locale = LOCALES.includes(brut as Locale) ? (brut as Locale) : "fr";
    return new NextResponse(resumeTexte(exp, locale), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(JSON.stringify(exp, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
