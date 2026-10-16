import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MENTIONS, SITE } from "@/lib/config";
import { getCommunesByDepartement, getDepartementsResume } from "@/lib/seo/communes";
import {
  DEPARTEMENTS,
  codeDepuisSlug,
  hrefDepartement,
  nomDepartement,
  slugDepartement,
} from "@/lib/seo/departements";
import { euro } from "@/lib/seo/templates";

/** ISR quotidien, comme les pages communes. */
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return Object.keys(DEPARTEMENTS).map((code) => ({
    dept: slugDepartement(code),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ dept: string }>;
}): Promise<Metadata> {
  const { dept } = await params;
  const code = codeDepuisSlug(dept);
  const nom = code ? nomDepartement(code) : null;
  if (!code || !nom) return { title: "Département introuvable" };

  const annee = new Date().getFullYear();
  const title = `Prix immobilier ${nom} (${code}) - Prix au m² par commune ${annee}`;
  const description = `Prix médians au m² de toutes les communes ${nom === "Paris" ? "de" : "du département"} ${nom} (${code}), calculés à partir des ventes réelles DVF, et loyers de référence ANIL. Estimation gratuite en ligne.`;

  return {
    title,
    description,
    alternates: { canonical: hrefDepartement(code) },
    openGraph: { title, description, type: "website" },
  };
}

export default async function DepartementPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;
  const code = codeDepuisSlug(dept);
  const nom = code ? nomDepartement(code) : null;
  if (!code || !nom) notFound();

  // Une seule URL canonique par département (ex. /departement/06 → /06-alpes-maritimes)
  if (dept !== slugDepartement(code)) permanentRedirect(hrefDepartement(code));

  const [communes, resume] = await Promise.all([
    getCommunesByDepartement(code),
    getDepartementsResume(),
  ]);
  if (communes.length === 0) notFound();

  const infos = resume.find((r) => r.departement === code);
  const avecVentes = communes.filter((c) => c.prix_m2_median_appartement || c.prix_m2_median_maison);
  const sansVentes = communes.filter((c) => !c.prix_m2_median_appartement && !c.prix_m2_median_maison);
  const annee = new Date().getFullYear();

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Prix immobilier", item: `${SITE.url}/prix-immobilier` },
      { "@type": "ListItem", position: 3, name: nom, item: `${SITE.url}${hrefDepartement(code)}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Accueil</Link>{" "}
          ›{" "}
          <Link href="/prix-immobilier" className="hover:text-foreground">Prix immobilier</Link>{" "}
          › <span className="text-foreground">{nom} ({code})</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Prix immobilier {nom === "Paris" ? "à" : "dans"} {nom === "Paris" ? "" : "le "}{nom} ({code}) en {annee}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {communes.length.toLocaleString("fr-FR")} communes suivies
          {infos && infos.nb_ventes_12m > 0
            ? `, ${infos.nb_ventes_12m.toLocaleString("fr-FR")} ventes analysées sur les 12 derniers mois de données publiées`
            : ""}
          . Prix médians au m² issus des ventes réellement enregistrées par
          l&apos;État (base DVF) et loyers de référence ANIL.
        </p>

        <div className="mt-6">
          <Button size="lg" render={<Link href="/#estimation" />}>
            Estimer mon bien gratuitement
          </Button>
        </div>

        {avecVentes.length > 0 && (
          <>
            <h2 className="mt-12 text-xl font-bold">
              Prix au m² par commune
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {avecVentes.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/prix-immobilier/${c.slug}`}
                    className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
                  >
                    <span className="font-medium">
                      {c.nom_commune}{" "}
                      <span className="text-muted-foreground">({c.code_postal ?? code})</span>
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {c.prix_m2_median_appartement
                        ? `${euro(c.prix_m2_median_appartement)}/m²`
                        : c.prix_m2_median_maison
                          ? `${euro(c.prix_m2_median_maison)}/m² maison`
                          : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {sansVentes.length > 0 && (
          <>
            <h2 className="mt-12 text-xl font-bold">
              {avecVentes.length > 0
                ? "Autres communes (loyers de référence)"
                : "Communes (loyers de référence)"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Trop peu de ventes récentes pour un prix médian fiable : ces pages
              présentent les loyers ANIL et proposent une estimation personnalisée.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {sansVentes.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/prix-immobilier/${c.slug}`}
                    className="inline-block rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {c.nom_commune}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          {MENTIONS.dvf}. {MENTIONS.anil}. {MENTIONS.disclaimer}
        </p>
      </div>
    </>
  );
}
