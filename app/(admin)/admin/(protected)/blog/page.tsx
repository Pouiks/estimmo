import Link from "next/link";
import { PenSquare, Plus } from "lucide-react";
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
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Blog", robots: { index: false } };

export default async function AdminBlogPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, titre, statut, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <Button render={<Link href="/admin/blog/nouveau" />}>
          <Plus className="size-4" /> Nouvel article
        </Button>
      </div>

      {(articles ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun article pour le moment — créez le premier !
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Publié le</TableHead>
                <TableHead>Modifié le</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(articles ?? []).map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <Link
                      href={`/admin/blog/${article.id}`}
                      className="font-medium hover:underline"
                    >
                      {article.titre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      /blog/{article.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        article.statut === "publie"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {article.statut === "publie" ? "Publié" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.published_at
                      ? dateFmt.format(new Date(article.published_at))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateFmt.format(new Date(article.updated_at))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/blog/${article.id}`} />}
                        aria-label="Modifier"
                      >
                        <PenSquare className="size-4" />
                      </Button>
                      <DeleteArticleButton
                        articleId={article.id}
                        titre={article.titre}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
