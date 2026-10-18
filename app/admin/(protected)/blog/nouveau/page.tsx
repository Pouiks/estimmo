import { ArticleEditor } from "@/components/admin/article-editor";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata = { title: "Nouvel article", robots: { index: false } };

export default async function NouvelArticlePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nouvel article</h1>
      <ArticleEditor article={null} />
    </div>
  );
}
