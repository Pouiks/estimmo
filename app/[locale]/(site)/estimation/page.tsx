import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EstimationForm } from "@/components/estimation/estimation-form";
import { TunnelProvider } from "@/components/estimation/tunnel-provider";
import { alternatesPour, openGraphPour } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "estimation" });
  const title = t("meta.titre");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: alternatesPour("/estimation", locale),
    openGraph: openGraphPour({ locale, cheminFr: "/estimation", title, description }),
  };
}

export default async function EstimationPage({ params }: Props) {
  const locale = await localeDeParams(params);
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <div
      className="dcx"
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 18px",
        color: "#0C1F1C",
        background:
          "radial-gradient(1200px 600px at 15% -10%,#E9F3EE 0%,rgba(233,243,238,0) 55%),radial-gradient(1000px 620px at 110% 10%,#E6EEF6 0%,rgba(230,238,246,0) 50%),linear-gradient(180deg,#F5F8F6 0%,#EFF3F1 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 660 }}>
        <TunnelProvider>
          <EstimationForm />
        </TunnelProvider>
        <p
          style={{
            textAlign: "center",
            margin: "16px auto 0",
            maxWidth: 520,
            fontSize: 12,
            color: "#9BA8A4",
            lineHeight: 1.5,
          }}
        >
          {tc("mentions.disclaimer")}
        </p>
      </div>
    </div>
  );
}
