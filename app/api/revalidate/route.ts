import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
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
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
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
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: parsed.data.paths });
}
