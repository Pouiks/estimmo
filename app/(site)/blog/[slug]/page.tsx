import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleContent, extraireTexte } from "@/lib/blog/render";
import { SITE } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400; // + revalidation on-demand à la publication
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("statut", "publie")
    .limit(500);
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

async function getArticle(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, titre, meta_description, contenu, image_cover, published_at, updated_at")
    .eq("slug", slug)
    .eq("statut", "publie")
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article introuvable" };

  const description =
    article.meta_description ?? extraireTexte(article.contenu, 160);
  return {
    title: article.titre,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.titre,
      description,
      type: "article",
      images: article.image_cover ? [article.image_cover] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.titre,
    description: article.meta_description ?? extraireTexte(article.contenu, 160),
    image: article.image_cover ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Person", name: SITE.agent.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: `${SITE.url}/blog/${article.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tous les articles
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {article.titre}
      </h1>
      {article.published_at && (
        <p className="mt-3 text-sm text-muted-foreground">
          Publié le {dateFmt.format(new Date(article.published_at))} par{" "}
          {SITE.agent.name}
        </p>
      )}

      {article.image_cover && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src={article.image_cover}
            alt={article.titre}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-8">
        <ArticleContent contenu={article.contenu} />
      </div>

      <Card className="mt-12 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">
              Un projet de vente ou de location ?
            </p>
            <p className="text-sm text-muted-foreground">
              Estimez votre bien gratuitement en 2 minutes.
            </p>
          </div>
          <Button render={<Link href="/estimation" />}>
            Estimer mon bien <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}
