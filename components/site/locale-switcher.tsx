"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/routing";

interface Props {
  /** Libellés traduits, rendus côté serveur (évite d'embarquer des messages). */
  libelles: Record<Locale, string>;
  ariaLabel: string;
}

/** Sélecteur FR | EN : conserve la page courante, pose le cookie NEXT_LOCALE. */
export function LocaleSwitcher({ libelles, ariaLabel }: Props) {
  const courante = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="flex items-center gap-1 text-xs font-semibold"
    >
      {LOCALES.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/60">|</span>}
          {locale === courante ? (
            <span aria-current="true" className="text-foreground" lang={locale}>
              {locale.toUpperCase()}
            </span>
          ) : (
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              lang={locale}
              title={libelles[locale]}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {locale.toUpperCase()}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
