import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Page anglaise d'un article sans version anglaise publiée : le contenu
 * français est affiché (hors index), avec un lien vers la page française.
 * Ce lien est le Link de next-intl avec `locale="fr"` : il met le cookie
 * NEXT_LOCALE à jour côté client. Un redirect serveur vers /blog/<slug>
 * renverrait en boucle vers /en/blog/<slug> (le proxy suit le cookie « en »).
 */
export async function BandeauLangue({ slug, locale }: { slug: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "blog" });
  return (
    <p
      role="note"
      className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span>{t("seulementFrancais")}</span>
      <Link
        href={`/blog/${slug}`}
        locale="fr"
        className="font-medium underline underline-offset-2 hover:no-underline"
      >
        {t("lireEnFrancais")}
      </Link>
    </p>
  );
}
