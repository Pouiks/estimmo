import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import {
  ArticleEditor,
  type ArticleData,
} from "@/components/admin/article-editor";
import {
  ArticleEditorialEditor,
  type ArticleEditorialData,
} from "@/components/admin/article-editorial-editor";
import { Button } from "@/components/ui/button";
import { imageDisponible } from "@/lib/blog/images";
import { versChampParis } from "@/lib/blog/planning";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Modifier l'article", robots: { index: false } };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from("articles")
    .select(
      "id, slug, titre, meta_title, meta_description, extrait, categorie, auteur, temps_lecture, contenu, contenu_html, image_cover, image_cover_alt, faq, articles_lies, mot_cle_principal, mots_cles_secondaires, images, statut, lang, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!article) notFound();

  // Article rédigé dans l'éditeur visuel (format TipTap)
  if (!article.contenu_html) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Modifier l'article</h1>
        <ArticleEditor article={article as ArticleData} />
      </div>
    );
  }

  // Article éditorial (HTML importé depuis content/blog)
  const { data: autres } = await supabase
    .from("articles")
    .select("slug, titre")
    .neq("id", id)
    .order("titre");

  const visuels = [
    article.image_cover as string,
    ...((article.images ?? []) as { src: string }[]).map((i) => i.src),
  ];

  const data: ArticleEditorialData = {
    id: article.id,
    titre: article.titre,
    slug: article.slug,
    metaTitle: article.meta_title ?? article.titre,
    metaDescription: article.meta_description ?? "",
    extrait: article.extrait ?? "",
    categorie: article.categorie ?? "estimation",
    auteur: article.auteur ?? "",
    tempsLecture: article.temps_lecture ?? 5,
    publishedAt: article.published_at
      ? versChampParis(new Date(article.published_at))
      : versChampParis(new Date()),
    statut: article.statut,
    imageCover: article.image_cover ?? "",
    imageCoverAlt: article.image_cover_alt ?? "",
    contenuHtml: article.contenu_html,
    faq: article.faq ?? [],
    articlesLies: article.articles_lies ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Modifier l'article</h1>
        <Button variant="outline" render={<Link href={`/admin/blog/${id}/apercu`} />}>
          <Eye className="size-4" /> Aperçu
        </Button>
      </div>
      <ArticleEditorialEditor
        article={data}
        autresArticles={(autres ?? []) as { slug: string; titre: string }[]}
        motsCles={[article.mot_cle_principal, ...(article.mots_cles_secondaires ?? [])].filter(Boolean)}
        visuels={visuels.map((src) => ({ src, disponible: imageDisponible(src) }))}
      />
    </div>
  );
}
