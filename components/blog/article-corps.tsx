import { getFormatter, getTranslations } from "next-intl/server";
import { Couverture } from "@/components/blog/couverture";
import { preparerHtml } from "@/lib/blog/html";
import { imageDisponible } from "@/lib/blog/images";
import type { ArticleComplet } from "@/lib/blog/publication";
import { ArticleContent } from "@/lib/blog/render";
import { SITE } from "@/lib/config";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Catégorie, titre, ligne d'auteur, couverture, corps et FAQ d'un article.
 * Partagé par la page publique et l'aperçu de l'admin (hors [locale] : aucun
 * lien localisé ici, locale toujours explicite).
 */
export async function ArticleCorps({
  article,
  locale,
  slugsEnLigne,
}: {
  article: ArticleComplet;
  locale: Locale;
  /** Articles en ligne : les liens vers les autres restent du texte simple. */
  slugsEnLigne: Set<string>;
}) {
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getFormatter({ locale }),
  ]);
  const corpsHtml = article.contenu_html
    ? preparerHtml(article.contenu_html, {
        articleEnLigne: (s) => slugsEnLigne.has(s),
        imageDisponible,
      })
    : null;

  return (
    <>
      {article.categorie && (
        <p className="mt-6 text-xs font-semibold tracking-wider text-primary uppercase">
          {t(`categories.${article.categorie}`)}
        </p>
      )}
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
        {article.titre}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("par", { auteur: article.auteur ?? SITE.agent.name })}
        {" · "}
        <time dateTime={article.published_at}>
          {format.dateTime(new Date(article.published_at), "long")}
        </time>
        {article.temps_lecture && (
          <>
            {" · "}
            {t("lecture", { minutes: article.temps_lecture })}
          </>
        )}
      </p>

      {(article.image_cover || article.contenu_html) && (
        <Couverture
          src={article.image_cover}
          alt={article.image_cover_alt ?? article.titre}
          largeur={article.image_cover_largeur}
          hauteur={article.image_cover_hauteur}
          sizes="(max-width: 768px) 100vw, 720px"
          enTete
          className="mt-6 rounded-xl"
        />
      )}

      {corpsHtml ? (
        <div
          className="article-corps mt-8"
          dangerouslySetInnerHTML={{ __html: corpsHtml }}
        />
      ) : (
        <div className="mt-8">
          <ArticleContent contenu={article.contenu} />
        </div>
      )}

      {article.faq.length > 0 && (
        <section className="article-faq mt-12">
          <h2 className="text-2xl font-bold">{t("faq")}</h2>
          <div className="mt-4">
            {article.faq.map((q) => (
              <details key={q.question}>
                <summary>{q.question}</summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
