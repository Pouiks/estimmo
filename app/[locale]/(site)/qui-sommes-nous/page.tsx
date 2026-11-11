import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { alternatesPour, openGraphPour, urlAbsolue } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { jsonLdAgentImmobilier, jsonLdFilAriane } from "@/lib/seo/json-ld";

type Props = { params: Promise<{ locale: string }> };

const CHEMIN = "/qui-sommes-nous";
const ENGAGEMENTS = ["gratuit", "donnees", "confidentialite", "honoraires"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "confiance" });
  const valeurs = { marque: SITE.name, agent: SITE.agent.name };
  const title = t("qui.meta.titre", valeurs);
  const description = t("qui.meta.description", valeurs);
  return {
    title,
    description,
    alternates: alternatesPour(CHEMIN, locale),
    openGraph: openGraphPour({ locale, cheminFr: CHEMIN, title, description }),
  };
}

export default async function QuiSommesNousPage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, tc, th, tn] = await Promise.all([
    getTranslations({ locale, namespace: "confiance" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const exclusif = tc("honoraires.exclusif", { taux: SITE.honoraires.tauxExclusif });
  const simple = tc("honoraires.simple", { taux: SITE.honoraires.tauxSimple });
  const valeurs = {
    marque: SITE.name,
    agent: SITE.agent.name,
    telephone: SITE.agent.phone,
    email: SITE.agent.email,
    statut: tc("agent.jobTitle").toLowerCase(),
    reseau: String(Boolean(SITE.agent.reseau)),
    nomReseau: SITE.agent.reseau,
    exclusif,
    simple,
  };

  const jsonLd = [
    jsonLdAgentImmobilier({
      marque: SITE.name,
      url: urlAbsolue(CHEMIN, locale),
      telephone: SITE.agent.phoneHref.replace(/^tel:/, ""),
      email: SITE.agent.email,
      priceRange: th("jsonLd.priceRange", { exclusif }),
      agent: { nom: SITE.agent.name, jobTitle: tc("agent.jobTitle") },
      service: th("jsonLd.service"),
    }),
    jsonLdFilAriane([
      { nom: tn("accueil"), url: urlAbsolue("/", locale) },
      { nom: t("qui.filAriane"), url: urlAbsolue(CHEMIN, locale) },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {tn("accueil")}
          </Link>{" "}
          › <span className="text-foreground">{t("qui.filAriane")}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t("qui.h1")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("qui.intro", valeurs)}</p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("qui.conseillere.titre")}</h2>
          <p className="mt-4">{t("qui.conseillere.p1", valeurs)}</p>
          <p className="mt-3">{t("qui.conseillere.p2", valeurs)}</p>
          <p className="mt-3">
            {t("qui.conseillere.contact", {
              telephone: SITE.agent.phone,
              email: SITE.agent.email,
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button render={<a href={SITE.agent.phoneHref} />}>{SITE.agent.phone}</Button>
            <Button variant="outline" render={<a href={`mailto:${SITE.agent.email}`} />}>
              {SITE.agent.email}
            </Button>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("qui.engagements.titre")}</h2>
          <ul className="mt-4 space-y-3">
            {ENGAGEMENTS.map((cle) => (
              <li key={cle} className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                <span>{t(`qui.engagements.${cle}`, valeurs)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("qui.zone.titre")}</h2>
          <p className="mt-4">{t("qui.zone.texte", valeurs)}</p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" render={<Link href="/#estimation" />}>
            {t("qui.liens.estimer")}
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/methodologie" />}>
            {t("qui.liens.methode")}
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/mentions-legales" className="underline underline-offset-4">
            {t("qui.liens.mentions")}
          </Link>
        </p>
      </div>
    </>
  );
}
