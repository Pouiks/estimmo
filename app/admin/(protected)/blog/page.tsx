import Link from "next/link";
import { Eye, ExternalLink, ImageOff, PenSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { PublicationArticleButton } from "@/components/admin/publication-article-button";
import { resoudreImage, type Visuels } from "@/lib/blog/images";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Blog", robots: { index: false } };

const CATEGORIES: Record<string, string> = {
  estimation: "Estimation",
  vente: "Vente",
  "achat-fiscalite": "Achat & fiscalité",
};

type Etat = "en-ligne" | "programme" | "brouillon";

const ETATS: Record<Etat, { libelle: string; classe: string }> = {
  "en-ligne": { libelle: "En ligne", classe: "bg-green-100 text-green-800" },
  programme: { libelle: "Programmé", classe: "bg-sky-100 text-sky-800" },
  brouillon: { libelle: "Brouillon", classe: "bg-amber-100 text-amber-800" },
};

interface Ligne {
  id: string;
  slug: string;
  titre: string;
  statut: "brouillon" | "publie";
  lang: string | null;
  categorie: string | null;
  published_at: string | null;
  contenu_html: string | null;
  image_cover: string | null;
  images: { src: string }[];
  visuels: Visuels;
}

export default async function AdminBlogPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, titre, statut, lang, categorie, published_at, contenu_html, image_cover, images, visuels")
    .order("published_at", { ascending: false, nullsFirst: true });

  if (error) throw new Error(error.message);
  const articles = (data ?? []) as Ligne[];

  const maintenant = new Date();
  const etat = (a: Ligne): Etat =>
    a.statut !== "publie" || !a.published_at
      ? "brouillon"
      : new Date(a.published_at) <= maintenant
        ? "en-ligne"
        : "programme";

  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const compte = (e: Etat) => articles.filter((a) => etat(a) === e).length;
  const prochain = articles
    .filter((a) => etat(a) === "programme")
    .sort((a, b) => (a.published_at! < b.published_at! ? -1 : 1))[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          {articles.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {compte("en-ligne")} en ligne · {compte("programme")} programmé(s) ·{" "}
              {compte("brouillon")} brouillon(s)
              {prochain?.published_at &&
                ` - prochain : ${dateFmt.format(new Date(prochain.published_at))}`}
            </p>
          )}
        </div>
        <Button render={<Link href="/admin/blog/nouveau" />}>
          <Plus className="size-4" /> Nouvel article
        </Button>
      </div>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun article pour le moment. Importez les articles rédigés avec
          « pnpm import:articles » ou créez-en un.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>Publier</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => {
                const e = etat(article);
                const visuels = article.contenu_html
                  ? [article.image_cover, ...article.images.map((i) => i.src)].filter(Boolean)
                  : [];
                const manquants = visuels.filter((src) => !resoudreImage(src, article.visuels)).length;
                const chemin = `${article.lang === "en" ? "/en" : ""}/blog/${article.slug}`;
                return (
                  <TableRow key={article.id}>
                    <TableCell className="max-w-md whitespace-normal">
                      <Link
                        href={`/admin/blog/${article.id}`}
                        className="font-medium hover:underline"
                      >
                        {article.titre}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="rounded border px-1 font-mono uppercase">
                          {article.lang ?? "fr"}
                        </span>
                        {article.categorie && <span>{CATEGORIES[article.categorie]}</span>}
                        <span>{chemin}</span>
                        {manquants > 0 && (
                          <span
                            className="flex items-center gap-1 text-amber-700"
                            title="À envoyer depuis la page de l'article (un aplat neutre s'affiche en attendant)"
                          >
                            <ImageOff className="size-3" /> {manquants}/{visuels.length} image(s) manquante(s)
                          </span>
                        )}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={ETATS[e].classe}>{ETATS[e].libelle}</Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {article.published_at
                        ? dateFmt.format(new Date(article.published_at))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {e === "brouillon" && (
                          <PublicationArticleButton articleId={article.id} action="publier" titre={article.titre} />
                        )}
                        {e === "programme" && (
                          <PublicationArticleButton articleId={article.id} action="maintenant" titre={article.titre} />
                        )}
                        {e !== "brouillon" && (
                          <PublicationArticleButton articleId={article.id} action="depublier" titre={article.titre} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {e === "en-ligne" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<a href={chemin} target="_blank" rel="noreferrer" />}
                            aria-label="Voir sur le site"
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                        ) : (
                          article.contenu_html && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={<Link href={`/admin/blog/${article.id}/apercu`} />}
                              aria-label="Aperçu"
                            >
                              <Eye className="size-4" />
                            </Button>
                          )
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/admin/blog/${article.id}`} />}
                          aria-label="Modifier"
                        >
                          <PenSquare className="size-4" />
                        </Button>
                        <DeleteArticleButton articleId={article.id} titre={article.titre} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
