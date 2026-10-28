import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { SITE } from "@/lib/config";
import { routing } from "@/lib/i18n/routing";
import { imageOgPour, ogLocale } from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Params = Promise<{ locale: string }>;

export const viewport: Viewport = { themeColor: "#2E90E5" };

/** Les deux langues sont prérendues pour les pages statiques. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const t = await getTranslations({ locale, namespace: "common" });
  const titre = `${SITE.name} - ${t("baseline")}`;
  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: titre,
      template: `%s | ${SITE.name}`,
    },
    description: t("description"),
    // Partage (Facebook, LinkedIn, WhatsApp, Discord, Slack…) : chaque page
    // fournit son bloc via openGraphPour ; ceci est le repli.
    openGraph: {
      siteName: SITE.name,
      locale: ogLocale(locale),
      type: "website",
      images: imageOgPour({ locale, title: titre }),
    },
    // Twitter/X reprend og:title, og:description et og:image ; la carte doit
    // être déclarée pour afficher l'image en grand.
    twitter: { card: "summary_large_image" },
    // Balise de vérification Google Search Console (optionnelle, via env).
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

/** Root layout du site public : une version par langue (fr à la racine, /en). */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Params }>) {
  const locale = await localeDeParams(params);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Aucun message n'est embarqué côté client ici : les composants
            client qui en ont besoin (tunnel) reçoivent un provider dédié. */}
        <NextIntlClientProvider messages={null}>{children}</NextIntlClientProvider>
        <Toaster richColors position="top-center" />
        {/* Mesure d'audience sans cookie (pas de bannière de consentement requise) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
