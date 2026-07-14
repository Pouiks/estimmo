import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  FileText,
  Inbox,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const navItems = [
  { href: "/admin/leads", label: "Leads", icon: Inbox },
  {
    href: "/admin/estimations-manuelles",
    label: "Estimations manuelles",
    icon: PhoneCall,
  },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/stats", label: "Stats", icon: BarChart3 },
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Le proxy vérifie l'authentification ; ici on vérifie le RÔLE admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  const { count: manuellesEnAttente } = await createAdminClient()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("estimation_manuelle", true)
    .eq("statut", "nouveau");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="border-b p-4">
          <Link href="/admin/leads" className="text-lg font-bold">
            ESTI<span className="text-primary">MMO</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
              {item.href === "/admin/estimations-manuelles" &&
                (manuellesEnAttente ?? 0) > 0 && (
                  <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {manuellesEnAttente}
                  </span>
                )}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-4" /> Voir le site
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 text-muted-foreground"
            >
              Se déconnecter
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <Link href="/admin/leads" className="font-bold">
            ESTI<span className="text-primary">MMO</span> admin
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Déconnexion
            </Button>
          </form>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
