import type { Metadata } from "next";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Politique de confidentialité
      </h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Responsable de traitement</h2>
        <p className="text-muted-foreground">
          Le responsable de traitement des données collectées sur {SITE.name}{" "}
          est CARENZA BROWN — {SITE.agent.email} — {SITE.agent.phone}.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Données collectées</h2>
        <p className="text-muted-foreground">
          Lors d'une demande d'estimation, nous collectons : vos coordonnées
          (prénom, nom, email, téléphone), les caractéristiques du bien décrit
          (adresse, surface, état…) ainsi que la date et la preuve de votre
          consentement.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Finalités et base légale</h2>
        <p className="text-muted-foreground">
          Ces données sont utilisées, sur la base de votre consentement
          explicite, pour&nbsp;: (1) calculer et vous transmettre l'estimation
          de votre bien&nbsp;; (2) vous recontacter au sujet de votre projet
          immobilier. Elles ne sont jamais revendues à des tiers.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Destinataires et sous-traitants</h2>
        <p className="text-muted-foreground">
          Les données sont hébergées par Supabase (base de données) et Vercel
          (hébergement du site). L'envoi des emails transactionnels est assuré
          par Brevo. Les données sont également transmises à l'outil de gestion
          de la relation client (CRM) du responsable de traitement.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Durée de conservation</h2>
        <p className="text-muted-foreground">
          Les données des prospects sont conservées <strong>3 ans après le
          dernier contact</strong>, puis supprimées ou anonymisées.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Vos droits</h2>
        <p className="text-muted-foreground">
          Conformément au RGPD, vous disposez d'un droit d'accès, de
          rectification, d'effacement, de limitation et d'opposition sur vos
          données. Pour l'exercer, écrivez à{" "}
          <a
            href={`mailto:${SITE.agent.email}`}
            className="underline underline-offset-4"
          >
            {SITE.agent.email}
          </a>
          . Vous pouvez également introduire une réclamation auprès de la CNIL
          (cnil.fr).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Cookies</h2>
        <p className="text-muted-foreground">
          Ce site n'utilise pas de cookies publicitaires. Seuls des cookies
          techniques strictement nécessaires (session d'administration) et une
          mesure d'audience sans cookie sont utilisés.
        </p>
      </section>
    </div>
  );
}
