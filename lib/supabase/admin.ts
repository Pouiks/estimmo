import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client service_role — contourne RLS. À n'utiliser QUE côté serveur
 * (API routes, Server Actions, moteur d'estimation). Jamais exposé au client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
