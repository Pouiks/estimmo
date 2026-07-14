import type { Metadata } from "next";
import { EstimationForm } from "@/components/estimation/estimation-form";

export const metadata: Metadata = {
  title: "Estimation gratuite de votre bien",
  description:
    "Estimez le prix de vente ou le loyer de votre appartement ou maison en 4 étapes, sur la base des données officielles DVF et ANIL.",
};

export default function EstimationPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Estimez votre bien gratuitement
        </h1>
        <p className="mt-2 text-muted-foreground">
          2 minutes suffisent — résultat immédiat, basé sur les ventes réelles
          de votre quartier.
        </p>
      </div>
      <EstimationForm />
    </div>
  );
}
