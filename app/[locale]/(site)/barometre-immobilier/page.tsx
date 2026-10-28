import type { Metadata } from "next";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeEuro,
  Building2,
  PiggyBank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/lib/config";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import {
  alternatesPour,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { jsonLdFilAriane } from "@/lib/seo/json-ld";
import {
  getGrandsMarches,
  getKpisBarometre,
  getPlusAbordables,
  getPlusCheres,
  getPlusFortesBaisses,
  getPlusFortesHausses,
  SEUIL_VENTES,
  type LigneBarometre,
} from "@/lib/seo/barometre";

/** Recalcule chaque jour (les stats bougent a chaque import DVF). */
export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

async function chargerBarometre() {
  try {
    const [kpis, hausses, baisses, cheres, abordables, grandsMarches] =
      await Promise.all([
        getKpisBarometre(),
        getPlusFortesHausses(),
        getPlusFortesBaisses(),
        getPlusCheres(),
        getPlusAbordables(),
        getGrandsMarches(),
      ]);
    const majDate = kpis.updated_at ? new Date(kpis.updated_at) : new Date();
    return {
      disponible: true,
      kpis,
      hausses,
      baisses,
      cheres,
      abordables,
      grandsMarches,
      annee: majDate.getFullYear(),
      majDate,
    };
  } catch (err) {
    // Base injoignable (ex. build sans projet Supabase) : on ne fait pas
    // échouer le build. connection() sort la page du pré-rendu : elle est
    // alors rendue à la demande et réessaie à chaque requête, jusqu'au
    // prochain déploiement réussi qui la repasse en ISR.
    console.error("[barometre] données indisponibles :", err);
    await connection();
    const now = new Date();
    const vide: LigneBarometre[] = [];
    return {
      disponible: false,
      kpis: { nb_communes: 0, nb_ventes_12m: 0, updated_at: null },
      hausses: vide,
      baisses: vide,
      cheres: vide,
      abordables: vide,
      grandsMarches: vide,
      annee: now.getFullYear(),
      majDate: now,
    };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeDeParams(params);
  const [{ annee }, t] = await Promise.all([
    chargerBarometre(),
    getTranslations({ locale, namespace: "barometre" }),
  ]);
  const title = t("meta.titre", { annee: String(annee) });
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: alternatesPour("/barometre-immobilier", locale),
    openGraph: openGraphPour({
      locale,
      cheminFr: "/barometre-immobilier",
      title,
      description,
    }),
  };
}

type Traducteur = Awaited<
  ReturnType<typeof getTranslations<"barometre">>
>;
type Formateur = Awaited<ReturnType<typeof getFormatter>>;

function CelluleVille({ ligne }: { ligne: LigneBarometre }) {
  return (
    <TableCell>
      <Link
        href={`/prix-immobilier/${ligne.slug}`}
        className="font-medium hover:underline"
      >
        {ligne.nom_commune}
      </Link>{" "}
      <span className="text-xs text-muted-foreground">
        ({ligne.code_postal ?? ligne.departement})
      </span>
    </TableCell>
  );
}

function TableTop({
  lignes,
  colonne,
  t,
  format,
  na,
}: {
  lignes: LigneBarometre[];
  colonne: "evolution" | "prix";
  t: Traducteur;
  format: Formateur;
  na: string;
}) {
  const evo = (n: number | null) =>
    n === null ? na : t("evolution", { evo: Number(n) });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>{t("colonnes.ville")}</TableHead>
          <TableHead className="text-right">
            {colonne === "evolution"
              ? t("colonnes.evolution")
              : t("colonnes.prixAppart")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l, i) => (
          <TableRow key={l.slug}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <CelluleVille ligne={l} />
            <TableCell
              className={`text-right font-semibold ${
                colonne === "evolution"
                  ? Number(l.evolution_1an_pct) > 0
                    ? "text-green-700"
                    : "text-red-600"
                  : ""
              }`}
            >
              {colonne === "evolution"
                ? evo(l.evolution_1an_pct)
                : l.prix_m2_median_appartement
                  ? t("prixM2", {
                      prix: format.number(l.prix_m2_median_appartement, "currency"),
                    })
                  : na}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function BarometrePage({ params }: Props) {
  const locale: Locale = await localeDeParams(params);
  const [
    {
      disponible,
      kpis,
      hausses,
      baisses,
      cheres,
      abordables,
      grandsMarches,
      annee,
      majDate,
    },
    t,
    tc,
    format,
  ] = await Promise.all([
    chargerBarometre(),
    getTranslations({ locale, namespace: "barometre" }),
    getTranslations({ locale, namespace: "common" }),
    getFormatter({ locale }),
  ]);
  const na = tc("na");
  const prixM2 = (n: number | null) =>
    n ? t("prixM2", { prix: format.number(n, "currency") }) : na;
  const evo = (n: number | null) =>
    n === null ? na : t("evolution", { evo: Number(n) });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("jsonLd.nom", { marque: SITE.name, annee: String(annee) }),
    description: t("jsonLd.description"),
    url: urlAbsolue("/barometre-immobilier", locale),
    inLanguage: inLanguage(locale),
    creator: { "@type": "Organization", name: SITE.name, url: SITE.url },
    isBasedOn:
      "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    temporalCoverage: `${annee - 1}/${annee}`,
    spatialCoverage: { "@type": "Country", name: "France" },
  };

  // Reflète le fil d'Ariane visible en haut de page.
  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
    { nom: t("filAriane.barometre"), url: urlAbsolue("/barometre-immobilier", locale) },
  ]);

  const sections = [
    { cle: "hausses", icon: ArrowUpRight, lignes: hausses, colonne: "evolution" as const },
    { cle: "baisses", icon: ArrowDownRight, lignes: baisses, colonne: "evolution" as const },
    { cle: "cheres", icon: BadgeEuro, lignes: cheres, colonne: "prix" as const },
    { cle: "abordables", icon: PiggyBank, lignes: abordables, colonne: "prix" as const },
  ] as const;

  return (
    <>
      <JsonLd data={[jsonLd, jsonLdBreadcrumb]} />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          › <span className="text-foreground">{t("filAriane.barometre")}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("h1", { annee: String(annee) })}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          {t.rich("intro", {
            date: majDate,
            strong: (chunks) => (
              <strong className="text-foreground">{chunks}</strong>
            ),
          })}
        </p>

        {!disponible && (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t.rich("indisponible", {
              lien: (chunks) => (
                <Link href="/#estimation" className="font-medium underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("kpis.ventes")}</p>
              <p className="text-3xl font-bold">
                {format.number(kpis.nb_ventes_12m, "integer")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("kpis.communes")}</p>
              <p className="text-3xl font-bold">
                {format.number(kpis.nb_communes, "integer")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("kpis.source")}</p>
              <p className="text-3xl font-bold">DVF · ANIL</p>
            </CardContent>
          </Card>
        </div>

        {/* Classements */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.cle}>
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <s.icon className="size-5 text-primary" />
                  {t(`sections.${s.cle}`)}
                </h2>
                <TableTop
                  lignes={s.lignes}
                  colonne={s.colonne}
                  t={t}
                  format={format}
                  na={na}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("seuil", { seuil: SEUIL_VENTES })}
        </p>

        {/* Grands marchés */}
        <Card className="mt-10">
          <CardContent className="pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Building2 className="size-5 text-primary" />
              {t("grandsMarches")}
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colonnes.ville")}</TableHead>
                    <TableHead className="text-right">
                      {t("colonnes.appartement")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("colonnes.maison")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("colonnes.evolution")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("colonnes.ventes")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grandsMarches.map((l) => (
                    <TableRow key={l.slug}>
                      <CelluleVille ligne={l} />
                      <TableCell className="text-right">
                        {prixM2(l.prix_m2_median_appartement)}
                      </TableCell>
                      <TableCell className="text-right">
                        {prixM2(l.prix_m2_median_maison)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          Number(l.evolution_1an_pct) > 0
                            ? "text-green-700"
                            : Number(l.evolution_1an_pct) < 0
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {evo(l.evolution_1an_pct)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format.number(l.nb_ventes_12m, "integer")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t("cta.titre")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("cta.texte")}
              </p>
            </div>
            <Button size="lg" render={<Link href="/estimation" />}>
              {t("cta.bouton")} <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Méthodologie + presse */}
        <section className="mt-12 space-y-3 border-t pt-8">
          <h2 className="text-lg font-semibold">{t("methodologie.titre")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("methodologie.texte", {
              dvf: tc("mentions.dvf"),
              anil: tc("mentions.anil"),
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.rich("methodologie.presse", {
              marque: SITE.name,
              email: SITE.agent.email,
              strong: (chunks) => (
                <strong className="text-foreground">{chunks}</strong>
              ),
            })}
          </p>
        </section>
      </div>
    </>
  );
}
