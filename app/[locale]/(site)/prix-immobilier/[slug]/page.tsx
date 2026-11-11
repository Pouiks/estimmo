import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Building2, Home, LineChart, Receipt, Users } from "lucide-react";
import { EstimationForm } from "@/components/estimation/estimation-form";
import { TunnelProvider } from "@/components/estimation/tunnel-provider";
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
import { DEFAULT_LOCALE } from "@/lib/i18n/routing";
import {
  alternatesPour,
  inLanguage,
  openGraphPour,
  urlAbsolue,
} from "@/lib/i18n/seo";
import { localeDeParams } from "@/lib/i18n/server";
import { analyserCommune, prixAffiches } from "@/lib/seo/analyse";
import {
  getCommuneBySlug,
  getCommunesVoisines,
  getLoyersByInsee,
  getTopCommunes,
} from "@/lib/seo/communes";
import { getContexteCommune } from "@/lib/seo/contexte";
import { hrefDepartement, nomDepartement } from "@/lib/seo/departements";
import { regimeCommune } from "@/lib/seo/indexation";
import { jsonLdAgentImmobilier, jsonLdFilAriane } from "@/lib/seo/json-ld";
import { hrefRegion, regionDuDepartement } from "@/lib/seo/regions";
import { GABARIT_COMMUNE_MODIFIE_LE } from "@/lib/seo/sitemap";
import {
  brefTextes,
  departementTexte,
  evolutionAffichable,
  evolutionLongueTexte,
  evolutionTexte,
  faqCommune,
  formatEvo,
  introCommune,
  prixTexte,
  voisinesTexte,
  volumeTexte,
} from "@/lib/seo/textes";

/** ISR : revalidation quotidienne, pages hors top 2000 générées à la demande. */
export const revalidate = 86400;
export const dynamicParams = true;

const PRERENDER_COUNT = Number(process.env.SEO_PRERENDER_COUNT ?? 2000);

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  // Seules les pages françaises sont prérendues au build ; les pages /en
  // sont générées à la demande (ISR) à la première visite.
  if (params.locale !== DEFAULT_LOCALE) return [];
  // Approximation « communes les plus peuplées » : volume de ventes DVF.
  const communes = await getTopCommunes(PRERENDER_COUNT);
  return communes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const [stats, t] = await Promise.all([
    getCommuneBySlug(slug),
    getTranslations({ locale, namespace: "commune" }),
  ]);
  if (!stats) return { title: t("meta.introuvable") };

  const nom = stats.nom_commune;
  const annee = String(new Date(stats.updated_at).getFullYear());
  const cp = stats.code_postal ?? stats.departement;
  const title = t("meta.titre", { nom, cp, annee });
  const regime = regimeCommune(stats);
  // Prix médian maison et/ou appartement ; sans aucune vente, loyers seulement.
  const prix = prixTexte(prixAffiches(stats, regime.fenetre), t);
  const description = prix
    ? t("meta.descriptionVentes", { nom, prix })
    : t("meta.descriptionLoyers", { nom });
  const chemin = `/prix-immobilier/${slug}`;

  // Seule la version française est indexable : la version anglaise (copie
  // traduite) est en noindex, follow et hors sitemap pour concentrer le crawl ;
  // sans hreflang sur ces pages (un hreflang vers une page noindex est ignoré).
  const indexable = regime.indexable && locale === DEFAULT_LOCALE;

  return {
    // Title absolu (sans « | ESTIMMO ») : format imposé, ~60 caractères.
    title: { absolute: title },
    description,
    alternates: alternatesPour(chemin, locale, [DEFAULT_LOCALE]),
    openGraph: openGraphPour({
      locale,
      cheminFr: chemin,
      title,
      description,
      sousTitre: description,
    }),
    // Seuil de qualité : trop peu de ventes pour des chiffres fiables →
    // page accessible et liée, mais hors index et hors sitemap.
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CommunePage({ params }: Props) {
  const [{ slug }, locale] = await Promise.all([params, localeDeParams(params)]);
  const stats = await getCommuneBySlug(slug);
  if (!stats) notFound();

  const [loyers, voisinesDept, contexte, t, tc, th, format] = await Promise.all([
    getLoyersByInsee(stats.code_insee),
    getCommunesVoisines(stats.departement, stats.code_insee),
    getContexteCommune(stats.code_insee),
    getTranslations({ locale, namespace: "commune" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "home" }),
    getFormatter({ locale }),
  ]);

  const nom = stats.nom_commune;
  const cp = stats.code_postal ?? stats.departement;
  const annee = new Date(stats.updated_at).getFullYear();
  const na = tc("na");
  const euroM2 = (n: number) => `${format.number(n, "currency")}/m²`;
  const regime = regimeCommune(stats);
  const faits = analyserCommune(stats, contexte, regime);
  const prix = faits.prix;
  const faq = faqCommune(stats, loyers, annee, t, faits);
  const evolution = evolutionTexte(stats, t, na);
  const volume = volumeTexte(stats, faits, t);
  const longue = evolutionLongueTexte(stats, faits, t, na);
  const aDesVentes = Boolean(prix.appart || prix.maison);
  const chemin = `/prix-immobilier/${slug}`;
  const url = urlAbsolue(chemin, locale);
  const departement = nomDepartement(stats.departement);
  const region = regionDuDepartement(stats.departement);
  const voisines = departement ? voisinesTexte(stats, faits, t) : null;
  const vsDepartement = departement ? departementTexte(stats, faits, departement, t) : null;
  const bref = brefTextes(stats, faits, t);
  const voisinesComparees = faits.voisines.filter((v) => v.prix).slice(0, 5);
  const majChiffres = new Date(stats.contenu_modifie_le ?? stats.updated_at);
  const majPage = majChiffres > GABARIT_COMMUNE_MODIFIE_LE ? majChiffres : GABARIT_COMMUNE_MODIFIE_LE;

  const jsonLdDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("jsonLd.datasetNom", { nom, cp }),
    description: t("jsonLd.datasetDescription", { nom }),
    url,
    inLanguage: inLanguage(locale),
    creator: { "@type": "Organization", name: SITE.name },
    isBasedOn:
      "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    spatialCoverage: { "@type": "Place", name: nom },
    dateModified: majPage.toISOString().slice(0, 10),
    variableMeasured: [
      prix.appart && {
        "@type": "PropertyValue",
        name: t("jsonLd.medianAppart"),
        value: prix.appart,
        unitText: "EUR/m2",
      },
      prix.maison && {
        "@type": "PropertyValue",
        name: t("jsonLd.medianMaison"),
        value: prix.maison,
        unitText: "EUR/m2",
      },
    ].filter(Boolean),
  };

  // Même fiche RealEstateAgent que l'accueil, zone desservie = la commune.
  const jsonLdAgent = jsonLdAgentImmobilier({
    marque: SITE.name,
    url,
    telephone: SITE.agent.phoneHref.replace(/^tel:/, ""),
    email: SITE.agent.email,
    priceRange: th("jsonLd.priceRange", {
      exclusif: tc("honoraires.exclusif", { taux: SITE.honoraires.tauxExclusif }),
    }),
    agent: { nom: SITE.agent.name, jobTitle: tc("agent.jobTitle") },
    service: th("jsonLd.service"),
    zone: { type: "City", nom },
  });

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: inLanguage(locale),
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.reponse },
    })),
  };

  // Reflète le fil d'Ariane visible en haut de page.
  const jsonLdBreadcrumb = jsonLdFilAriane([
    { nom: t("filAriane.accueil"), url: urlAbsolue("/", locale) },
    { nom: t("filAriane.prix"), url: urlAbsolue("/prix-immobilier", locale) },
    ...(region ? [{ nom: region.nom, url: urlAbsolue(hrefRegion(region), locale) }] : []),
    ...(departement
      ? [{ nom: departement, url: urlAbsolue(hrefDepartement(stats.departement), locale) }]
      : []),
    { nom, url },
  ]);

  return (
    <>
      <JsonLd data={[jsonLdDataset, jsonLdFaq, jsonLdBreadcrumb, jsonLdAgent]} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("filAriane.accueil")}
          </Link>{" "}
          ›{" "}
          <Link href="/prix-immobilier" className="hover:text-foreground">
            {t("filAriane.prix")}
          </Link>{" "}
          {region && (
            <>
              ›{" "}
              <Link href={hrefRegion(region)} className="hover:text-foreground">
                {region.nom}
              </Link>{" "}
            </>
          )}
          {departement && (
            <>
              ›{" "}
              <Link
                href={hrefDepartement(stats.departement)}
                className="hover:text-foreground"
              >
                {departement}
              </Link>{" "}
            </>
          )}
          › <span className="text-foreground">{nom}</span>
        </nav>

        <div
          id="estimation"
          className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-10"
        >
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {t("h1", { nom, cp, annee: String(annee) })}
            </h1>
            <p className="mt-4 hidden text-lg text-muted-foreground lg:block">
              {introCommune(stats, prix, t)}
            </p>
          </div>
          {/* Formulaire d'estimation : visible sans défilement, sur mobile
              (juste sous le H1) comme sur ordinateur (colonne de droite). */}
          <div className="dcx w-full" style={{ color: "#0C1F1C" }}>
            <TunnelProvider>
              <EstimationForm commune={{ codeInsee: stats.code_insee, nom }} />
            </TunnelProvider>
          </div>
          <p className="text-lg text-muted-foreground lg:hidden">
            {introCommune(stats, prix, t)}
          </p>
        </div>

        {/* Chiffres clés */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <Building2 className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.appart")}
              </p>
              <p className="text-2xl font-bold">
                {prix.appart ? euroM2(prix.appart) : na}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Home className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.maison")}
              </p>
              <p className="text-2xl font-bold">
                {prix.maison ? euroM2(prix.maison) : na}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Receipt className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.ventes", { fenetre: prix.fenetre })}
              </p>
              <p className="text-2xl font-bold">
                {format.number(prix.ventes, "integer")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <LineChart className="size-5 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("chiffres.evolution")}
              </p>
              <p className="text-2xl font-bold">
                {evolutionAffichable(stats)
                  ? formatEvo(stats.evolution_1an_pct, t, na)
                  : na}
              </p>
            </CardContent>
          </Card>
        </div>

        {aDesVentes && (
          <p className="mt-3 text-xs text-muted-foreground">
            {prix.fenetre === "36m" && <>{t("chiffres.fenetre36")} </>}
            {t("chiffres.maj", {
              dvf: tc("mentions.dvf"),
              fenetre: prix.fenetre,
              date: majChiffres,
            })}
          </p>
        )}

        {/* Le marché en chiffres : volume, tendance, évolution longue */}
        {(volume || evolution || longue) && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("marche.titre", { nom })}
            </h2>
            <div className="mt-4 space-y-3">
              {volume && <p>{volume}</p>}
              {evolution && <p>{evolution}</p>}
              {longue && <p>{longue}</p>}
            </div>
          </section>
        )}

        {/* Série annuelle */}
        {faits.serieAnnuelle.length > 1 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("annees.titre", { nom })}
            </h2>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("annees.annee")}</TableHead>
                  <TableHead>{t("annees.appart")}</TableHead>
                  <TableHead>{t("annees.maison")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faits.serieAnnuelle.map((ligne) => (
                  <TableRow key={ligne.annee}>
                    <TableCell className="font-medium">{ligne.annee}</TableCell>
                    <TableCell>
                      {ligne.appart?.prix
                        ? t("annees.cellule", { prix: ligne.appart.prix, n: ligne.appart.nb })
                        : na}
                    </TableCell>
                    <TableCell>
                      {ligne.maison?.prix
                        ? t("annees.cellule", { prix: ligne.maison.prix, n: ligne.maison.nb })
                        : na}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">{t("annees.note")}</p>
          </section>
        )}

        {/* Communes voisines et département */}
        {faits.typeReference && voisinesComparees.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("voisines.titre", { nom })}
            </h2>
            {voisines && <p className="mt-4">{voisines}</p>}
            {vsDepartement && <p className="mt-3">{vsDepartement}</p>}
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("voisines.commune")}</TableHead>
                  <TableHead>{t("voisines.distance")}</TableHead>
                  <TableHead>{t("voisines.prix", { type: faits.typeReference })}</TableHead>
                  <TableHead>{t("voisines.ventes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell className="font-semibold">{nom}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-semibold">
                    {faits.prixReference ? euroM2(faits.prixReference) : na}
                  </TableCell>
                  <TableCell>{format.number(stats.nb_ventes_12m, "integer")}</TableCell>
                </TableRow>
                {voisinesComparees.map((v) => (
                  <TableRow key={v.slug}>
                    <TableCell>
                      <Link
                        href={`/prix-immobilier/${v.slug}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {v.nom_commune}
                      </Link>
                    </TableCell>
                    <TableCell>{t("voisines.km", { km: v.distance_km })}</TableCell>
                    <TableCell>{v.prix ? euroM2(v.prix) : na}</TableCell>
                    <TableCell>{format.number(v.nb_ventes_12m, "integer")}</TableCell>
                  </TableRow>
                ))}
                {departement && faits.prixDepartement && (
                  <TableRow className="text-muted-foreground">
                    <TableCell>{t("voisines.ligneDepartement", { nom: departement })}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{euroM2(faits.prixDepartement)}</TableCell>
                    <TableCell>
                      {contexte?.departement
                        ? format.number(contexte.departement.nb_ventes_12m, "integer")
                        : na}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        )}

        {/* La commune en bref (INSEE) */}
        {faits.insee && bref.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">{t("bref.titre", { nom })}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <Users className="size-5 text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("bref.tuilePopulation")}</p>
                  <p className="text-xl font-bold">
                    {faits.insee.population ? format.number(faits.insee.population, "integer") : na}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Home className="size-5 text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("bref.tuileProprietaires")}</p>
                  <p className="text-xl font-bold">
                    {faits.insee.partProprietaires !== null
                      ? t("bref.pct", { v: String(faits.insee.partProprietaires) })
                      : na}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Building2 className="size-5 text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("bref.tuileMaisons")}</p>
                  <p className="text-xl font-bold">
                    {faits.insee.partMaisons !== null
                      ? t("bref.pct", { v: String(faits.insee.partMaisons) })
                      : na}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 space-y-2">
              {bref.map((phrase) => (
                <p key={phrase}>{phrase}</p>
              ))}
            </div>
          </section>
        )}

        {/* Loyers */}
        {loyers && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("loyers.titre", { nom })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.appart")}
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_appartement
                      ? t("loyers.parM2", { valeur: loyers.loyer_m2_appartement })
                      : na}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.typologies")}
                  </p>
                  <p className="text-xl font-bold">
                    {t("loyers.fourchette", {
                      bas: loyers.loyer_m2_appt_t1_t2
                        ? format.number(loyers.loyer_m2_appt_t1_t2, "decimal1")
                        : na,
                      haut: loyers.loyer_m2_appt_t3_plus
                        ? format.number(loyers.loyer_m2_appt_t3_plus, "decimal1")
                        : na,
                    })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("loyers.maison")}
                  </p>
                  <p className="text-xl font-bold">
                    {loyers.loyer_m2_maison
                      ? t("loyers.parM2", { valeur: loyers.loyer_m2_maison })
                      : na}
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("loyers.note", {
                anil: tc("mentions.anil"),
                millesime: String(loyers.millesime),
              })}
            </p>
          </section>
        )}

        {/* CTA estimation */}
        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{t("cta.titre", { nom })}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("cta.texte")}
              </p>
            </div>
            <a
              href="#estimation"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              {t("cta.bouton")}
            </a>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            {t("faq.titre", { nom })}
          </h2>
          <div className="mt-4 space-y-6">
            {faq.map((f) => (
              <div key={f.question}>
                <h3 className="font-semibold">{f.question}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.reponse}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sources et mise à jour */}
        <section className="mt-12 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">{t("sources.titre")}</h2>
          <ul className="mt-2 space-y-1">
            {aDesVentes && (
              <li>
                {contexte?.derniere_vente
                  ? t("sources.dvf", { derniereVente: new Date(contexte.derniere_vente) })
                  : t("sources.dvfSansDate")}
              </li>
            )}
            {faits.insee && <li>{t("sources.insee", { millesime: String(faits.insee.millesime) })}</li>}
            {loyers && (
              <li>{t("sources.anil", { anil: tc("mentions.anil"), millesime: String(loyers.millesime) })}</li>
            )}
            <li>{t("sources.maj", { date: majPage })}</li>
          </ul>
        </section>

        {/* Maillage interne : communes voisines (distance à vol d'oiseau),
            sinon les plus actives du département */}
        {(faits.voisines.length > 0 || voisinesDept.length > 0) && (
          <section className="mt-12 border-t pt-8">
            <h2 className="text-lg font-semibold">
              {faits.voisines.length > 0
                ? t("maillage.proches", { nom })
                : t("maillage.titre", { code: stats.departement })}
            </h2>
            {departement && (
              <p className="mt-1 text-sm text-muted-foreground">
                <Link
                  href={hrefDepartement(stats.departement)}
                  className="text-primary underline underline-offset-4"
                >
                  {t("maillage.toutes", {
                    nom: departement,
                    code: stats.departement,
                    paris: String(departement === "Paris"),
                  })}
                </Link>
              </p>
            )}
            <ul className="mt-3 flex flex-wrap gap-2">
              {(faits.voisines.length > 0
                ? faits.voisines.slice(0, 10).map((v) => ({
                    slug: v.slug,
                    libelle: t("maillage.procheDistance", { nom: v.nom_commune, km: v.distance_km }),
                  }))
                : voisinesDept.map((v) => ({ slug: v.slug, libelle: v.nom_commune }))
              ).map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/prix-immobilier/${v.slug}`}
                    className="inline-block rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {v.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          {tc("mentions.disclaimer")}
        </p>
      </div>
    </>
  );
}
