import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { extraireTexte } from "@/lib/blog/render";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 86400; // + revalidation on-demand à la publication

export const metadata: Metadata = {
  title: "Blog immobilier - conseils pour vendre, louer et estimer",
  description:
    "Conseils pour vendre, louer et estimer votre bien immobilier : prix, fiscalité, diagnostics, tendances du marché.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const supabase = createAdminClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, titre, meta_description, contenu, image_cover, published_at")
    .eq("statut", "publie")
    .order("published_at", { ascending: false })
    .limit(50);

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Le blog ESTIMMO
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Vendre, louer, estimer : nos conseils pour réussir votre projet
        immobilier.
      </p>

      {(articles ?? []).length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Les premiers articles arrivent bientôt.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {(articles ?? []).map((article) => (
            <Card key={article.slug} className="overflow-hidden pt-0">
              <Link href={`/blog/${article.slug}`} className="group block">
                {article.image_cover ? (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={article.image_cover}
                      alt={article.titre}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-primary/5 text-2xl font-bold text-primary/40">
                    ESTIMMO
                  </div>
                )}
                <CardContent className="pt-4">
                  {article.published_at && (
                    <p className="text-xs text-muted-foreground">
                      {dateFmt.format(new Date(article.published_at))}
                    </p>
                  )}
                  <h2 className="mt-1 text-lg font-semibold group-hover:underline">
                    {article.titre}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {article.meta_description ??
                      extraireTexte(article.contenu, 160)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
