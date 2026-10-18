import type { Locale } from "@/lib/i18n/routing";
import type fr from "./fr";

export type Messages = typeof fr;

const chargeurs: Record<Locale, () => Promise<Messages>> = {
  fr: () => import("./fr").then((m) => m.default),
  en: () => import("./en").then((m) => m.default),
};

export function chargerMessages(locale: Locale): Promise<Messages> {
  return chargeurs[locale]();
}
