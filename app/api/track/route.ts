import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/** Suivi anonyme du tunnel d'estimation (taux d'abandon par étape). */
const eventSchema = z.object({
  sessionId: z.uuid(),
  step: z.number().int().min(1).max(4),
  event: z.enum(["view", "complete", "submit"]),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("form_events").insert({
      session_id: parsed.data.sessionId,
      step: parsed.data.step,
      event: parsed.data.event,
    });
  } catch {
    // Le tracking ne doit jamais gêner le parcours.
  }

  return new NextResponse(null, { status: 204 });
}
