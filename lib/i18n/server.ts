import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "./routing";

/**
 * Lit et valide le segment [locale] d'une page ou d'un layout (params est
 * une Promise en Next 16). Une valeur inconnue déclenche la 404.
 */
export async function localeDeParams(
  params: Promise<{ locale: string }>
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}
