import type { Metadata } from "next";
import Link from "next/link";
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
import { MENTIONS, SITE } from "@/lib/config";
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

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const evo = (n: number | null) =>
  n === null ? "n.d." : `${n > 0 ? "+" : ""}${Number(n).toLocaleString("fr-FR")} %`;

async function chargerBarometre() {
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
    kpis,
    hausses,
    baisses,
    cheres,
    abordables,
    grandsMarches,
    annee: majDate.getFullYear(),
    majLabel: majDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { annee } = await chargerBarometre();
  const title = `Baromètre des prix immobiliers ${annee} : hausses, baisses et villes les plus chères`;
  const description = `Classements fondés sur les ventes réelles (base DVF) : plus fortes hausses et baisses de prix au m², villes les plus chères et les plus abordables de France. Mise à jour continue.`;
  return {
    title,
    description,
    alternates: { canonical: "/barometre-immobilier" },
    openGraph: { title, description, type: "website" },
  };
}

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
}: {
  lignes: LigneBarometre[];
  colonne: "evolution" | "prix";
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Ville</TableHead>
          <TableHead className="text-right">
            {colonne === "evolution" ? "Évolution 1 an" : "Prix appart."}
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
                  ? `${euro(l.prix_m2_median_appartement)}/m²`
                  : "n.d."}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function BarometrePage() {
  const { kpis, hausses, baisses, cheres, abordables, grandsMarches, annee, majLabel } =
    await chargerBarometre();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Baromètre ${SITE.name} des prix immobiliers ${annee}`,
    description:
      "Classements des prix immobiliers par commune (hausses, baisses, villes les plus chères) calculés à partir des ventes réelles de la base DVF (DGFiP), 12 mois glissants.",
    url: `${SITE.url}/barometre-immobilier`,
    creator: { "@type": "Organization", name: SITE.name, url: SITE.url },
    isBasedOn:
      "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    temporalCoverage: `${annee - 1}/${annee}`,
    spatialCoverage: { "@type": "Country", name: "France" },
  };

  const sections = [
    {
      icon: ArrowUpRight,
      titre: "Plus fortes hausses sur 1 an",
      lignes: hausses,
      colonne: "evolution" as const,
    },
    {
      icon: ArrowDownRight,
      titre: "Plus fortes baisses sur 1 an",
      lignes: baisses,
      colonne: "evolution" as const,
    },
    {
      icon: BadgeEuro,
      titre: "Villes les plus chères",
      lignes: cheres,
      colonne: "prix" as const,
    },
    {
      icon: PiggyBank,
      titre: "Villes les plus abordables",
      lignes: abordables,
      colonne: "prix" as const,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>{" "}
          › <span className="text-foreground">Baromètre</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Baromètre des prix immobiliers {annee}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Les classements ci-dessous sont calculés à partir des{" "}
          <strong className="text-foreground">
            ventes réellement enregistrées par l&apos;État
          </strong>{" "}
          (base DVF) sur les 12 derniers mois de données publiées, et non à
          partir d&apos;annonces. Mise à jour du {majLabel}.
        </p>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Ventes analysées (12 mois)
              </p>
              <p className="text-3xl font-bold">
                {kpis.nb_ventes_12m.toLocaleString("fr-FR")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Communes suivies</p>
              <p className="text-3xl font-bold">
                {kpis.nb_communes.toLocaleString("fr-FR")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="text-3xl font-bold">DVF · ANIL</p>
            </CardContent>
          </Card>
        </div>

        {/* Classements */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.titre}>
              <CardContent className="pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <s.icon className="size-5 text-primary" />
                  {s.titre}
                </h2>
                <TableTop lignes={s.lignes} colonne={s.colonne} />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Classements limités aux communes avec au moins {SEUIL_VENTES} ventes
          sur 12 mois, pour rester statistiquement significatifs. Paris,
          Marseille et Lyon apparaissent par arrondissement.
        </p>

        {/* Grands marchés */}
        <Card className="mt-10">
          <CardContent className="pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Building2 className="size-5 text-primary" />
              Les 20 plus gros marchés de France
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-right">Appartement</TableHead>
                    <TableHead className="text-right">Maison</TableHead>
                    <TableHead className="text-right">Évolution 1 an</TableHead>
                    <TableHead className="text-right">Ventes 12 mois</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grandsMarches.map((l) => (
                    <TableRow key={l.slug}>
                      <CelluleVille ligne={l} />
                      <TableCell className="text-right">
                        {l.prix_m2_median_appartement
                          ? `${euro(l.prix_m2_median_appartement)}/m²`
                          : "n.d."}
                      </TableCell>
                      <TableCell className="text-right">
                        {l.prix_m2_median_maison
                          ? `${euro(l.prix_m2_median_maison)}/m²`
                          : "n.d."}
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
                        {l.nb_ventes_12m.toLocaleString("fr-FR")}
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
              <h2 className="text-xl font-bold">
                Et votre bien, combien vaut-il ?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Estimation gratuite en 2 minutes, fondée sur les ventes réelles
                de votre quartier.
              </p>
            </div>
            <Button size="lg" render={<Link href="/estimation" />}>
              Estimer mon bien <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Méthodologie + presse */}
        <section className="mt-12 space-y-3 border-t pt-8">
          <h2 className="text-lg font-semibold">Méthodologie</h2>
          <p className="text-sm text-muted-foreground">
            Prix médians au m² calculés par commune et par type de bien à
            partir des mutations de la base «&nbsp;Demandes de valeurs
            foncières&nbsp;» (DVF, DGFiP) : ventes de gré à gré uniquement, un
            seul logement par mutation, bornes anti-aberrations (surface
            8-500&nbsp;m², prix 200-25&nbsp;000&nbsp;€/m²). Évolution :
            médiane des 12 derniers mois de données publiées comparée aux 12
            mois précédents. {MENTIONS.dvf}. {MENTIONS.anil}.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">
              Journalistes, blogueurs :
            </strong>{" "}
            ces données sont librement réutilisables avec mention
            «&nbsp;source&nbsp;: baromètre {SITE.name}&nbsp;» et un lien vers
            cette page. Contact&nbsp;: {SITE.agent.email}.
          </p>
        </section>
      </div>
    </>
  );
}
