import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MENTIONS, SITE } from "@/lib/config";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b bg-background/95 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            ESTI<span className="text-primary">MMO</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Button size="sm" render={<Link href="/estimation" />}>
              Estimation gratuite
            </Button>
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
            <p className="text-sm text-muted-foreground">{SITE.baseline}.</p>
            <p className="text-xs text-muted-foreground">
              {MENTIONS.disclaimer}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Votre conseillère</p>
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
            <p className="text-sm font-semibold">Liens</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/estimation" className="hover:text-foreground">
                  Estimer mon bien
                </Link>
              </li>
              <li>
                <Link href="/prix-immobilier" className="hover:text-foreground">
                  Prix immobilier par commune
                </Link>
              </li>
              <li>
                <Link
                  href="/barometre-immobilier"
                  className="hover:text-foreground"
                >
                  Baromètre des prix
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-foreground">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite"
                  className="hover:text-foreground"
                >
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-4 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {SITE.name}. {MENTIONS.dvf}.
            </p>
            <p>{MENTIONS.anil}.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
