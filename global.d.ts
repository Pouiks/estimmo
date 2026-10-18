import type { formats } from "@/lib/i18n/formats";
import type { routing } from "@/lib/i18n/routing";
import type fr from "@/messages/fr";

/** Typage strict next-intl : clés, arguments ICU, locales et formats. */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof fr;
    Formats: typeof formats;
  }
}
