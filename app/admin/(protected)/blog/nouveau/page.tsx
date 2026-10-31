import {
  ArticleEditorialEditor,
  type ArticleEditorialData,
} from "@/components/admin/article-editorial-editor";
import { versChampParis } from "@/lib/blog/planning";
import { SITE } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Nouvel article", robots: { index: false } };

/**
 * Création d'un article dans l'éditeur bilingue (mêmes onglets Français /
 * English, même enregistrement que la modification). L'article naît en
 * brouillon ; ses images se déposent ensuite depuis sa page (section Images).
 */
export default async function NouvelArticlePage() {
  await requireAdmin();

  const { data: autres } = await createAdminClient()
    .from("articles")
    .select("slug, titre")
    .order("titre");

  const vide: ArticleEditorialData = {
    titre: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    extrait: "",
    categorie: "estimation",
    auteur: SITE.agent.name,
    tempsLecture: 5,
    publishedAt: versChampParis(new Date()),
    statut: "brouillon",
    contenuHtml: "",
    faq: [],
    articlesLies: [],
    traductions: {},
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel article</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rédigez la version française (la version anglaise peut attendre : onglet English),
          puis créez l&apos;article pour déposer ses images.
        </p>
      </div>
      <ArticleEditorialEditor
        article={vide}
        autresArticles={(autres ?? []) as { slug: string; titre: string }[]}
        motsCles={[]}
        imageCoverAlt=""
        imagesResolues={{}}
      />
    </div>
  );
}
