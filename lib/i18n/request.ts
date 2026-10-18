import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as segmentLocale } from "next/root-params";
import { chargerMessages } from "@/messages";
import { formats } from "./formats";
import { routing } from "./routing";
import { appliquerSurcharges } from "./surcharges";
import { chargerSurcharges } from "./surcharges-source";

/**
 * Configuration next-intl par requête.
 * - Server Components / generateMetadata : la locale vient du segment
 *   [locale] via next/root-params (pas de header lu, rendu statique conservé).
 * - Route handlers, sitemap, emails : la locale est passée explicitement
 *   (getTranslations({ locale })) car next/root-params y est indisponible.
 * Les messages embarqués (JSON) sont recouverts par les surcharges saisies
 * dans l'admin (table `traductions`, cache taggé).
 */
export default getRequestConfig(async ({ locale: explicite }) => {
  const candidat = explicite ?? (await segmentLocale());
  const locale = hasLocale(routing.locales, candidat)
    ? candidat
    : routing.defaultLocale;

  const [messages, surcharges] = await Promise.all([
    chargerMessages(locale),
    chargerSurcharges(locale),
  ]);

  return {
    locale,
    messages: appliquerSurcharges(messages, surcharges),
    formats,
    timeZone: "Europe/Paris",
  };
});
