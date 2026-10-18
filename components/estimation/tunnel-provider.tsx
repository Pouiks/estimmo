import { NextIntlClientProvider, useMessages } from "next-intl";
import { pick } from "@/lib/i18n/pick";

/** Namespaces embarqués côté client pour le tunnel d'estimation. */
export const NAMESPACES_TUNNEL = [
  "common",
  "estimation",
  "labels",
  "quartier",
  "result",
  "validation",
] as const;

/**
 * Server Component : fournit au tunnel (client) uniquement les messages dont
 * il a besoin. Le provider racine n'embarque aucun message, pour que les
 * ~35 000 pages SEO ne transportent pas les textes du formulaire.
 */
export function TunnelProvider({ children }: { children: React.ReactNode }) {
  const messages = useMessages();
  return (
    <NextIntlClientProvider messages={pick(messages, NAMESPACES_TUNNEL)}>
      {children}
    </NextIntlClientProvider>
  );
}
