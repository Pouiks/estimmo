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
import {
  VisuelsArticle,
  type EmplacementVisuel,
} from "@/components/admin/visuels-article";
import { Button } from "@/components/ui/button";
import { dimensionsImage } from "@/lib/blog/html";
import { imageDisponible, type Visuels } from "@/lib/blog/images";
import { versChampParis } from "@/lib/blog/planning";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Modifier l'article", robots: { index: false } };

interface ImageCorps {
  src: string;
  alt: string;
  caption?: string;
  aiPrompt?: string;
}

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
      "id, slug, titre, meta_title, meta_description, extrait, categorie, auteur, temps_lecture, contenu, contenu_html, image_cover, image_cover_alt, image_cover_largeur, image_cover_hauteur, image_cover_prompt, visuels, faq, articles_lies, mot_cle_principal, mots_cles_secondaires, images, statut, lang, traduction_de, published_at"
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
  const lang: "fr" | "en" = article.lang === "en" ? "en" : "fr";
  const [{ data: autres }, { data: liee }, { data: francais }] = await Promise.all([
    // « À lire aussi » : articles de la même langue
    supabase.from("articles").select("slug, titre").eq("lang", lang).neq("id", id).order("titre"),
    // Version liée : l'original français de cette traduction, ou la version anglaise de cet original
    supabase
      .from("articles")
      .select("id, titre, lang, statut")
      .or(
        article.traduction_de
          ? `id.eq.${article.traduction_de},traduction_de.eq.${id}`
          : `traduction_de.eq.${id}`
      )
      .limit(1)
      .maybeSingle(),
    // Originaux possibles pour une version anglaise
    supabase.from("articles").select("id, titre").eq("lang", "fr").neq("id", id).order("titre"),
  ]);

  const visuels = (article.visuels ?? {}) as Visuels;
  const etat = (cle: string): Pick<EmplacementVisuel, "url" | "source"> =>
    visuels[cle]
      ? { url: visuels[cle], source: "bibliotheque" }
      : imageDisponible(cle)
        ? { url: cle, source: "public" }
        : { url: null, source: null };

  const emplacements: EmplacementVisuel[] = [
    {
      cle: article.image_cover,
      libelle: "Couverture",
      estCouverture: true,
      largeur: article.image_cover_largeur ?? 1200,
      hauteur: article.image_cover_hauteur ?? 630,
      alt: article.image_cover_alt ?? "",
      legende: null,
      prompt: article.image_cover_prompt,
      ...etat(article.image_cover),
    },
    ...((article.images ?? []) as ImageCorps[]).map((im, i) => ({
      cle: im.src,
      libelle: `Image ${i + 1} (corps)`,
      estCouverture: false,
      ...dimensionsImage(article.contenu_html, im.src),
      alt: im.alt,
      legende: im.caption ?? null,
      prompt: im.aiPrompt ?? null,
      ...etat(im.src),
    })),
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
    lang,
    traductionDe: article.traduction_de ?? null,
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

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Images</h2>
          <p className="text-sm text-muted-foreground">
            Envoyez une photo (recadrée au bon format, WebP de moins de 200 Ko, en ligne
            aussitôt) ou choisissez-la dans la bibliothèque. Le texte alternatif et la
            légende sont ceux publiés sur la page ; le titre, la meta description et
            l&apos;extrait se modifient plus bas.
          </p>
        </div>
        <VisuelsArticle articleId={article.id} emplacements={emplacements} />
      </section>

      <ArticleEditorialEditor
        article={data}
        autresArticles={(autres ?? []) as { slug: string; titre: string }[]}
        versionLiee={(liee ?? null) as { id: string; titre: string; lang: string; statut: string } | null}
        articlesFrancais={(francais ?? []) as { id: string; titre: string }[]}
        motsCles={[article.mot_cle_principal, ...(article.mots_cles_secondaires ?? [])].filter(Boolean)}
        imagesResolues={Object.fromEntries(
          emplacements.flatMap((e) => (e.url ? [[e.cle, e.url]] : []))
        )}
      />
    </div>
  );
}
