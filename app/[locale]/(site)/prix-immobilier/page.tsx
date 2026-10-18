import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { getDepartementsResume, getTopCommunes } from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "prix" });
  const title = t("meta.titre");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: alternatesPour("/prix-immobilier", locale),
    openGraph: openGraphPour({
      locale,
      cheminFr: "/prix-immobilier",
      title,
      description,
    }),
  };
}

export default async function PrixImmobilierIndexPage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [communes, departements, t, tc, format] = await Promise.all([
    getTopCommunes(100),
    getDepartementsResume().catch(() => []),
    getTranslations({ locale, namespace: "prix" }),
    getTranslations({ locale, namespace: "common" }),
    getFormatter({ locale }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("h1")}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("intro")}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" render={<Link href="/estimation" />}>
          {t("estimer")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          render={<Link href="/barometre-immobilier" />}
        >
          {t("barometre")}
        </Button>
      </div>

      <h2 className="mt-12 text-xl font-bold">{t("actifs")}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {communes.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/prix-immobilier/${c.slug}`}
              className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
            >
              <span className="font-medium">
                {c.nom_commune}{" "}
                <span className="text-muted-foreground">({c.code_postal})</span>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                {c.prix_m2_median_appartement
                  ? t("prixAppart", {
                      prix: format.number(c.prix_m2_median_appartement, "currency"),
                    })
                  : t("loyers")}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {departements.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-bold">{t("parDepartement")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("parDepartementTexte")}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {departements
              .filter((d) => nomDepartement(d.departement))
              .map((d) => (
                <li key={d.departement}>
                  <Link
                    href={hrefDepartement(d.departement)}
                    className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
                  >
                    <span className="font-medium">
                      {nomDepartement(d.departement)}{" "}
                      <span className="text-muted-foreground">
                        ({d.departement})
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {t("nbCommunes", { n: d.nb_communes })}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        {t("mentions", { dvf: tc("mentions.dvf"), anil: tc("mentions.anil") })}
      </p>
    </div>
  );
}
