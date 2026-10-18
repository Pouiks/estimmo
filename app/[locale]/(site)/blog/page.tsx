import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { extraireTexte } from "@/lib/blog/render";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400; // + revalidation on-demand à la publication

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "blog" });
  const title = t("meta.titre");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: alternatesPour("/blog", locale),
    openGraph: openGraphPour({ locale, cheminFr: "/blog", title, description }),
  };
}

export default async function BlogPage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, format, { data: articles }] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getFormatter({ locale }),
    createAdminClient()
      .from("articles")
      .select("slug, titre, meta_description, contenu, image_cover, published_at")
      .eq("statut", "publie")
      .eq("lang", locale)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("h1", { marque: SITE.name })}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("intro")}</p>

      {(articles ?? []).length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {t("vide")}
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {(articles ?? []).map((article) => (
            <Card key={article.slug} className="overflow-hidden pt-0">
              <Link href={`/blog/${article.slug}`} className="group block">
                {article.image_cover ? (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={article.image_cover}
                      alt={article.titre}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-primary/5 text-2xl font-bold text-primary/40">
                    {SITE.name}
                  </div>
                )}
                <CardContent className="pt-4">
                  {article.published_at && (
                    <p className="text-xs text-muted-foreground">
                      {format.dateTime(new Date(article.published_at), "long")}
                    </p>
                  )}
                  <h2 className="mt-1 text-lg font-semibold group-hover:underline">
                    {article.titre}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {article.meta_description ??
                      extraireTexte(article.contenu, 160)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
