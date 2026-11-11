import { NextResponse, type NextRequest } from "next/server";
import { executerPurge } from "@/lib/rgpd/serveur";
import { isAuthorizedBearer } from "@/lib/security/secret";

/**
 * Vercel Cron (quotidien, 03:30 UTC) : applique les durées de conservation
 * annoncées dans la politique de confidentialité (`lib/rgpd/constantes.ts`) :
 * anonymisation des prospects sans contact depuis 3 ans (clients sous mandat
 * exclus), suppression des événements du formulaire de plus de 25 mois et des
 * demandes RGPD traitées depuis plus de 5 ans. Chaque passage est tracé dans
 * `purges_rgpd` (visible dans /admin/rgpd).
 * Sécurisé par CRON_SECRET (header Authorization: Bearer, injecté par Vercel).
 */
export async function GET(request: NextRequest) {
  if (
    !isAuthorizedBearer(
      request.headers.get("authorization"),
      process.env.CRON_SECRET
    )
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const resultat = await executerPurge();
    if (resultat.leads_anonymises > 0) {
      console.log(`[cron-rgpd] ${resultat.leads_anonymises} lead(s) anonymisé(s)`);
    }
    return NextResponse.json(resultat);
  } catch (err) {
    console.error("[cron-rgpd] erreur :", err);
    return NextResponse.json({ error: "Échec de la purge" }, { status: 500 });
  }
}
