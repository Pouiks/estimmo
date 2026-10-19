import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ArticleCorps } from "@/components/blog/article-corps";
import { CarteArticle } from "@/components/blog/carte-article";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { texteDepuisHtml } from "@/lib/blog/html";
import { couvertureAffichable } from "@/lib/blog/images";
import {
  articleEnLigne,
  articlesEnLigne,
  type ArticleCarte,
  type ArticleComplet,
} from "@/lib/blog/publication";
import { extraireTexte } from "@/lib/blog/render";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { estLocale } from "@/lib/i18n/routing";
import {
  cheminLocalise,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";

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
  const [article, t] = await Promise.all([
    articleEnLigne(slug, locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) return { title: t("introuvable") };

  const titre = article.meta_title ?? article.titre;
  const desc = description(article);
  const chemin = `/blog/${slug}`;
  const image = couvertureAffichable(article.image_cover)
    ? [
        {
          url: article.image_cover,
          width: article.image_cover_largeur ?? undefined,
          height: article.image_cover_hauteur ?? undefined,
          alt: article.image_cover_alt ?? article.titre,
        },
      ]
    : undefined;

  return {
    // Gabarit « %s | ESTIMMO » seulement si le titre reste sous ~60 caractères.
    title:
      titre.length + ` | ${SITE.name}`.length <= TITRE_MAX
        ? titre
        : { absolute: titre },
    description: desc,
    // Pas d'alternates hreflang : l'article n'existe que dans sa langue.
    alternates: { canonical: cheminLocalise(chemin, locale) },
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
      card: image ? "summary_large_image" : "summary",
      title: titre,
      description: desc,
      images: image?.map((i) => i.url),
    },
  };
}

/** « À lire aussi » : les articles liés en ligne, complétés par la même catégorie. */
function articlesLies(article: ArticleComplet, enLigne: ArticleCarte[]): ArticleCarte[] {
  const parSlug = new Map(enLigne.map((a) => [a.slug, a]));
  const choisis = article.articles_lies
    .map((s) => parSlug.get(s))
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
  const [article, enLigne, t] = await Promise.all([
    articleEnLigne(slug, locale),
    articlesEnLigne(locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!article) notFound();

  const slugsEnLigne = new Set(enLigne.map((a) => a.slug));
  // Les articles éditoriaux portent déjà leur appel à l'action en fin de corps.
  const ctaDansCorps = !!article.contenu_html?.includes('class="cta-estimation"');
  const auteur = article.auteur ?? SITE.agent.name;
  const lies = articlesLies(article, enLigne);
  const url = urlAbsolue(`/blog/${article.slug}`, locale);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.titre,
      description: description(article),
      image: couvertureAffichable(article.image_cover)
        ? {
            "@type": "ImageObject",
            url: new URL(article.image_cover, SITE.url).toString(),
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
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("filAriane.accueil"), item: urlAbsolue("/", locale) },
        { "@type": "ListItem", position: 2, name: t("filAriane.blog"), item: urlAbsolue("/blog", locale) },
        { "@type": "ListItem", position: 3, name: article.titre, item: url },
      ],
    },
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
        <script
          type="application/ld+json"
          // « < » échappé : une FAQ saisie dans l'admin ne peut pas fermer la balise.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />

        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          ›{" "}
          <Link href="/blog" className="hover:text-foreground">
            {t("filAriane.blog")}
          </Link>
        </nav>

        <ArticleCorps article={article} locale={locale} slugsEnLigne={slugsEnLigne} />

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
