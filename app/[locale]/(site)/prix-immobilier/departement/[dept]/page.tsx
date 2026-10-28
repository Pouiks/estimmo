import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { Link, permanentRedirect } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour, urlAbsolue } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import {
  getCommunesByDepartement,
  getDepartementsResume,
} from "@/lib/seo/communes";
import {
  DEPARTEMENTS,
  codeDepuisSlug,
  hrefDepartement,
  nomDepartement,
  slugDepartement,
} from "@/lib/seo/departements";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";

/** ISR quotidien, comme les pages communes. */
export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; dept: string }> };

export async function generateStaticParams() {
  return Object.keys(DEPARTEMENTS).map((code) => ({
    dept: slugDepartement(code),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ dept }, locale] = await Promise.all([params, localeDeParams(params)]);
  const t = await getTranslations({ locale, namespace: "departement" });
  const code = codeDepuisSlug(dept);
  const nom = code ? nomDepartement(code) : null;
  if (!code || !nom) return { title: t("meta.introuvable") };

  const valeurs = {
    nom,
    code,
    annee: String(new Date().getFullYear()),
    paris: String(nom === "Paris"),
  };
  const title = t("meta.titre", valeurs);
  const description = t("meta.description", valeurs);
  const chemin = hrefDepartement(code);

  return {
    title,
    description,
    alternates: alternatesPour(chemin, locale),
    openGraph: openGraphPour({ locale, cheminFr: chemin, title, description }),
  };
}

export default async function DepartementPage({ params }: Props) {
  const [{ dept }, locale] = await Promise.all([params, localeDeParams(params)]);
  const code = codeDepuisSlug(dept);
  const nom = code ? nomDepartement(code) : null;
  if (!code || !nom) notFound();

  // Une seule URL canonique par département (ex. /departement/06 → /06-alpes-maritimes)
  if (dept !== slugDepartement(code)) {
    permanentRedirect({ href: hrefDepartement(code), locale });
  }

  const [communes, resume, t, tc, format] = await Promise.all([
    getCommunesByDepartement(code),
    getDepartementsResume(),
    getTranslations({ locale, namespace: "departement" }),
    getTranslations({ locale, namespace: "common" }),
    getFormatter({ locale }),
  ]);
  if (communes.length === 0) notFound();

  const infos = resume.find((r) => r.departement === code);
  const avecVentes = communes.filter(
    (c) => c.prix_m2_median_appartement || c.prix_m2_median_maison
  );
  const sansVentes = communes.filter(
    (c) => !c.prix_m2_median_appartement && !c.prix_m2_median_maison
  );
  const annee = String(new Date().getFullYear());
  const euro = (n: number) => format.number(n, "currency");

  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
    { nom: t("filAriane.prix"), url: urlAbsolue("/prix-immobilier", locale) },
    { nom, url: urlAbsolue(hrefDepartement(code), locale) },
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
          ›{" "}
          <span className="text-foreground">
            {nom} ({code})
          </span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("h1", { nom, code, annee, paris: String(nom === "Paris") })}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("intro", {
            communes: communes.length,
            ventes: infos?.nb_ventes_12m ?? 0,
          })}
        </p>

        <div className="mt-6">
          <Button size="lg" render={<Link href="/#estimation" />}>
            {t("cta")}
          </Button>
        </div>

        {avecVentes.length > 0 && (
          <>
            <h2 className="mt-12 text-xl font-bold">{t("parCommune")}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {avecVentes.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/prix-immobilier/${c.slug}`}
                    className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
                  >
                    <span className="font-medium">
                      {c.nom_commune}{" "}
                      <span className="text-muted-foreground">
                        ({c.code_postal ?? code})
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {c.prix_m2_median_appartement
                        ? t("prixAppart", { prix: euro(c.prix_m2_median_appartement) })
                        : c.prix_m2_median_maison
                          ? t("prixMaison", { prix: euro(c.prix_m2_median_maison) })
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
              {avecVentes.length > 0 ? t("autresCommunes") : t("communesLoyers")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("tropPeu")}</p>
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
          {t("mentions", {
            dvf: tc("mentions.dvf"),
            anil: tc("mentions.anil"),
            disclaimer: tc("mentions.disclaimer"),
          })}
        </p>
      </div>
    </>
  );
}
