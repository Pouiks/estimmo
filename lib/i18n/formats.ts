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
  dateTime: {
    /** 18 octobre 2026 / 18 October 2026 */
    long: { dateStyle: "long" },
    /** 18 octobre / 18 October */
    dayMonth: { day: "numeric", month: "long" },
    /** octobre 2026 / October 2026 */
    monthYear: { month: "long", year: "numeric" },
    /** 18/10/2026 */
    short: { dateStyle: "short" },
  },
} satisfies Formats;
