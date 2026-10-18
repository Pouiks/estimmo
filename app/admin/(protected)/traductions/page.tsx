import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TraductionsEditor,
  type LigneTraduction,
} from "@/components/admin/traductions-editor";
import { catalogue, NAMESPACES } from "@/lib/i18n/catalogue";
import { placeholdersIcu } from "@/lib/i18n/icu";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata = { title: "Traductions", robots: { index: false } };

/** Libellés lisibles des namespaces (fichiers messages/<locale>/*.json). */
const LIBELLES: Record<string, string> = {
  barometre: "Baromètre des prix",
  blog: "Blog",
  common: "Commun (marque, mentions, unités)",
  commune: "Pages communes (SEO)",
  departement: "Pages départements (SEO)",
  email: "Emails prospect",
  estimation: "Tunnel d'estimation",
  home: "Page d'accueil",
  labels: "Libellés (types de bien, états…)",
  legal: "Mentions légales et confidentialité",
  nav: "Navigation",
  notFound: "Page 404",
  prix: "Index prix immobilier",
  quartier: "Bloc quartier",
  rappel: "Page de rappel",
  result: "Écran résultat",
  validation: "Messages de validation",
};

export default async function TraductionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ns?: string; q?: string }>;
}) {
  await requireAdmin();
  const { ns, q } = await searchParams;
  const namespace = ns && NAMESPACES.includes(ns) ? ns : "home";
  const recherche = (q ?? "").trim().toLowerCase();

  const [{ data: lignes }, { data: compteurs }] = await Promise.all([
    createAdminClient()
      .from("traductions")
      .select("locale, cle, valeur")
      .like("cle", `${namespace}.%`),
    createAdminClient().from("traductions").select("cle"),
  ]);

  const surcharges: Record<string, Partial<Record<"fr" | "en", string>>> = {};
  for (const l of lignes ?? []) {
    (surcharges[l.cle] ??= {})[l.locale as "fr" | "en"] = l.valeur;
  }
  const modifieesParNamespace: Record<string, number> = {};
  for (const c of compteurs ?? []) {
    const nsDeCle = c.cle.split(".")[0];
    modifieesParNamespace[nsDeCle] = (modifieesParNamespace[nsDeCle] ?? 0) + 1;
  }

  const rows: LigneTraduction[] = catalogue(namespace)
    .filter(
      (e) =>
        !recherche ||
        e.cle.toLowerCase().includes(recherche) ||
        e.defaut.fr.toLowerCase().includes(recherche) ||
        e.defaut.en.toLowerCase().includes(recherche) ||
        (surcharges[e.cle]?.fr ?? "").toLowerCase().includes(recherche) ||
        (surcharges[e.cle]?.en ?? "").toLowerCase().includes(recherche)
    )
    .map((e) => ({
      cle: e.cle,
      placeholders: placeholdersIcu(e.defaut.fr),
      defaut: e.defaut,
      surcharge: {
        fr: surcharges[e.cle]?.fr ?? null,
        en: surcharges[e.cle]?.en ?? null,
      },
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traductions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reformulez les textes du site dans chaque langue (ton, SEO). Les
          textes d&apos;origine restent dans le code ; vos modifications
          priment sur le site et dans les emails, et s&apos;appliquent dans
          la minute sur toutes les pages. Les éléments entre accolades
          (ex. <code>{"{nom}"}</code>) et les balises doivent être conservés.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Section</span>
          <select
            name="ns"
            defaultValue={namespace}
            className="flex h-9 min-w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {NAMESPACES.map((n) => (
              <option key={n} value={n}>
                {LIBELLES[n] ?? n}
                {modifieesParNamespace[n] ? ` (${modifieesParNamespace[n]} modifié(s))` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Rechercher</span>
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="clé ou texte…"
            className="w-64"
          />
        </label>
        <Button type="submit" variant="outline">
          <Search className="size-4" /> Afficher
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        {rows.length} clé(s) dans « {LIBELLES[namespace] ?? namespace} »
        {recherche ? ` pour « ${q} »` : ""}.
      </p>

      <TraductionsEditor key={`${namespace}:${recherche}`} rows={rows} />
    </div>
  );
}
