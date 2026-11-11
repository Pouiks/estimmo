import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour, urlAbsolue } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { getDepartementsResume } from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";
import { REGIONS, hrefRegion, regionDepuisSlug, slugRegion } from "@/lib/seo/regions";

/** Hub région : région > département > commune. ISR quotidien. */
export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; region: string }> };

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: slugRegion(r) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ region: slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const t = await getTranslations({ locale, namespace: "region" });
  const region = regionDepuisSlug(slug);
  if (!region) return { title: t("meta.introuvable") };

  const valeurs = { nom: region.nom, annee: String(new Date().getFullYear()) };
  const title = t("meta.titre", valeurs);
  const description = t("meta.description", valeurs);
  const chemin = hrefRegion(region);
  return {
    title,
    description,
    alternates: alternatesPour(chemin, locale),
    openGraph: openGraphPour({ locale, cheminFr: chemin, title, description }),
  };
}

export default async function RegionPage({ params }: Props) {
  const [{ region: slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const region = regionDepuisSlug(slug);
  if (!region) notFound();

  const [resume, t, tc] = await Promise.all([
    getDepartementsResume().catch(() => []),
    getTranslations({ locale, namespace: "region" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  // Départements de la région présents en base (976 Mayotte n'a ni DVF ni ANIL).
  const departements = region.departements
    .map((code) => ({
      code,
      nom: nomDepartement(code),
      infos: resume.find((r) => r.departement === code),
    }))
    .filter((d) => d.nom && d.infos) as { code: string; nom: string; infos: NonNullable<(typeof resume)[number]> }[];
  if (departements.length === 0) notFound();

  const communes = departements.reduce((n, d) => n + d.infos.nb_communes, 0);
  const ventes = departements.reduce((n, d) => n + d.infos.nb_ventes_12m, 0);
  const annee = String(new Date().getFullYear());

  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
    { nom: t("filAriane.prix"), url: urlAbsolue("/prix-immobilier", locale) },
    { nom: region.nom, url: urlAbsolue(hrefRegion(region), locale) },
  ]);

  return (
    <>
      <JsonLd data={jsonLdBreadcrumb} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          ›{" "}
          <Link href="/prix-immobilier" className="hover:text-foreground">
            {t("filAriane.prix")}
          </Link>{" "}
          › <span className="text-foreground">{region.nom}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("h1", { nom: region.nom, annee })}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("intro", { departements: departements.length, communes, ventes })}
        </p>

        <div className="mt-6">
          <Button size="lg" render={<Link href="/#estimation" />}>
            {t("cta")}
          </Button>
        </div>

        <h2 className="mt-12 text-xl font-bold">{t("parDepartement")}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {departements.map((d) => (
            <li key={d.code}>
              <Link
                href={hrefDepartement(d.code)}
                className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
              >
                <span className="font-medium">
                  {d.nom} <span className="text-muted-foreground">({d.code})</span>
                </span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {t("nbCommunes", { n: d.infos.nb_communes })}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold">{t("autresRegions")}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {REGIONS.filter((r) => r.code !== region.code).map((r) => (
            <li key={r.code}>
              <Link
                href={hrefRegion(r)}
                className="inline-block rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {r.nom}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-muted-foreground">
          {t("mentions", { dvf: tc("mentions.dvf"), disclaimer: tc("mentions.disclaimer") })}
        </p>
      </div>
    </>
  );
}
