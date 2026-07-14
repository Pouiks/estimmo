import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog immobilier",
  description:
    "Conseils pour vendre, louer et estimer votre bien immobilier : prix, fiscalité, diagnostics, tendances du marché.",
};

// Placeholder — le rendu des articles Supabase/TipTap est livré en Phase 6/7.
export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Le blog ESTIMMO</h1>
      <p className="mt-4 text-muted-foreground">
        Les premiers articles arrivent bientôt.
      </p>
    </div>
  );
}
