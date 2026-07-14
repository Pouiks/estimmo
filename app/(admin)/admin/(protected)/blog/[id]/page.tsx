import { notFound } from "next/navigation";
import {
  ArticleEditor,
  type ArticleData,
} from "@/components/admin/article-editor";
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
    .select("id, slug, titre, meta_description, contenu, image_cover, statut")
    .eq("id", id)
    .maybeSingle();

  if (!article) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Modifier l'article</h1>
      <ArticleEditor article={article as ArticleData} />
    </div>
  );
}
