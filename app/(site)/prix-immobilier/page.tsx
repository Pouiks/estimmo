import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MENTIONS } from "@/lib/config";
import { getTopCommunes } from "@/lib/seo/communes";
import { euro } from "@/lib/seo/templates";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Prix immobilier par commune - prix au m² en France",
  description:
    "Consultez les prix immobiliers au m² de plus de 30 000 communes françaises : prix médians appartement et maison issus des ventes réelles (DVF) et loyers ANIL.",
  alternates: { canonical: "/prix-immobilier" },
};

export default async function PrixImmobilierIndexPage() {
  const communes = await getTopCommunes(100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Prix immobilier en France, commune par commune
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Prix médians au m² calculés à partir des ventes réellement enregistrées
        par l'État (base DVF) et loyers de référence ANIL, pour plus de 30 000
        communes. Sélectionnez une ville ou estimez directement votre bien.
      </p>

      <div className="mt-6">
        <Button size="lg" render={<Link href="/estimation" />}>
          Estimer mon bien gratuitement
        </Button>
      </div>

      <h2 className="mt-12 text-xl font-bold">Les marchés les plus actifs</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {communes.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/prix-immobilier/${c.slug}`}
              className="flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary"
            >
              <span className="font-medium">
                {c.nom_commune}{" "}
                <span className="text-muted-foreground">({c.code_postal})</span>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                {c.prix_m2_median_appartement
                  ? `${euro(c.prix_m2_median_appartement)}/m²`
                  : "loyers"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        {MENTIONS.dvf}. {MENTIONS.anil}.
      </p>
    </div>
  );
}
