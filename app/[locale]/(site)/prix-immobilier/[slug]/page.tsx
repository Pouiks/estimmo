import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight, Building2, Home, LineChart, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { DEFAULT_LOCALE } from "@/lib/i18n/routing";
import {
  alternatesPour,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import {
  getCommuneBySlug,
  getCommunesVoisines,
  getLoyersByInsee,
  getTopCommunes,
} from "@/lib/seo/communes";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";
import {
  evolutionTexte,
  faqCommune,
  formatEvo,
  introCommune,
} from "@/lib/seo/textes";

/** ISR : revalidation quotidienne, pages hors top 2000 générées à la demande. */
export const revalidate = 86400;
export const dynamicParams = true;

const PRERENDER_COUNT = Number(process.env.SEO_PRERENDER_COUNT ?? 2000);

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  // Seules les pages françaises sont prérendues au build ; les pages /en
  // sont générées à la demande (ISR) à la première visite.
  if (params.locale !== DEFAULT_LOCALE) return [];
  // Approximation « communes les plus peuplées » : volume de ventes DVF.
  const communes = await getTopCommunes(PRERENDER_COUNT);
  return communes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [stats, t, format] = await Promise.all([
    getCommuneBySlug(slug),
    getTranslations({ locale, namespace: "commune" }),
    getFormatter({ locale }),
  ]);
  if (!stats) return { title: t("meta.introuvable") };

  const nom = stats.nom_commune;
  const annee = String(new Date(stats.updated_at).getFullYear());
  const cp = stats.code_postal ?? stats.departement;
  const title = t("meta.titre", { nom, cp, annee });
  const description = stats.prix_m2_median_appartement
    ? t("meta.descriptionVentes", {
        nom,
        appart: format.number(stats.prix_m2_median_appartement, "currency"),
        aMaison: String(Boolean(stats.prix_m2_median_maison)),
        maison: stats.prix_m2_median_maison
          ? format.number(stats.prix_m2_median_maison, "currency")
          : "",
      })
    : t("meta.descriptionLoyers", { nom });
  const chemin = `/prix-immobilier/${slug}`;

  return {
    title,
    description,
    alternates: alternatesPour(chemin, locale),
    openGraph: openGraphPour({
      locale,
      cheminFr: chemin,
      title,
      description,
      sousTitre: description,
    }),
  };
}

export default async function CommunePage({ params }: Props) {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const stats = await getCommuneBySlug(slug);
  if (!stats) notFound();

  const [loyers, voisines, t, tc, format] = await Promise.all([
    getLoyersByInsee(stats.code_insee),
    getCommunesVoisines(stats.departement, stats.code_insee),
    getTranslations({ locale, namespace: "commune" }),
    getTranslations({ locale, namespace: "common" }),
    getFormatter({ locale }),
  ]);

  const nom = stats.nom_commune;
  const cp = stats.code_postal ?? stats.departement;
  const annee = new Date(stats.updated_at).getFullYear();
  const na = tc("na");
  const euroM2 = (n: number) => `${format.number(n, "currency")}/m²`;
  const faq = faqCommune(stats, loyers, annee, t);
  const evolution = evolutionTexte(stats, t, na);
  const aDesVentes = Boolean(
    stats.prix_m2_median_appartement || stats.prix_m2_median_maison
  );
  const chemin = `/prix-immobilier/${slug}`;
  const url = urlAbsolue(chemin, locale);
  const departement = nomDepartement(stats.departement);

  const jsonLdDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("jsonLd.datasetNom", { nom, cp }),
    description: t("jsonLd.datasetDescription", { nom }),
    url,
    inLanguage: inLanguage(locale),
    creator: { "@type": "Organization", name: SITE.name },
    isBasedOn:
      "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    spatialCoverage: { "@type": "Place", name: nom },
    variableMeasured: [
      stats.prix_m2_median_appartement && {
        "@type": "PropertyValue",
        name: t("jsonLd.medianAppart"),
        value: stats.prix_m2_median_appartement,
        unitText: "EUR/m2",
      },
      stats.prix_m2_median_maison && {
        "@type": "PropertyValue",
        name: t("jsonLd.medianMaison"),
        value: stats.prix_m2_median_maison,
        unitText: "EUR/m2",
      },
    ].filter(Boolean),
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: inLanguage(locale),
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.reponse },
    })),
  };

  // Reflète le fil d'Ariane visible en haut de page.
  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
    { nom: t("filAriane.prix"), url: urlAbsolue("/prix-immobilier", locale) },
    ...(departement
      ? [{ nom: departement, url: urlAbsolue(hrefDepartement(stats.departement), locale) }]
      : []),
    { nom, url },
  ]);

  return (
    <>
      <JsonLd data={[jsonLdDataset, jsonLdFaq, jsonLdBreadcrumb]} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          ›{" "}
          <Link href="/prix-immobilier" className="hover:text-foreground">
            {t("filAriane.prix")}
          </Link>{" "}
          {departement && (
            <>
              ›{" "}
              <Link
                href={hrefDepartement(stats.departement)}
                className="hover:text-foreground"
              >
                {departement}
              </Link>{" "}
            </>
          )}
          › <span className="text-foreground">{nom}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("h1", { nom })}{" "}
          <span className="text-muted-foreground">({cp})</span>
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          {introCommune(stats, t)}
        </p>

        {/* Chiffres clés */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <Building2 className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.appart")}
              </p>
              <p className="text-2xl font-bold">
                {stats.prix_m2_median_appartement
                  ? euroM2(stats.prix_m2_median_appartement)
                  : na}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Home className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.maison")}
              </p>
              <p className="text-2xl font-bold">
                {stats.prix_m2_median_maison
                  ? euroM2(stats.prix_m2_median_maison)
                  : na}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Receipt className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.ventes")}
              </p>
              <p className="text-2xl font-bold">
                {format.number(stats.nb_ventes_12m, "integer")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <LineChart className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.evolution")}
              </p>
              <p className="text-2xl font-bold">
                {formatEvo(stats.evolution_1an_pct, t, na)}
              </p>
            </CardContent>
          </Card>
        </div>

        {aDesVentes && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("chiffres.maj", {
              dvf: tc("mentions.dvf"),
              date: new Date(stats.updated_at),
            })}
          </p>
        )}

        {evolution && <p className="mt-6">{evolution}</p>}

        {/* Loyers */}
        {loyers && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("loyers.titre", { nom })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.appart")}
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_appartement
                      ? t("loyers.parM2", { valeur: loyers.loyer_m2_appartement })
                      : na}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.typologies")}
                  </p>
                  <p className="text-xl font-bold">
                    {t("loyers.fourchette", {
                      bas: loyers.loyer_m2_appt_t1_t2
                        ? format.number(loyers.loyer_m2_appt_t1_t2, "decimal1")
                        : na,
                      haut: loyers.loyer_m2_appt_t3_plus
                        ? format.number(loyers.loyer_m2_appt_t3_plus, "decimal1")
                        : na,
                    })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.maison")}
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_maison
                      ? t("loyers.parM2", { valeur: loyers.loyer_m2_maison })
                      : na}
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("loyers.note", {
                anil: tc("mentions.anil"),
                millesime: String(loyers.millesime),
              })}
            </p>
          </section>
        )}

        {/* CTA estimation */}
        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t("cta.titre", { nom })}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("cta.texte")}
              </p>
            </div>
            <Button size="lg" render={<Link href="/estimation" />}>
              {t("cta.bouton")} <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t("faq.titre", { nom })}
          </h2>
          <div className="mt-4 space-y-6">
            {faq.map((f) => (
              <div key={f.question}>
                <h3 className="font-semibold">{f.question}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.reponse}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Maillage interne */}
        {voisines.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="text-lg font-semibold">
              {t("maillage.titre", { code: stats.departement })}
            </h2>
            {departement && (
              <p className="mt-1 text-sm text-muted-foreground">
                <Link
                  href={hrefDepartement(stats.departement)}
                  className="text-primary underline underline-offset-4"
                >
                  {t("maillage.toutes", {
                    nom: departement,
                    code: stats.departement,
                    paris: String(departement === "Paris"),
                  })}
                </Link>
              </p>
            )}
            <ul className="mt-3 flex flex-wrap gap-2">
              {voisines.map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/prix-immobilier/${v.slug}`}
                    className="inline-block rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {v.nom_commune}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          {tc("mentions.disclaimer")}
        </p>
      </div>
    </>
  );
}
