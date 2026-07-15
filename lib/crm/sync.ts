import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dépilage de la file crm_sync_queue.
 * POST vers CRM_WEBHOOK_URL avec Authorization Bearer + Idempotency-Key.
 * 2xx → sent. Échec → retry avec backoff exponentiel, max 10 tentatives,
 * puis failed (visible et rejouable depuis l'admin).
 */
export const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT_MS = 8_000;

export interface SyncSummary {
  skipped: boolean;
  processed: number;
  sent: number;
  retried: number;
  failed: number;
}

/** 5 min × 2^(tentatives-1), plafonné à 6 h. */
export function backoffDelayMs(attempts: number): number {
  return Math.min(5 * 60_000 * 2 ** (attempts - 1), 6 * 3600_000);
}

interface QueueRow {
  id: number;
  lead_id: string;
  payload: unknown;
  idempotency_key: string;
  attempts: number;
}

/**
 * Traite un lot d'éléments de la file.
 * @param ids Si fourni (bouton « rejouer » de l'admin), traite ces éléments
 *            précisément, y compris ceux en statut failed.
 */
export async function processCrmQueue(ids?: number[]): Promise<SyncSummary> {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  const apiKey = process.env.CRM_API_KEY;

  const summary: SyncSummary = {
    skipped: false,
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  if (!webhookUrl) {
    // Pas de CRM configuré (dev) : les éléments restent en pending.
    console.log("[crm-sync] CRM_WEBHOOK_URL absent - file laissée en attente");
    summary.skipped = true;
    return summary;
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("crm_sync_queue")
    .select("id, lead_id, payload, idempotency_key, attempts")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (ids && ids.length > 0) {
    query = query.in("id", ids).in("status", ["pending", "failed"]);
  } else {
    query = query
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString());
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(`crm_sync_queue : ${error.message}`);

  for (const row of (rows ?? []) as QueueRow[]) {
    summary.processed++;

    let failure: string | null = null;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey ?? ""}`,
          "Idempotency-Key": row.idempotency_key,
        },
        body: JSON.stringify(row.payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        failure = `HTTP ${res.status} ${detail.slice(0, 200)}`;
      }
    } catch (err) {
      failure = err instanceof Error ? err.message : String(err);
    }

    if (failure === null) {
      await supabase
        .from("crm_sync_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
      summary.sent++;
    } else {
      const attempts = row.attempts + 1;
      const isFinal = attempts >= MAX_ATTEMPTS;
      await supabase
        .from("crm_sync_queue")
        .update({
          status: isFinal ? "failed" : "pending",
          attempts,
          last_error: failure,
          next_retry_at: new Date(
            Date.now() + backoffDelayMs(attempts)
          ).toISOString(),
        })
        .eq("id", row.id);
      if (isFinal) summary.failed++;
      else summary.retried++;
      console.warn(
        `[crm-sync] échec #${attempts}/${MAX_ATTEMPTS} (queue ${row.id}, lead ${row.lead_id}) : ${failure}`
      );
    }
  }

  return summary;
}
