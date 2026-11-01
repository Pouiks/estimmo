import { NextResponse, type NextRequest } from "next/server";
import { normaliserLot } from "@/lib/analytics/evenements";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Suivi anonyme du tunnel d'estimation (étapes, champs, erreurs, durées),
 * agrégé dans /admin/analytics. Le navigateur envoie des lots d'événements
 * (lib/analytics/suivi.ts) ; aucune donnée personnelle n'y figure.
 */
export async function POST(request: NextRequest) {
  // Un parcours complet envoie ~10 lots : 60/min par IP est large.
  const limited = rateLimit(request, {
    scope: "track",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  // Corps lu en texte : le repli sendBeacon l'envoie en text/plain.
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const lot = normaliserLot(body);
  if (!lot) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const lignes = lot.evenements.map((e) => ({
    session_id: lot.sessionId,
    step: e.etape,
    event: e.event,
    champ: e.champ ?? null,
    valeur: e.valeur ?? null,
    locale: lot.locale ?? null,
    appareil: lot.appareil ?? null,
    page: lot.page ?? null,
    ecoule_ms: e.t,
  }));

  try {
    const { error } = await createAdminClient()
      .from("form_events")
      .insert(lignes);
    if (error) console.error("[track] insertion échouée :", error.message);
  } catch (err) {
    // Le suivi ne doit jamais gêner le parcours.
    console.error("[track] erreur :", err);
  }

  return new NextResponse(null, { status: 204 });
}
