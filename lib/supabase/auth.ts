import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Garde d'autorisation admin — à appeler en tête de CHAQUE page protégée,
 * server action et route handler d'administration (le proxy ne vérifie que
 * l'authentification, pas le rôle).
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/admin/login");
  return user;
}

/** Variante pour les route handlers : retourne false au lieu de rediriger. */
export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}
