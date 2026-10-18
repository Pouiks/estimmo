import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/lib/config";
import { localeDeParams } from "@/lib/i18n/server";

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = [
  "responsable",
  "donnees",
  "finalites",
  "destinataires",
  "conservation",
  "droits",
  "cookies",
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("confidentialite.titre"), robots: { index: false } };
}

export default async function PolitiqueConfidentialitePage({ params }: Props) {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  const valeurs = {
    marque: SITE.name,
    agent: SITE.agent.name,
    email: SITE.agent.email,
    telephone: SITE.agent.phone,
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    // Balise <lien> : lien mailto dans la section « Vos droits ».
    lien: (chunks: React.ReactNode) => (
      <a
        href={`mailto:${SITE.agent.email}`}
        className="underline underline-offset-4"
      >
        {chunks}
      </a>
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        {t("confidentialite.titre")}
      </h1>

      {SECTIONS.map((section) => (
        <section key={section} className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">
            {t(`confidentialite.${section}.titre`)}
          </h2>
          <p className="text-muted-foreground">
            {t.rich(`confidentialite.${section}.texte`, valeurs)}
          </p>
        </section>
      ))}
    </div>
  );
}
