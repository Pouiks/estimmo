import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleContent, extraireTexte } from "@/lib/blog/render";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { estLocale, type Locale } from "@/lib/i18n/routing";
import {
  cheminLocalise,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400; // + revalidation on-demand à la publication
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Chaque langue ne prérend que ses propres articles. */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  if (!estLocale(params.locale)) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("statut", "publie")
    .eq("lang", params.locale)
    .limit(500);
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

/** Un article n'existe que dans sa langue : /en/blog/<slug-fr> → 404. */
async function getArticle(slug: string, locale: Locale) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, titre, meta_description, contenu, image_cover, published_at, updated_at")
    .eq("slug", slug)
    .eq("statut", "publie")
    .eq("lang", locale)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [article, t] = await Promise.all([
    getArticle(slug, locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) return { title: t("introuvable") };

  const description =
    article.meta_description ?? extraireTexte(article.contenu, 160);
  const chemin = `/blog/${slug}`;
  return {
    title: article.titre,
    description,
    // Pas d'alternates : l'article n'existe que dans sa langue.
    alternates: { canonical: cheminLocalise(chemin, locale) },
    openGraph: {
      ...openGraphPour({
        locale,
        cheminFr: chemin,
        title: article.titre,
        description,
        type: "article",
      }),
      images: article.image_cover ? [article.image_cover] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [article, t] = await Promise.all([
    getArticle(slug, locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.titre,
    description: article.meta_description ?? extraireTexte(article.contenu, 160),
    image: article.image_cover ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    inLanguage: inLanguage(locale),
    author: { "@type": "Person", name: SITE.agent.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: urlAbsolue(`/blog/${article.slug}`, locale),
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
        <ArrowLeft className="size-4" /> {t("tous")}
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {article.titre}
      </h1>
      {article.published_at && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("publie", {
            date: new Date(article.published_at),
            agent: SITE.agent.name,
          })}
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
            <p className="text-lg font-semibold">{t("cta.titre")}</p>
            <p className="text-sm text-muted-foreground">{t("cta.texte")}</p>
          </div>
          <Button render={<Link href="/estimation" />}>
            {t("cta.bouton")} <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}
