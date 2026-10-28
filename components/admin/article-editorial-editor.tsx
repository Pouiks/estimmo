"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditeurCorps } from "@/components/admin/editeur-corps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  creerTraduction,
  saveArticleEditorial,
  type ArticleEditorialInput,
} from "@/app/admin/(protected)/blog/actions";

export type ArticleEditorialData = ArticleEditorialInput;

const CATEGORIES = [
  ["estimation", "Estimation"],
  ["vente", "Vente"],
  ["achat-fiscalite", "Achat & fiscalité"],
] as const;

const classeSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Compteur de caractères (longueurs conseillées pour Google). */
function Compteur({ valeur, max }: { valeur: string; max: number }) {
  return (
    <span className={cn("text-xs", valeur.length > max ? "text-destructive" : "text-muted-foreground")}>
      {valeur.length}/{max}
    </span>
  );
}

/**
 * Édition d'un article éditorial (HTML importé) : métadonnées SEO, date de
 * publication, couverture, corps HTML, FAQ et « À lire aussi ».
 */
export function ArticleEditorialEditor({
  article,
  autresArticles,
  versionLiee,
  articlesFrancais,
  motsCles,
  imagesResolues,
}: {
  article: ArticleEditorialData;
  /** « À lire aussi » : articles de la même langue. */
  autresArticles: { slug: string; titre: string }[];
  /** L'autre version de cet article (original français ou version anglaise). */
  versionLiee: { id: string; titre: string; lang: string; statut: string } | null;
  /** Originaux possibles pour une version anglaise. */
  articlesFrancais: { id: string; titre: string }[];
  motsCles: string[];
  /** Chemin logique → URL affichable des images (aperçu dans l'éditeur visuel). */
  imagesResolues: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creation, startCreation] = useTransition();
  const [a, setA] = useState(article);
  const maj = <K extends keyof ArticleEditorialData>(cle: K, valeur: ArticleEditorialData[K]) =>
    setA((prev) => ({ ...prev, [cle]: valeur }));

  const faq = a.faq ?? [];
  const lies = a.articlesLies ?? [];

  function enregistrer() {
    startTransition(async () => {
      const result = await saveArticleEditorial(a);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.message);
    });
  }

  function creerVersionAnglaise() {
    startCreation(async () => {
      const result = await creerTraduction(a.id);
      if (result.ok && result.id) {
        toast.success(result.message);
        router.push(`/admin/blog/${result.id}`);
      } else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="titre">Titre (h1 de la page)</Label>
          <Input id="titre" value={a.titre} onChange={(e) => maj("titre", e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="metaTitle">Meta title (onglet et résultat Google)</Label>
            <Compteur valeur={a.metaTitle} max={60} />
          </div>
          <Input id="metaTitle" value={a.metaTitle} onChange={(e) => maj("metaTitle", e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="metaDescription">Meta description</Label>
            <Compteur valeur={a.metaDescription} max={160} />
          </div>
          <Textarea
            id="metaDescription"
            rows={2}
            value={a.metaDescription}
            onChange={(e) => maj("metaDescription", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extrait">Extrait (carte de la page /blog)</Label>
          <Textarea id="extrait" rows={2} value={a.extrait} onChange={(e) => maj("extrait", e.target.value)} />
        </div>

        <EditeurCorps
          valeur={a.contenuHtml}
          onChange={(html) => maj("contenuHtml", html)}
          imagesResolues={imagesResolues}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Questions fréquentes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => maj("faq", [...faq, { question: "", answer: "" }])}
            >
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
          {faq.map((q, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Question"
                  value={q.question}
                  onChange={(e) =>
                    maj("faq", faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la question"
                  onClick={() => maj("faq", faq.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                placeholder="Réponse"
                rows={3}
                value={q.answer}
                onChange={(e) =>
                  maj("faq", faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-5">
        <div className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="statut">Statut</Label>
            <select
              id="statut"
              className={classeSelect}
              value={a.statut}
              onChange={(e) => maj("statut", e.target.value as "brouillon" | "publie")}
            >
              <option value="publie">Publié (programmé si la date est future)</option>
              <option value="brouillon">Brouillon</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Date de publication (heure de Paris)</Label>
            <Input
              id="publishedAt"
              type="datetime-local"
              value={a.publishedAt}
              onChange={(e) => maj("publishedAt", e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={pending} onClick={enregistrer}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="lang">Langue</Label>
            <select
              id="lang"
              className={classeSelect}
              value={a.lang}
              onChange={(e) => maj("lang", e.target.value as "fr" | "en")}
            >
              <option value="fr">Français (/blog)</option>
              <option value="en">Anglais (/en/blog)</option>
            </select>
          </div>
          {a.lang === "en" ? (
            <div className="space-y-2">
              <Label htmlFor="traductionDe">Version anglaise de</Label>
              <select
                id="traductionDe"
                className={classeSelect}
                value={a.traductionDe ?? ""}
                onChange={(e) => maj("traductionDe", e.target.value || null)}
              >
                <option value="">- (article indépendant)</option>
                {articlesFrancais.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Relie les deux versions : hreflang pour Google, bascule FR/EN sur le
                site, liens internes et « À lire aussi » traduits automatiquement.
              </p>
            </div>
          ) : versionLiee ? (
            <p className="text-sm">
              Version anglaise :{" "}
              <Link href={`/admin/blog/${versionLiee.id}`} className="font-medium hover:underline">
                {versionLiee.titre}
              </Link>{" "}
              <span className="text-muted-foreground">
                ({versionLiee.statut === "publie" ? "publiée" : "brouillon"})
              </span>
            </p>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={creation}
                onClick={creerVersionAnglaise}
              >
                {creation ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
                Créer la version anglaise
              </Button>
              <p className="text-xs text-muted-foreground">
                Copie l&apos;article en brouillon sous /en/blog, à traduire ensuite.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL /blog/…)</Label>
            <Input id="slug" value={a.slug} onChange={(e) => maj("slug", e.target.value)} />
            <p className="text-xs text-muted-foreground">
              À ne plus changer une fois l'article en ligne (liens et référencement perdus).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie</Label>
            <select
              id="categorie"
              className={classeSelect}
              value={a.categorie}
              onChange={(e) => maj("categorie", e.target.value as ArticleEditorialData["categorie"])}
            >
              {CATEGORIES.map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div className="space-y-2">
              <Label htmlFor="auteur">Auteur</Label>
              <Input id="auteur" value={a.auteur} onChange={(e) => maj("auteur", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempsLecture">Lecture (min)</Label>
              <Input
                id="tempsLecture"
                type="number"
                min={1}
                max={60}
                value={a.tempsLecture}
                onChange={(e) => maj("tempsLecture", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border p-4">
          <Label>À lire aussi (3 articles)</Label>
          {[0, 1, 2].map((i) => (
            <select
              key={i}
              className={classeSelect}
              aria-label={`Article lié ${i + 1}`}
              value={lies[i] ?? ""}
              onChange={(e) => {
                const suivants = [...lies];
                suivants[i] = e.target.value;
                maj("articlesLies", suivants.filter(Boolean));
              }}
            >
              <option value="">-</option>
              {autresArticles.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.titre}
                </option>
              ))}
            </select>
          ))}
        </div>

        {motsCles.length > 0 && (
          <div className="space-y-2 rounded-xl border p-4">
            <Label>Mots-clés ciblés (usage interne)</Label>
            <div className="flex flex-wrap gap-1.5">
              {motsCles.map((m, i) => (
                <span
                  key={m}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    i === 0 && "border-primary text-primary"
                  )}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
