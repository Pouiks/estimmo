import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { rechercherCommunes } from "@/lib/seo/communes";
import { nomDepartement } from "@/lib/seo/departements";

/**
 * Recherche de commune par nom ou code postal (champ de recherche des pages
 * /prix-immobilier). Ne lit que les agrégats `communes_stats` (jamais de
 * mutation DVF individuelle). `dept` restreint à un département.
 * Les résultats changent au plus une fois par jour : cache CDN 24 h.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "communes",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const dept = request.nextUrl.searchParams.get("dept") ?? "";
  const departement = /^(\d{2,3}|2A|2B)$/.test(dept) ? dept : undefined;

  const communes = await rechercherCommunes(q, departement);

  return NextResponse.json(
    {
      communes: communes.map((c) => ({
        slug: c.slug,
        nom: c.nom_commune,
        codePostal: c.code_postal,
        departement: nomDepartement(c.departement) ?? c.departement,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
