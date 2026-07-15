import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Home, LineChart, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MENTIONS, SITE } from "@/lib/config";
import {
  getCommuneBySlug,
  getCommunesVoisines,
  getLoyersByInsee,
  getTopCommunes,
} from "@/lib/seo/communes";
import {
  euro,
  evolutionTexte,
  faqCommune,
  formatEvo,
  introCommune,
} from "@/lib/seo/templates";

/** ISR : revalidation quotidienne, pages hors top 2000 générées à la demande. */
export const revalidate = 86400;
export const dynamicParams = true;

const PRERENDER_COUNT = Number(process.env.SEO_PRERENDER_COUNT ?? 2000);

export async function generateStaticParams() {
  // Approximation « communes les plus peuplées » : volume de ventes DVF.
  const communes = await getTopCommunes(PRERENDER_COUNT);
  return communes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stats = await getCommuneBySlug(slug);
  if (!stats) return { title: "Commune introuvable" };

  const annee = new Date(stats.updated_at).getFullYear();
  const cp = stats.code_postal ?? stats.departement;
  const title = `Prix immobilier à ${stats.nom_commune} (${cp}) - Prix au m² ${annee}`;
  const description = stats.prix_m2_median_appartement
    ? `Prix médian à ${stats.nom_commune} : ${euro(stats.prix_m2_median_appartement)}/m² en appartement${stats.prix_m2_median_maison
      ? `, ${euro(stats.prix_m2_median_maison)}/m² en maison`
      : ""
    }. Données officielles DVF, loyers ANIL et estimation gratuite en ligne.`
    : `Marché immobilier de ${stats.nom_commune} : loyers de référence ANIL et estimation gratuite de votre bien par une conseillère locale.`;

  return {
    title,
    description,
    alternates: { canonical: `/prix-immobilier/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CommunePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stats = await getCommuneBySlug(slug);
  if (!stats) notFound();

  const [loyers, voisines] = await Promise.all([
    getLoyersByInsee(stats.code_insee),
    getCommunesVoisines(stats.departement, stats.code_insee),
  ]);

  const annee = new Date(stats.updated_at).getFullYear();
  const faq = faqCommune(stats, loyers, annee);
  const evolution = evolutionTexte(stats);
  const aDesVentes = Boolean(
    stats.prix_m2_median_appartement || stats.prix_m2_median_maison
  );

  const jsonLdDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Prix immobilier à ${stats.nom_commune} (${stats.code_postal ?? stats.departement})`,
    description: `Prix médians au m² et volume de ventes immobilières à ${stats.nom_commune}, agrégés depuis la base publique DVF (DGFiP).`,
    url: `${SITE.url}/prix-immobilier/${slug}`,
    creator: { "@type": "Organization", name: SITE.name },
    isBasedOn: "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    spatialCoverage: { "@type": "Place", name: stats.nom_commune },
    variableMeasured: [
      stats.prix_m2_median_appartement && {
        "@type": "PropertyValue",
        name: "Prix médian au m² - appartement",
        value: stats.prix_m2_median_appartement,
        unitText: "EUR/m2",
      },
      stats.prix_m2_median_maison && {
        "@type": "PropertyValue",
        name: "Prix médian au m² - maison",
        value: stats.prix_m2_median_maison,
        unitText: "EUR/m2",
      },
    ].filter(Boolean),
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.reponse },
    })),
  };

  // Reflète le fil d'Ariane visible en haut de page.
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Prix immobilier",
        item: `${SITE.url}/prix-immobilier`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: stats.nom_commune,
        item: `${SITE.url}/prix-immobilier/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdDataset) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>{" "}
          ›{" "}
          <Link href="/prix-immobilier" className="hover:text-foreground">
            Prix immobilier
          </Link>{" "}
          › <span className="text-foreground">{stats.nom_commune}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Prix immobilier à {stats.nom_commune}{" "}
          <span className="text-muted-foreground">
            ({stats.code_postal ?? stats.departement})
          </span>
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          {introCommune(stats)}
        </p>

        {/* Chiffres clés */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <Building2 className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Appartement - prix médian
              </p>
              <p className="text-2xl font-bold">
                {stats.prix_m2_median_appartement
                  ? `${euro(stats.prix_m2_median_appartement)}/m²`
                  : "n.d."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Home className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Maison - prix médian
              </p>
              <p className="text-2xl font-bold">
                {stats.prix_m2_median_maison
                  ? `${euro(stats.prix_m2_median_maison)}/m²`
                  : "n.d."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Receipt className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Ventes analysées (12 mois)
              </p>
              <p className="text-2xl font-bold">
                {stats.nb_ventes_12m.toLocaleString("fr-FR")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <LineChart className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Évolution sur 1 an
              </p>
              <p className="text-2xl font-bold">
                {formatEvo(stats.evolution_1an_pct)}
              </p>
            </CardContent>
          </Card>
        </div>

        {aDesVentes && (
          <p className="mt-3 text-xs text-muted-foreground">
            {MENTIONS.dvf} - statistiques agrégées sur les 12 derniers mois de
            données publiées, mises à jour le{" "}
            {new Date(stats.updated_at).toLocaleDateString("fr-FR")}.
          </p>
        )}

        {evolution && <p className="mt-6">{evolution}</p>}

        {/* Loyers */}
        {loyers && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              Quel loyer à {stats.nom_commune} ?
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Appartement (toutes typologies)
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_appartement
                      ? `${loyers.loyer_m2_appartement.toLocaleString("fr-FR")} €/m²`
                      : "n.d."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Studio / T2 - T3 et plus
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_appt_t1_t2?.toLocaleString("fr-FR") ?? "n.d."}{" "}
                    <span className="text-sm font-normal">-</span>{" "}
                    {loyers.loyer_m2_appt_t3_plus?.toLocaleString("fr-FR") ?? "n.d."}{" "}
                    €/m²
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Maison</p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_maison
                      ? `${loyers.loyer_m2_maison.toLocaleString("fr-FR")} €/m²`
                      : "n.d."}
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {MENTIONS.anil} (millésime {loyers.millesime}). Loyers d'annonce
              charges comprises.
            </p>
          </section>
        )}

        {/* CTA estimation */}
        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Combien vaut votre bien à {stats.nom_commune} ?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Estimation gratuite en 2 minutes, basée sur les ventes réelles
                de votre quartier - résultat immédiat.
              </p>
            </div>
            <Button size="lg" render={<Link href="/estimation" />}>
              Estimer mon bien <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Questions fréquentes - {stats.nom_commune}
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
              Prix immobilier dans le département ({stats.departement})
            </h2>
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
          {MENTIONS.disclaimer}
        </p>
      </div>
    </>
  );
}
