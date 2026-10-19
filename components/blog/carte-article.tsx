import { getTranslations } from "next-intl/server";
import { Couverture } from "@/components/blog/couverture";
import { resoudreImage } from "@/lib/blog/images";
import { extraireTexte } from "@/lib/blog/render";
import type { ArticleCarte } from "@/lib/blog/publication";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

/** Carte d'article : liste /blog et « À lire aussi ». */
export async function CarteArticle({
  article,
  locale,
  titreNiveau = "h2",
}: {
  article: ArticleCarte;
  locale: Locale;
  titreNiveau?: "h2" | "h3";
}) {
  const t = await getTranslations({ locale, namespace: "blog" });
  const Titre = titreNiveau;
  const extrait =
    article.extrait ?? article.meta_description ?? extraireTexte(article.contenu, 160);

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <Couverture
        src={resoudreImage(article.image_cover, article.visuels)}
        alt={article.image_cover_alt ?? article.titre}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        className="transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div className="flex flex-1 flex-col p-5">
        {article.categorie && (
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            {t(`categories.${article.categorie}`)}
          </span>
        )}
        <Titre className="mt-2 text-lg leading-snug font-semibold group-hover:underline">
          {article.titre}
        </Titre>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{extrait}</p>
        {article.temps_lecture && (
          <p className="mt-4 text-xs text-muted-foreground">
            {t("lecture", { minutes: article.temps_lecture })}
          </p>
        )}
      </div>
    </Link>
  );
}
