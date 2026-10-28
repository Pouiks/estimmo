import type { Formats } from "next-intl";

/**
 * Formats partagés (useFormatter / getFormatter). Remplace les copies
 * locales de euro() et des toLocaleString("fr-FR").
 */
export const formats = {
  number: {
    /** 245 000 € / €245,000 */
    currency: { style: "currency", currency: "EUR", maximumFractionDigits: 0 },
    /** 18,5 € / €18.5 (loyers au m², une décimale) */
    currencyDecimal: { style: "currency", currency: "EUR", maximumFractionDigits: 1 },
    /** 1 234 / 1,234 */
    integer: { maximumFractionDigits: 0 },
    /** 12,5 / 12.5 */
    decimal1: { maximumFractionDigits: 1 },
    /** +3,2 / -1,4 (évolution en points de %, signe explicite) */
    evolution: { maximumFractionDigits: 1, signDisplay: "exceptZero" },
  },
  // Toujours par composants (jamais dateStyle) : dans un message ICU
  // ({date, date, short}), intl-messageformat fusionne nos formats avec ses
  // formats par defaut « short »/« long » (composants) et Intl refuse le
  // melange dateStyle + composants (FORMATTING_ERROR « Invalid option »).
  dateTime: {
    /** 18 octobre 2026 / 18 October 2026 */
    long: { day: "numeric", month: "long", year: "numeric" },
    /** 18 octobre / 18 October */
    dayMonth: { day: "numeric", month: "long" },
    /** octobre 2026 / October 2026 */
    monthYear: { month: "long", year: "numeric" },
    /** 18/10/2026 */
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
  },
} satisfies Formats;
