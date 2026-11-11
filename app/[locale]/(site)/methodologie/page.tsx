import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config";
import {
  MIN_COMPARABLES,
  MOIS_MAX_MUTATION,
  RATIO_SURFACE_MAX,
  RATIO_SURFACE_MIN,
  RAYONS_M,
  SEUIL_ECRETAGE,
} from "@/lib/estimation/vente";
import { Link } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour, urlAbsolue } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { SEUIL_VENTES_12M, SEUIL_VENTES_36M } from "@/lib/seo/indexation";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";
import { RATIO_CARREZ_MAX, RATIO_CARREZ_MIN } from "@/scripts/dvf-clean";

type Props = { params: Promise<{ locale: string }> };

const CHEMIN = "/methodologie";
const SOURCES = ["dvf", "anil", "insee", "geo"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "confiance" });
  const title = t("methode.meta.titre");
  const description = t("methode.meta.description", { marque: SITE.name });
  return {
    title,
    description,
    alternates: alternatesPour(CHEMIN, locale),
    openGraph: openGraphPour({ locale, cheminFr: CHEMIN, title, description }),
  };
}

export default async function MethodologiePage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, tn, format] = await Promise.all([
    getTranslations({ locale, namespace: "confiance" }),
    getTranslations({ locale, namespace: "nav" }),
    getFormatter({ locale }),
  ]);

  // Les constantes du moteur sont injectées : la page ne peut pas diverger du code.
  const rayons = format.list(
    RAYONS_M.map((r) => `${format.number(r, "integer")} m`),
    { type: "conjunction" }
  );
  const valeurs = {
    marque: SITE.name,
    agent: SITE.agent.name,
    ratioMin: format.number(RATIO_SURFACE_MIN, "decimal1"),
    ratioMax: format.number(RATIO_SURFACE_MAX, "decimal1"),
    mois: String(MOIS_MAX_MUTATION),
    rayons,
    minComparables: String(MIN_COMPARABLES),
    seuilEcretage: String(SEUIL_ECRETAGE),
    seuil12: String(SEUIL_VENTES_12M),
    seuil36: String(SEUIL_VENTES_36M),
  };
  const valeursCarrez = {
    ...valeurs,
    ratioMin: format.number(RATIO_CARREZ_MIN, "decimal1"),
    ratioMax: format.number(RATIO_CARREZ_MAX, "decimal1"),
  };

  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: tn("accueil"), url: urlAbsolue("/", locale) },
    { nom: t("methode.filAriane"), url: urlAbsolue(CHEMIN, locale) },
  ]);

  return (
    <>
      <JsonLd data={jsonLdBreadcrumb} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {tn("accueil")}
          </Link>{" "}
          › <span className="text-foreground">{t("methode.filAriane")}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t("methode.h1")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("methode.intro", valeurs)}</p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("methode.sources.titre")}</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5">
            {SOURCES.map((cle) => (
              <li key={cle}>{t(`methode.sources.${cle}`)}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("methode.nettoyage.titre")}</h2>
          <p className="mt-4">{t("methode.nettoyage.p1")}</p>
          <p className="mt-3">{t("methode.nettoyage.p2", valeursCarrez)}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("methode.communes.titre")}</h2>
          <p className="mt-4">{t("methode.communes.p1")}</p>
          <p className="mt-3">{t("methode.communes.p2", valeurs)}</p>
          <p className="mt-3">{t("methode.communes.p3", valeurs)}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("methode.estimation.titre")}</h2>
          <p className="mt-4">{t("methode.estimation.p1", valeurs)}</p>
          <p className="mt-3">{t("methode.estimation.p2", valeurs)}</p>
          <p className="mt-3">{t("methode.estimation.p3")}</p>
          <p className="mt-3">{t("methode.estimation.p4")}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("methode.limites.titre")}</h2>
          <p className="mt-4">{t("methode.limites.p1")}</p>
          <p className="mt-3">{t("methode.limites.p2", valeurs)}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t("methode.liens.changelog")}</p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" render={<Link href="/#estimation" />}>
            {t("methode.liens.estimer")}
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/qui-sommes-nous" />}>
            {t("methode.liens.qui")}
          </Button>
        </div>
      </div>
    </>
  );
}
