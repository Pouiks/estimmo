import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarteArticle } from "@/components/blog/carte-article";
import { FiltreCategories } from "@/components/blog/filtre-categories";
import { CATEGORIES } from "@/lib/blog/categories";
import { articlesEnLigne } from "@/lib/blog/publication";
import { SITE } from "@/lib/config";
import { alternatesPour, openGraphPour } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";

// + revalidation on-demand à la publication (admin) et au passage de la date
// d'un article programmé (cron /api/cron/blog)
export const revalidate = 3600;

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
  const [t, articles] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    articlesEnLigne(locale),
  ]);

  // Seules les catégories qui ont déjà un article en ligne sont proposées.
  const presentes = CATEGORIES.filter((c) => articles.some((a) => a.categorie === c));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("h1", { marque: SITE.name })}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{t("intro")}</p>

      {articles.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {t("vide")}
        </p>
      ) : (
        <FiltreCategories
          libelleGroupe={t("filtrer")}
          libelleVide={t("videCategorie")}
          categories={[
            ["", t("categories.toutes")],
            ...presentes.map((c): [string, string] => [c, t(`categories.${c}`)]),
          ]}
          cartes={articles.map((article) => ({
            slug: article.slug,
            categorie: article.categorie,
            carte: <CarteArticle article={article} locale={locale} />,
          }))}
        />
      )}
    </div>
  );
}
