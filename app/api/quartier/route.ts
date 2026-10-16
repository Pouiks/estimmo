import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { fetchQuartierStats } from "@/lib/quartier";

/**
 * Équipements du quartier autour d'un point (écoles, transports, commerces,
 * parcs). Appelé par l'écran résultat après l'estimation : jamais bloquant,
 * l'UI se dégrade silencieusement si stats est null.
 */
export async function GET(request: NextRequest) {
  // Overpass bannit vite les IP abusives : on limite en amont.
  const limited = rateLimit(request, {
    scope: "quartier",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const lat = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lon = Number.parseFloat(request.nextUrl.searchParams.get("lon") ?? "");

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return NextResponse.json({ stats: null }, { status: 400 });
  }

  const stats = await fetchQuartierStats(lat, lon);

  return NextResponse.json(
    { stats },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
