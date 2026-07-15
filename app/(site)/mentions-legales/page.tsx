import type { Metadata } from "next";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

export default function MentionsLegalesPage() {
  return (
    <div className="prose prose-neutral mx-auto max-w-3xl px-4 py-16 dark:prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">Mentions légales</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Éditeur du site</h2>
        <p className="text-muted-foreground">
          Le site {SITE.name} est édité par {SITE.agent.name}, agent immobilier.
          <br />
          {/* À COMPLÉTER : forme juridique, SIREN/SIRET, carte professionnelle
              (CPI), garantie financière, RCP, adresse du siège. */}
          Contact : {SITE.agent.email} - {SITE.agent.phone}.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Hébergement</h2>
        <p className="text-muted-foreground">
          Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut,
          CA 91789, États-Unis (vercel.com). Les données sont stockées par
          Supabase Inc. (supabase.com).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Honoraires</h2>
        <p className="text-muted-foreground">
          Honoraires d'agence : {SITE.honoraires.exclusif} TTC du prix de vente
          en mandat exclusif, {SITE.honoraires.simple} TTC en mandat simple.
          Barème complet communiqué sur demande et affiché en agence.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Sources de données</h2>
        <p className="text-muted-foreground">
          Les statistiques de prix de vente sont issues de la base «&nbsp;Demandes
          de valeurs foncières&nbsp;» (DVF) publiée par la DGFiP sur
          data.gouv.fr (Licence Ouverte 2.0). Seules des statistiques agrégées
          sont affichées. Les indicateurs de loyers sont des estimations ANIL, à
          partir des données du Groupe SeLoger et de leboncoin. Le géocodage des
          adresses utilise la Géoplateforme IGN.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Propriété intellectuelle</h2>
        <p className="text-muted-foreground">
          L'ensemble des contenus de ce site (textes, marques, logos,
          structure) est protégé. Toute reproduction non autorisée est
          interdite.
        </p>
      </section>
    </div>
  );
}
