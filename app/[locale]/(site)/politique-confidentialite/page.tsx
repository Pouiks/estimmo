import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { SITE } from "@/lib/config";
import { localeDeParams } from "@/lib/i18n/server";
import { RGPD } from "@/lib/rgpd/constantes";

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = [
  "responsable",
  "donnees",
  "finalites",
  "destinataires",
  "transferts",
  "conservation",
  "droits",
] as const;

const COOKIES = ["langue", "admin", "suivi"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("confidentialite.titre"), robots: { index: false } };
}

export default async function PolitiqueConfidentialitePage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "legal" }),
    getFormatter({ locale }),
  ]);
  const valeurs = {
    marque: SITE.name,
    agent: SITE.agent.name,
    email: SITE.agent.email,
    telephone: SITE.agent.phone,
    // Durées et délais : mêmes constantes que la purge automatique (lib/rgpd).
    annees: RGPD.conservationLeadsAnnees,
    moisEvenements: RGPD.conservationEvenementsMois,
    anneesJournal: RGPD.conservationJournalAnnees,
    delai: RGPD.delaiReponseMois,
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
      <p className="mt-2 text-sm text-muted-foreground">
        {t("confidentialite.version.texte", {
          date: format.dateTime(new Date(`${RGPD.politiqueVersion}T12:00:00Z`), {
            dateStyle: "long",
          }),
        })}
      </p>

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

      <section id="cookies" className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">{t("confidentialite.cookies.titre")}</h2>
        <p className="text-muted-foreground">{t("confidentialite.cookies.intro")}</p>
        <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
          {COOKIES.map((cookie) => (
            <li key={cookie}>
              {t.rich(`confidentialite.cookies.liste.${cookie}`, valeurs)}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{t("confidentialite.cookies.outro")}</p>
      </section>
    </div>
  );
}
