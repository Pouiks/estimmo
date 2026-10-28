import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { MenuMobile } from "@/components/site/menu-mobile";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations();

  // Mêmes destinations que le pied de page (hors pages légales).
  const liens = [
    { href: "/prix-immobilier", libelle: t("nav.prixCourt") },
    { href: "/barometre-immobilier", libelle: t("nav.barometreCourt") },
    { href: "/blog", libelle: t("nav.blog") },
  ];

  return (
    <>
      <header className="border-b bg-background/95 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            ESTI<span className="text-primary">MMO</span>
          </Link>
          <nav
            aria-label={t("nav.principale")}
            className="flex items-center gap-3 sm:gap-5"
          >
            <ul className="hidden items-center gap-5 md:flex">
              {liens.map((lien) => (
                <li key={lien.href}>
                  <Link
                    href={lien.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {lien.libelle}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/estimation"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              {t("nav.estimer")}
            </Link>
            <LocaleSwitcher
              ariaLabel={t("nav.langue")}
              libelles={{
                fr: t("common.langues.fr"),
                en: t("common.langues.en"),
              }}
            />
            <MenuMobile
              ariaLabel={t("nav.menu")}
              liens={[{ href: "/estimation", libelle: t("nav.estimer") }, ...liens]}
            />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-lg font-bold">
              ESTI<span className="text-primary">MMO</span>
            </p>
            <p className="text-sm text-muted-foreground">{t("common.baseline")}.</p>
            <p className="text-xs text-muted-foreground">
              {t("common.mentions.disclaimer")}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("common.agent.role")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{SITE.agent.name}</li>
              <li>
                <a href={SITE.agent.phoneHref} className="hover:text-foreground">
                  {SITE.agent.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.agent.email}`}
                  className="hover:text-foreground"
                >
                  {SITE.agent.email}
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("nav.liens")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/estimation" className="hover:text-foreground">
                  {t("nav.estimer")}
                </Link>
              </li>
              <li>
                <Link href="/prix-immobilier" className="hover:text-foreground">
                  {t("nav.prixCommunes")}
                </Link>
              </li>
              <li>
                <Link
                  href="/barometre-immobilier"
                  className="hover:text-foreground"
                >
                  {t("nav.barometre")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  {t("nav.blog")}
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-foreground">
                  {t("nav.mentionsLegales")}
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite"
                  className="hover:text-foreground"
                >
                  {t("nav.confidentialite")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-4 text-xs text-muted-foreground">
            <p>
              {t("nav.copyright", {
                annee: new Date().getFullYear(),
                marque: SITE.name,
              })}{" "}
              {t("common.mentions.dvf")}.
            </p>
            <p>{t("common.mentions.anil")}.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
