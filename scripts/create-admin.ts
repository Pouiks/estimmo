/**
 * Crée (ou promeut) un utilisateur admin dans Supabase Auth + profiles.
 *
 * Usage : pnpm admin:create <email> <mot_de_passe>
 * Requiert NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage : pnpm admin:create <email> <mot_de_passe>");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local"
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (!error.message.toLowerCase().includes("already")) throw error;
    // Utilisateur existant : on le retrouve pour le promouvoir.
    const { data: list, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!existing) throw error;
    userId = existing.id;
    console.log("Utilisateur existant, promotion en admin.");
  } else {
    userId = data.user.id;
    console.log("Utilisateur créé.");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, role: "admin" });
  if (profileError) throw profileError;

  console.log(`Admin prêt : ${email} → connexion sur /admin/login`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
