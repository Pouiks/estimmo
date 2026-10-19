import { NextResponse, type NextRequest } from "next/server";
import { diffuserArticlesDus } from "@/lib/blog/publication";
import { isAuthorizedBearer } from "@/lib/security/secret";

/**
 * Vercel Cron (quotidien, 06:05 UTC = 7 h 05 ou 8 h 05 à Paris) : met en
 * ligne les articles programmés dont la date est passée en rafraîchissant le
 * cache ISR du blog (liste, articles, sitemap). Planifié une fois par jour
 * pour rester compatible avec le plan Vercel gratuit.
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
    const resultat = await diffuserArticlesDus();
    if (resultat.diffuses.length > 0) {
      console.log("[cron-blog] en ligne :", resultat.diffuses.join(", "));
    }
    return NextResponse.json(resultat);
  } catch (err) {
    console.error("[cron-blog] erreur :", err);
    return NextResponse.json({ error: "Échec de la diffusion" }, { status: 500 });
  }
}
