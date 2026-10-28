import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleCorps } from "@/components/blog/article-corps";
import { articlesEnLigne, type ArticleComplet } from "@/lib/blog/publication";
import { estLocale } from "@/lib/i18n/routing";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Aperçu de l'article", robots: { index: false } };

/**
 * Aperçu d'un article quel que soit son statut (programmé, brouillon), rendu
 * comme sur le site : relecture avant la mise en ligne.
 */
export default async function ApercuArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const { data } = await createAdminClient()
    .from("articles")
    .select(
      "id, slug, titre, extrait, meta_description, contenu, contenu_html, categorie, temps_lecture, image_cover, image_cover_alt, visuels, published_at, meta_title, auteur, image_cover_largeur, image_cover_hauteur, faq, articles_lies, updated_at, lang, traduction_de"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const locale = estLocale(data.lang) ? data.lang : "fr";
  const article = {
    ...data,
    published_at: data.published_at ?? new Date().toISOString(),
  } as ArticleComplet;
  const enLigne = await articlesEnLigne(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <span>
          Aperçu - les liens vers des articles pas encore en ligne s'affichent en
          texte simple, comme sur le site.
        </span>
        <Link href={`/admin/blog/${id}`} className="flex items-center gap-1 font-medium hover:underline">
          <ArrowLeft className="size-4" /> Retour à l'édition
        </Link>
      </div>
      <article className="mx-auto max-w-[720px] rounded-xl border bg-background px-4 pb-12 sm:px-8">
        <ArticleCorps
          article={article}
          locale={locale}
          slugsEnLigne={new Set(enLigne.map((a) => a.slug))}
        />
      </article>
    </div>
  );
}
