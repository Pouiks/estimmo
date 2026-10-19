import "server-only";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "./admin";
import { createClient } from "./server";

/**
 * Rôle d'un utilisateur, en cache 5 min (tag « profiles ») : le rôle ne
 * change qu'à la création d'un admin (pnpm admin:create), la révocation
 * prend effet en 5 min au plus. Client service_role : pas de cookie dans
 * une fonction cachée.
 */
const roleUtilisateur = unstable_cache(
  async (userId: string): Promise<string | null> => {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return (data?.role as string | undefined) ?? null;
  },
  ["role-utilisateur"],
  { revalidate: 300, tags: ["profiles"] }
);

/**
 * Utilisateur de la session : jeton ES256 vérifié localement avec la clé
 * publique du projet (JWKS, en cache 10 min au niveau du module auth-js) ;
 * un jeton expiré est d'abord rafraîchi. Aucun appel réseau sur une
 * instance chaude, contre un aller-retour vers Supabase avec getUser().
 */
async function utilisateurConnecte(): Promise<{ id: string; email?: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}

/**
 * Garde d'autorisation admin - à appeler en tête de CHAQUE page protégée,
 * server action et route handler d'administration (le proxy ne vérifie que
 * l'authentification, pas le rôle).
 */
export async function requireAdmin() {
  const user = await utilisateurConnecte();
  if (!user) redirect("/admin/login");
  if ((await roleUtilisateur(user.id)) !== "admin") redirect("/admin/login");
  return user;
}

/** Variante pour les route handlers : retourne false au lieu de rediriger. */
export async function isAdminRequest(): Promise<boolean> {
  const user = await utilisateurConnecte();
  return !!user && (await roleUtilisateur(user.id)) === "admin";
}
