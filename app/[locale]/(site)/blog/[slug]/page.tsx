import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ArticleCorps } from "@/components/blog/article-corps";
import { CarteArticle } from "@/components/blog/carte-article";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { texteDepuisHtml } from "@/lib/blog/html";
import { resoudreImage } from "@/lib/blog/images";
import {
  articleEnLigne,
  articlesEnLigne,
  versionsEnLigne,
  type ArticleCarte,
  type ArticleComplet,
} from "@/lib/blog/publication";
import { extraireTexte } from "@/lib/blog/render";
import {
  cheminDeRepli,
  cheminsParLangue,
  correspondances,
} from "@/lib/blog/traductions";
import { SITE } from "@/lib/config";
import { Link, redirect } from "@/lib/i18n/navigation";
import { estLocale } from "@/lib/i18n/routing";
import {
  alternatesPourChemins,
  imageOgPour,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";

// + revalidation on-demand : publication depuis l'admin, et cron quotidien
// quand un article programmé passe sa date (liens internes, « À lire aussi »).
export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Longueur au-delà de laquelle « | ESTIMMO » ferait tronquer le titre par Google. */
const TITRE_MAX = 60;

/** Chaque langue ne prérend que ses propres articles en ligne. */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  if (!estLocale(params.locale)) return [];
  const articles = await articlesEnLigne(params.locale);
  return articles.map((a) => ({ slug: a.slug }));
}

function description(article: ArticleCarte): string {
  return (
    article.meta_description ??
    (article.contenu_html
      ? texteDepuisHtml(article.contenu_html, 160)
      : extraireTexte(article.contenu, 160))
  );
}

/** dateModified : la dernière modification éditoriale, jamais avant la publication. */
function dateModification(article: ArticleComplet): string {
  return article.updated_at > article.published_at
    ? article.updated_at
    : article.published_at;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [article, versions, t] = await Promise.all([
    articleEnLigne(slug, locale),
    versionsEnLigne(),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) return { title: t("introuvable") };

  const titre = article.meta_title ?? article.titre;
  const desc = description(article);
  const chemin = `/blog/${slug}`;
  const cover = resoudreImage(article.image_cover, article.visuels);
  const image = cover
    ? [
        {
          url: cover,
          width: article.image_cover_largeur ?? undefined,
          height: article.image_cover_hauteur ?? undefined,
          alt: article.image_cover_alt ?? article.titre,
        },
      ]
    : imageOgPour({ locale, title: titre });

  return {
    // Gabarit « %s | ESTIMMO » seulement si le titre reste sous ~60 caractères.
    title:
      titre.length + ` | ${SITE.name}`.length <= TITRE_MAX
        ? titre
        : { absolute: titre },
    description: desc,
    // hreflang vers la version traduite si elle est en ligne, sinon canonique seule.
    alternates: alternatesPourChemins(cheminsParLangue(article, locale, versions), locale),
    authors: [{ name: article.auteur ?? SITE.agent.name }],
    openGraph: {
      ...openGraphPour({ locale, cheminFr: chemin, title: titre, description: desc }),
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: dateModification(article),
      authors: [article.auteur ?? SITE.agent.name],
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description: desc,
      images: image,
    },
  };
}

/**
 * « À lire aussi » : les articles liés en ligne (ou leur version dans la
 * langue de la page, pour un article copié depuis l'original), complétés par
 * la même catégorie.
 */
function articlesLies(
  article: ArticleComplet,
  enLigne: ArticleCarte[],
  traduits: Map<string, string>
): ArticleCarte[] {
  const parSlug = new Map(enLigne.map((a) => [a.slug, a]));
  const choisis = article.articles_lies
    .map((s) => parSlug.get(s) ?? parSlug.get(traduits.get(s) ?? ""))
    .filter((a): a is ArticleCarte => !!a && a.slug !== article.slug);
  const complements = [
    ...enLigne.filter((a) => a.categorie && a.categorie === article.categorie),
    ...enLigne,
  ];
  for (const a of complements) {
    if (choisis.length >= 3) break;
    if (a.slug !== article.slug && !choisis.includes(a)) choisis.push(a);
  }
  return choisis.slice(0, 3);
}

export default async function ArticlePage({ params }: Props) {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [article, enLigne, versions, t] = await Promise.all([
    articleEnLigne(slug, locale),
    articlesEnLigne(locale),
    versionsEnLigne(),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) {
    // Article d'une autre langue (bascule FR/EN) : sa version dans cette
    // langue si elle est en ligne, sinon la liste du blog ; inconnu → 404.
    const repli = cheminDeRepli(slug, locale, versions);
    if (repli) redirect({ href: repli, locale });
    notFound();
  }

  const slugsEnLigne = new Set(enLigne.map((a) => a.slug));
  const traduits = correspondances(versions, locale);
  // Les articles éditoriaux portent déjà leur appel à l'action en fin de corps.
  const ctaDansCorps = !!article.contenu_html?.includes('class="cta-estimation"');
  const auteur = article.auteur ?? SITE.agent.name;
  const lies = articlesLies(article, enLigne, traduits);
  const url = urlAbsolue(`/blog/${article.slug}`, locale);
  const cover = resoudreImage(article.image_cover, article.visuels);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.titre,
      description: description(article),
      image: cover
        ? {
            "@type": "ImageObject",
            url: new URL(cover, SITE.url).toString(),
            width: article.image_cover_largeur ?? undefined,
            height: article.image_cover_hauteur ?? undefined,
          }
        : undefined,
      datePublished: article.published_at,
      dateModified: dateModification(article),
      inLanguage: inLanguage(locale),
      articleSection: article.categorie ? t(`categories.${article.categorie}`) : undefined,
      author: { "@type": "Person", name: auteur },
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        url: SITE.url,
        logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` },
      },
      mainEntityOfPage: url,
    },
    jsonLdFilAriane([
      { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
      { nom: t("filAriane.blog"), url: urlAbsolue("/blog", locale) },
      { nom: article.titre, url },
    ]),
    ...(article.faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faq.map((q) => ({
              "@type": "Question",
              name: q.question,
              acceptedAnswer: { "@type": "Answer", text: q.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <article className="mx-auto max-w-[720px] px-4 py-10 sm:py-14">
        <JsonLd data={jsonLd} />

        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          ›{" "}
          <Link href="/blog" className="hover:text-foreground">
            {t("filAriane.blog")}
          </Link>
        </nav>

        <ArticleCorps
          article={article}
          locale={locale}
          slugsEnLigne={slugsEnLigne}
          correspondances={traduits}
        />

        {!ctaDansCorps && (
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
        )}
      </article>

      {lies.length > 0 && (
        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-2xl font-bold">{t("aLireAussi")}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lies.map((a) => (
                <CarteArticle key={a.slug} article={a} locale={locale} titreNiveau="h3" />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
