import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/lib/config";
import { localeDeParams } from "@/lib/i18n/server";

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = ["hebergement", "honoraires", "sources", "propriete"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("mentions.titre"), robots: { index: false } };
}

export default async function MentionsLegalesPage({ params }: Props) {
  const locale = await localeDeParams(params);
  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: "legal" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const valeurs = {
    marque: SITE.name,
    agent: SITE.agent.name,
    email: SITE.agent.email,
    telephone: SITE.agent.phone,
    statut: tc("agent.jobTitle").toLowerCase(),
    reseau: String(Boolean(SITE.agent.reseau)),
    nomReseau: SITE.agent.reseau,
    rsac: SITE.agent.rsac,
    siren: SITE.agent.siren,
    adresse: SITE.agent.adresse,
    cartePro: SITE.agent.cartePro,
    exclusif: tc("honoraires.exclusif", { taux: SITE.honoraires.tauxExclusif }),
    simple: tc("honoraires.simple", { taux: SITE.honoraires.tauxSimple }),
  };
  // Lignes d'identité affichées seulement quand la donnée est renseignée (lib/config.ts).
  const identite = (["rsac", "siren", "adresse", "cartePro"] as const).filter((cle) => SITE.agent[cle]);

  return (
    <div className="prose prose-neutral mx-auto max-w-3xl px-4 py-16 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">{t("mentions.titre")}</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">{t("mentions.editeur.titre")}</h2>
        <p className="text-muted-foreground">
          {t("mentions.editeur.texte", valeurs)}
          <br />
          {t("mentions.editeur.directeur", valeurs)}
          {identite.map((cle) => (
            <span key={cle}>
              <br />
              {t(`mentions.editeur.${cle}`, valeurs)}
            </span>
          ))}
          <br />
          {t("mentions.editeur.contact", valeurs)}
        </p>
      </section>

      {SECTIONS.map((section) => (
        <section key={section} className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">
            {t(`mentions.${section}.titre`)}
          </h2>
          <p className="text-muted-foreground">
            {t(`mentions.${section}.texte`, valeurs)}
          </p>
        </section>
      ))}
    </div>
  );
}
