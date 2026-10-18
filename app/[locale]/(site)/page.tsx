import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  BadgeEuro,
  CheckCircle2,
  ClipboardList,
  Database,
  Lock,
  Mail,
  MapPinned,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstimationForm } from "@/components/estimation/estimation-form";
import { TunnelProvider } from "@/components/estimation/tunnel-provider";
import { SITE } from "@/lib/config";
import { alternatesPour, inLanguage, openGraphPour } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";

type Props = { params: Promise<{ locale: string }> };

const ARGUMENTS = ["immediat", "donnees", "partout"] as const;
const ETAPES = [
  { cle: "decrire", icon: ClipboardList },
  { cle: "analyse", icon: Database },
  { cle: "recevoir", icon: Mail },
] as const;
const REASSURANCES = [
  { cle: "rapide", icon: Timer },
  { cle: "donnees", icon: Database },
  { cle: "france", icon: MapPinned },
  { cle: "gratuit", icon: Lock },
] as const;
// FAQ visible + balisage FAQPage : les questions que tapent réellement les
// vendeurs dans Google. Le contenu affiché et le JSON-LD sont identiques.
const FAQ = ["calcul", "fiable", "gratuit", "avisValeur", "loyer"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    alternates: alternatesPour("/", locale),
    openGraph: openGraphPour({
      locale,
      cheminFr: "/",
      title: `${SITE.name} - ${t("baseline")}`,
      description: t("description"),
    }),
  };
}

export default async function HomePage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const exclusif = tc("honoraires.exclusif", { taux: SITE.honoraires.tauxExclusif });
  const simple = tc("honoraires.simple", { taux: SITE.honoraires.tauxSimple });

  const jsonLdAgent = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: SITE.name,
    url: SITE.url,
    telephone: SITE.agent.phoneHref.replace(/^tel:/, ""),
    email: SITE.agent.email,
    priceRange: t("jsonLd.priceRange", { exclusif }),
    areaServed: { "@type": "Country", name: "France" },
    employee: {
      "@type": "Person",
      name: SITE.agent.name,
      jobTitle: tc("agent.jobTitle"),
    },
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: t("jsonLd.service"),
      },
      price: "0",
      priceCurrency: "EUR",
    },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: inLanguage(locale),
    mainEntity: FAQ.map((cle) => ({
      "@type": "Question",
      name: t(`faq.${cle}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`faq.${cle}.reponse`, { agent: SITE.agent.name }),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAgent) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* Hero : le tunnel d'estimation est le premier élément du DOM.
          Mobile : formulaire seul en haut, texte SEO/GEO compact dessous.
          Desktop : texte à gauche (order-first), formulaire à droite. */}
      <section
        id="estimation"
        className="scroll-mt-16 border-b bg-gradient-to-b from-primary/5 to-background"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-3 pb-10 pt-3 sm:px-4 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-12 lg:py-20">
          <div className="dcx w-full" style={{ color: "#0C1F1C" }}>
            <TunnelProvider>
              <EstimationForm />
            </TunnelProvider>
            <p className="mx-auto mt-3 max-w-lg text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {tc("mentions.disclaimer")}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t pt-8 lg:order-first lg:gap-6 lg:border-0 lg:pt-6">
            <p className="w-fit rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {t("hero.badge")}
            </p>
            <h1 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {t("hero.titre")}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-lg">
              {t("hero.texte")}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {ARGUMENTS.map((cle) => (
                <li key={cle} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t(`hero.arguments.${cle}`)}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              variant="outline"
              className="w-fit text-base"
              render={<a href={SITE.agent.phoneHref} />}
            >
              {t("hero.appeler", { telephone: SITE.agent.phone })}
            </Button>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          {t("etapes.titre")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <Card key={etape.cle}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <etape.icon className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {t("etapes.numero", { numero: i + 1 })}
                  </span>
                </div>
                <h3 className="font-semibold">{t(`etapes.${etape.cle}.titre`)}</h3>
                <p className="text-sm text-muted-foreground">
                  {t(`etapes.${etape.cle}.texte`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Réassurance */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {REASSURANCES.map((item) => (
            <div key={item.cle} className="space-y-2">
              <item.icon className="size-6 text-primary" />
              <h3 className="font-semibold">{t(`reassurances.${item.cle}.titre`)}</h3>
              <p className="text-sm text-muted-foreground">
                {t(`reassurances.${item.cle}.texte`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Honoraires / accompagnement */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("accompagnement.titre")}
            </h2>
            <p className="text-muted-foreground">
              {t("accompagnement.texte", { agent: SITE.agent.name })}
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <BadgeEuro className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {t.rich("accompagnement.honoraires", {
                    strong: (chunks) => <strong>{chunks}</strong>,
                    exclusif,
                    simple,
                  })}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BadgeEuro className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t("accompagnement.engagement")}</span>
              </li>
            </ul>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-xl font-semibold">
                {t("accompagnement.ctaTitre")}
              </h3>
              <p className="text-sm opacity-90">{t("accompagnement.ctaTexte")}</p>
              <Button
                size="lg"
                variant="secondary"
                render={<a href="#estimation" />}
              >
                {t("accompagnement.ctaBouton")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ (contenu identique au JSON-LD FAQPage) */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            {t("faq.titre")}
          </h2>
          <div className="mt-10 space-y-8">
            {FAQ.map((cle) => (
              <div key={cle}>
                <h3 className="font-semibold">{t(`faq.${cle}.question`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`faq.${cle}.reponse`, { agent: SITE.agent.name })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
