import { revalidatePath } from "next/cache";
import { revaliderSite } from "@/lib/i18n/revalidate";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedBearer } from "@/lib/security/secret";
import { z } from "zod";

/**
 * Revalidation ISR à la demande (publication d'article, mise à jour des
 * stats communes après import). Protégé par CRON_SECRET.
 * NB : la publication depuis l'admin revalide déjà directement via les
 * server actions - cette route sert aux déclenchements externes
 * (GitHub Action post-import, CRM, etc.).
 */
const bodySchema = z.object({
  paths: z.array(z.string().startsWith("/")).min(1).max(50),
});

export async function POST(request: NextRequest) {
  if (
    !isAuthorizedBearer(
      request.headers.get("authorization"),
      process.env.CRON_SECRET
    )
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "paths[] requis" }, { status: 400 });
  }

  for (const path of parsed.data.paths) {
    // Les chemins publics (/blog, /prix-immobilier/nice-06000) vivent sous
    // app/[locale] : on revalide chaque langue. Les routes hors locale
    // (sitemap, admin, api) sont revalidées telles quelles.
    if (path.startsWith("/admin") || path.startsWith("/api") || path.includes(".")) {
      revalidatePath(path);
    } else {
      revaliderSite(path);
    }
  }

  return NextResponse.json({ revalidated: parsed.data.paths });
}
