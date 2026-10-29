import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleCorps } from "@/components/blog/article-corps";
import { CHAMPS_COMPLETS, slugsEnLigne, type LigneComplete } from "@/lib/blog/publication";
import { versionPour, type Traductions } from "@/lib/blog/traductions";
import { estLocale } from "@/lib/i18n/routing";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Aperçu de l'article", robots: { index: false } };

/**
 * Aperçu d'un article quel que soit son statut (programmé, brouillon), rendu
 * comme sur le site : relecture avant la mise en ligne. `?lang=en` montre la
 * version anglaise, même en brouillon.
 */
export default async function ApercuArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  const locale = estLocale(lang) ? lang : "fr";

  const { data } = await createAdminClient()
    .from("articles")
    .select(CHAMPS_COMPLETS)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const brut = data as unknown as Omit<LigneComplete, "published_at"> & { published_at: string | null };
  const ligne: LigneComplete = { ...brut, published_at: brut.published_at ?? new Date().toISOString() };
  const traductions = (ligne.traductions ?? {}) as Traductions;
  const [article, slugs] = [versionPour(ligne, locale, { brouillons: true }), await slugsEnLigne()];

  const langues: { locale: "fr" | "en"; libelle: string; href: string }[] = [
    { locale: "fr", libelle: "Français", href: `/admin/blog/${id}/apercu` },
    ...(traductions.en
      ? [{ locale: "en" as const, libelle: "English", href: `/admin/blog/${id}/apercu?lang=en` }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <span>
          Aperçu - les liens vers des articles pas encore en ligne s&apos;affichent en
          texte simple, comme sur le site.
          {locale === "en" && article.langue !== "en" && " Aucune version anglaise : le français est affiché."}
        </span>
        <div className="flex items-center gap-4">
          {langues.length > 1 && (
            <nav aria-label="Langue de l'aperçu" className="flex gap-1 rounded-md border border-sky-200 bg-white p-0.5">
              {langues.map((l) => (
                <Link
                  key={l.locale}
                  href={l.href}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    l.locale === locale ? "bg-sky-900 text-white" : "hover:bg-sky-100"
                  )}
                  aria-current={l.locale === locale ? "page" : undefined}
                >
                  {l.libelle}
                </Link>
              ))}
            </nav>
          )}
          <Link href={`/admin/blog/${id}`} className="flex items-center gap-1 font-medium hover:underline">
            <ArrowLeft className="size-4" /> Retour à l&apos;édition
          </Link>
        </div>
      </div>
      <article
        lang={locale}
        className="mx-auto max-w-[720px] rounded-xl border bg-background px-4 pb-12 sm:px-8"
      >
        <ArticleCorps article={article} locale={locale} slugsEnLigne={slugs} />
      </article>
    </div>
  );
}
