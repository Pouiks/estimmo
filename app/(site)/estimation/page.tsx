import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estimation gratuite de votre bien",
  description:
    "Estimez le prix de vente ou le loyer de votre appartement ou maison en 4 étapes, sur la base des données officielles DVF et ANIL.",
};

// Placeholder — le formulaire 4 étapes est livré en Phase 4.
export default function EstimationPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        Estimation de votre bien
      </h1>
      <p className="mt-4 text-muted-foreground">
        Le formulaire d'estimation arrive ici (Phase 4 — en construction).
      </p>
    </div>
  );
}
