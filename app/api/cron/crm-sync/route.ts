import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedBearer } from "@/lib/security/secret";
import { processCrmQueue } from "@/lib/crm/sync";

/**
 * Vercel Cron (toutes les 5 min) : dépile la file de synchronisation CRM.
 * Sécurisé par CRON_SECRET (header Authorization: Bearer, injecté par Vercel).
 */
export const maxDuration = 60;

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
    const summary = await processCrmQueue();
    if (summary.processed > 0 || summary.skipped) {
      console.log("[crm-sync]", JSON.stringify(summary));
    }
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[crm-sync] erreur :", err);
    return NextResponse.json({ error: "Échec de la synchro" }, { status: 500 });
  }
}
