"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Mail,
  PhoneCall,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  EstimationLocation,
  EstimationVente,
} from "@/lib/estimation/types";
import { MENTIONS, SITE } from "@/lib/config";

export type ResultatApi = {
  leadId: string;
  manuelle: boolean;
  estimation: EstimationVente | EstimationLocation | null;
};

const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const CONFIANCE_LABELS: Record<string, { label: string; className: string }> = {
  haute: { label: "Confiance élevée", className: "bg-green-100 text-green-800" },
  moyenne: { label: "Confiance moyenne", className: "bg-amber-100 text-amber-800" },
  faible: { label: "Confiance limitée", className: "bg-muted text-muted-foreground" },
  indicative: { label: "Estimation indicative", className: "bg-muted text-muted-foreground" },
};

function zoneLabel(estimation: EstimationVente): string {
  if (estimation.palier === "rayon" && estimation.rayonM) {
    return `dans un rayon de ${estimation.rayonM.toLocaleString("fr-FR")} m`;
  }
  if (estimation.palier === "commune") return "à l'échelle de votre commune";
  return "à l'échelle de votre département";
}

function BlocCommercial({ projet }: { projet: "vente" | "location" }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">
          {projet === "vente"
            ? "Vendez au meilleur prix"
            : "Louez vite et au juste prix"}
        </h3>
        {projet === "vente" && (
          <p className="text-sm">
            Honoraires <strong>{SITE.honoraires.exclusif}</strong> en mandat
            exclusif — diffusion prioritaire, photos professionnelles,
            engagement de moyens écrit — contre {SITE.honoraires.simple} en
            mandat simple.
          </p>
        )}
        <div className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <strong>C'est noté !</strong> {SITE.agent.name} vous rappelle
            rapidement au numéro indiqué pour affiner votre estimation —
            gratuitement et sans engagement.
          </p>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          render={<a href={SITE.agent.phoneHref} />}
        >
          <PhoneCall className="size-4" />
          Ou appelez directement : {SITE.agent.phone}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ResultatEstimation({ resultat }: { resultat: ResultatApi }) {
  const { estimation } = resultat;

  // --- Zone non couverte / trop peu de comparables → analyse manuelle ---
  if (resultat.manuelle || estimation === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <PhoneCall className="size-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              Votre secteur nécessite une analyse personnalisée
            </h2>
            <p className="mx-auto max-w-md text-muted-foreground">
              Les données publiques ne permettent pas d'estimation automatique
              fiable pour votre bien. <strong>Votre estimation vous est
              offerte : {SITE.agent.name} vous rappelle sous 24 h</strong> avec
              une analyse complète de votre marché local.
            </p>
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" /> Un email de confirmation vient de
              vous être envoyé.
            </p>
          </CardContent>
        </Card>
        <BlocCommercial projet="vente" />
      </div>
    );
  }

  const confiance = CONFIANCE_LABELS[estimation.confiance];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              {estimation.projet === "vente"
                ? "Votre estimation de vente"
                : "Votre estimation de loyer"}
            </h2>
            <Badge className={confiance.className}>
              <BadgeCheck className="size-3.5" />
              {confiance.label}
            </Badge>
          </div>

          {estimation.projet === "vente" ? (
            <>
              <div className="grid grid-cols-3 items-end gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Basse</p>
                  <p className="text-lg font-semibold sm:text-xl">
                    {euro(estimation.fourchetteBasse)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary px-2 py-4 text-primary-foreground">
                  <p className="text-xs uppercase opacity-80">Estimation</p>
                  <p className="text-2xl font-bold sm:text-3xl">
                    {euro(estimation.mediane)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Haute</p>
                  <p className="text-lg font-semibold sm:text-xl">
                    {euro(estimation.fourchetteHaute)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-center text-sm text-muted-foreground">
                <p>
                  Prix de votre zone :{" "}
                  <strong className="text-foreground">
                    {euro(estimation.prixM2Zone)}/m²
                  </strong>
                  {estimation.ajustementPct !== 0 && (
                    <>
                      {" "}
                      — ajusté de {estimation.ajustementPct > 0 ? "+" : ""}
                      {estimation.ajustementPct} % selon vos réponses
                    </>
                  )}
                </p>
                <p>
                  Basé sur <strong>{estimation.nbComparables} ventes
                  comparables</strong> {zoneLabel(estimation)}. {MENTIONS.dvf}.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 items-end gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Basse</p>
                  <p className="text-lg font-semibold sm:text-xl">
                    {euro(estimation.loyerBas)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary px-2 py-4 text-primary-foreground">
                  <p className="text-xs uppercase opacity-80">Loyer mensuel</p>
                  <p className="text-2xl font-bold sm:text-3xl">
                    {euro(estimation.loyerMedian)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Haute</p>
                  <p className="text-lg font-semibold sm:text-xl">
                    {euro(estimation.loyerHaut)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-center text-sm text-muted-foreground">
                <p>
                  Loyer de référence :{" "}
                  <strong className="text-foreground">
                    {estimation.loyerM2Zone.toLocaleString("fr-FR")} €/m²
                  </strong>{" "}
                  (charges comprises)
                </p>
                <p>
                  {MENTIONS.anil} (millésime {estimation.millesime}).
                </p>
              </div>

              {estimation.dpeAlerte && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {estimation.dpeAlerte === "interdit_depuis_2025" &&
                      "DPE G : la location de ce logement est interdite depuis janvier 2025 (loi Climat et Résilience). Des travaux de rénovation énergétique sont nécessaires avant la mise en location."}
                    {estimation.dpeAlerte === "interdit_2028" &&
                      "DPE F : la location de ce logement sera interdite à partir de 2028 (loi Climat et Résilience). Anticipez les travaux de rénovation énergétique."}
                    {estimation.dpeAlerte === "interdit_2034" &&
                      "DPE E : la location de ce logement sera interdite à partir de 2034 (loi Climat et Résilience)."}
                  </p>
                </div>
              )}
            </>
          )}

          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" /> Récapitulatif envoyé par email.
          </p>
        </CardContent>
      </Card>

      <BlocCommercial projet={estimation.projet} />

      <p className="text-center text-xs text-muted-foreground">
        {MENTIONS.disclaimer}
      </p>
    </div>
  );
}
