import Link from "next/link";
import {
  BadgeEuro,
  ClipboardList,
  Database,
  Lock,
  Mail,
  MapPinned,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/config";

const steps = [
  {
    icon: ClipboardList,
    title: "Décrivez votre bien",
    description:
      "4 étapes simples : votre projet, les caractéristiques du bien, son état, vos coordonnées.",
  },
  {
    icon: Database,
    title: "Analyse des ventes réelles",
    description:
      "Notre moteur compare votre bien aux transactions officielles (DVF) et aux loyers de référence (ANIL) de votre quartier.",
  },
  {
    icon: Mail,
    title: "Recevez votre estimation",
    description:
      "Une fourchette de prix immédiate à l'écran et par email, puis un échange avec votre conseillère pour l'affiner.",
  },
];

// FAQ visible + balisage FAQPage : les questions que tapent réellement les
// vendeurs dans Google. Le contenu affiché et le JSON-LD sont identiques.
const faq = [
  {
    question: "Comment est calculée mon estimation immobilière ?",
    reponse:
      "Nous comparons votre bien aux ventes réellement enregistrées par l'État (base DVF) dans votre quartier : même type de bien, surface proche, ventes de moins de 30 mois. Le prix au m² obtenu est ensuite ajusté selon l'état, le DPE, l'étage, l'extérieur et le stationnement. Pour une location, nous utilisons les loyers de référence ANIL de votre commune.",
  },
  {
    question: "L'estimation en ligne est-elle fiable ?",
    reponse:
      "Elle repose sur des transactions réelles, pas sur des annonces. La fourchette affichée reflète l'hétérogénéité des ventes de votre secteur. Pour transformer cette fourchette en prix de mise en vente précis, un avis de valeur sur place reste indispensable : Carenza Brown vous l'offre, sans engagement.",
  },
  {
    question: "Est-ce vraiment gratuit et sans engagement ?",
    reponse:
      "Oui. L'estimation est gratuite, immédiate et sans aucune obligation. Vous n'êtes recontacté qu'avec votre consentement explicite, et vos données ne sont jamais revendues.",
  },
  {
    question: "Quelle différence entre estimation en ligne et avis de valeur ?",
    reponse:
      "L'estimation en ligne donne une fourchette statistique immédiate fondée sur les ventes comparables. L'avis de valeur est réalisé sur place par un professionnel : il intègre les spécificités invisibles dans les données (vue, agencement, travaux, copropriété) et débouche sur un prix de commercialisation.",
  },
  {
    question: "Puis-je estimer un loyer ?",
    reponse:
      "Oui. Le même formulaire estime le loyer mensuel de votre appartement ou maison à partir des indicateurs officiels ANIL de votre commune, avec les alertes réglementaires DPE (interdiction progressive de louer les passoires thermiques).",
  },
];

const reassurances = [
  {
    icon: Timer,
    title: "2 minutes chrono",
    description: "Un parcours court, pensé pour le mobile.",
  },
  {
    icon: Database,
    title: "Données officielles",
    description:
      "Ventes DVF (data.gouv.fr) et loyers ANIL : les mêmes données que les notaires.",
  },
  {
    icon: MapPinned,
    title: "Toute la France",
    description:
      "Estimation vente et location, de Paris aux communes rurales.",
  },
  {
    icon: Lock,
    title: "Gratuit et sans engagement",
    description:
      "Vos données restent confidentielles et ne sont jamais revendues.",
  },
];

export default function HomePage() {
  const jsonLdAgent = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: SITE.name,
    url: SITE.url,
    telephone: "+33612345678",
    email: SITE.agent.email,
    priceRange: `Honoraires ${SITE.honoraires.exclusif} en mandat exclusif`,
    areaServed: { "@type": "Country", name: "France" },
    employee: {
      "@type": "Person",
      name: SITE.agent.name,
      jobTitle: "Conseillère immobilière",
    },
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Estimation immobilière gratuite en ligne",
      },
      price: "0",
      priceCurrency: "EUR",
    },
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

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <p className="rounded-full border bg-background px-4 py-1 text-xs font-medium text-muted-foreground">
            Basé sur les ventes officielles enregistrées par l'État
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Combien vaut votre bien immobilier&nbsp;?
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Estimation gratuite en 2 minutes - vente ou location. Fourchette de
            prix immédiate, fondée sur les transactions réelles de votre
            quartier.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="text-base"
              render={<Link href="/estimation" />}
            >
              Estimer mon bien gratuitement
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base"
              render={<a href={SITE.agent.phoneHref} />}
            >
              Appeler {SITE.agent.phone}
            </Button>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Comment ça marche&nbsp;?
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    Étape {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Réassurance */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {reassurances.map((item) => (
            <div key={item.title} className="space-y-2">
              <item.icon className="size-6 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
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
              Vendez au meilleur prix, accompagné de bout en bout
            </h2>
            <p className="text-muted-foreground">
              L'estimation en ligne est une première étape. Pour vendre vite et
              bien, {SITE.agent.name} affine votre prix sur place et pilote
              votre vente : photos professionnelles, diffusion prioritaire,
              qualification des acheteurs, négociation.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <BadgeEuro className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Honoraires <strong>{SITE.honoraires.exclusif}</strong> en
                  mandat exclusif (contre {SITE.honoraires.simple} en mandat
                  simple)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BadgeEuro className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Engagement de moyens écrit et reporting régulier</span>
              </li>
            </ul>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-xl font-semibold">
                Prêt à connaître la valeur de votre bien&nbsp;?
              </h3>
              <p className="text-sm opacity-90">
                Réponse immédiate à l'écran, récapitulatif complet par email, et
                un rappel de votre conseillère si vous le souhaitez.
              </p>
              <Button
                size="lg"
                variant="secondary"
                render={<Link href="/estimation" />}
              >
                Démarrer mon estimation
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ (contenu identique au JSON-LD FAQPage) */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Questions fréquentes
          </h2>
          <div className="mt-10 space-y-8">
            {faq.map((f) => (
              <div key={f.question}>
                <h3 className="font-semibold">{f.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.reponse}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
