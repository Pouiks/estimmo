"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Languages, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditeurCorps } from "@/components/admin/editeur-corps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { traductionDepuis, type Faq, type VersionInput } from "@/lib/blog/traductions";
import { cn } from "@/lib/utils";
import {
  saveArticleEditorial,
  type ArticleEditorialInput,
} from "@/app/admin/(protected)/blog/actions";

/** État de l'éditeur : l'article français + sa version anglaise éventuelle. */
export type ArticleEditorialData = Omit<ArticleEditorialInput, "traductions"> & {
  traductions: { en?: VersionInput };
};

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

/** Champs qui existent dans chaque langue (mêmes règles, mêmes libellés). */
interface ChampsVersionValeurs {
  titre: string;
  metaTitle: string;
  metaDescription: string;
  extrait: string;
  contenuHtml: string;
  faq: Faq[];
}

/** Mise à jour partielle, appliquée fonctionnellement par le parent (jamais d'état périmé). */
type MajChamps = (patch: Partial<ChampsVersionValeurs>) => void;

/**
 * Titre, meta title, meta description, extrait, corps et FAQ d'une version
 * linguistique. Partagé par les onglets Français et English : une seule
 * mise en page, deux jeux de valeurs.
 */
function ChampsVersion({
  prefixe,
  valeurs,
  onChange,
  imagesResolues,
  cleEditeur,
  avantCorps,
}: {
  /** Préfixe des id HTML (fr / en) : labels distincts dans les deux onglets. */
  prefixe: string;
  valeurs: ChampsVersionValeurs;
  onChange: MajChamps;
  imagesResolues: Record<string, string>;
  /** Changer la clé recrée l'éditeur visuel (son contenu n'est lu qu'à la création). */
  cleEditeur?: string;
  /** Champs propres à une langue, insérés avant le corps (alt de couverture EN). */
  avantCorps?: ReactNode;
}) {
  const id = (champ: string) => `${prefixe}-${champ}`;
  const faq = valeurs.faq ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={id("titre")}>Titre (h1 de la page)</Label>
        <Input id={id("titre")} value={valeurs.titre} onChange={(e) => onChange({ titre: e.target.value })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id("metaTitle")}>Meta title (onglet et résultat Google)</Label>
          <Compteur valeur={valeurs.metaTitle} max={60} />
        </div>
        <Input
          id={id("metaTitle")}
          value={valeurs.metaTitle}
          onChange={(e) => onChange({ metaTitle: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id("metaDescription")}>Meta description</Label>
          <Compteur valeur={valeurs.metaDescription} max={160} />
        </div>
        <Textarea
          id={id("metaDescription")}
          rows={2}
          value={valeurs.metaDescription}
          onChange={(e) => onChange({ metaDescription: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("extrait")}>Extrait (carte de la page /blog)</Label>
        <Textarea
          id={id("extrait")}
          rows={2}
          value={valeurs.extrait}
          onChange={(e) => onChange({ extrait: e.target.value })}
        />
      </div>

      {avantCorps}

      <EditeurCorps
        key={cleEditeur}
        valeur={valeurs.contenuHtml}
        onChange={(html) => onChange({ contenuHtml: html })}
        imagesResolues={imagesResolues}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Questions fréquentes</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ faq: [...faq, { question: "", answer: "" }] })}
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
                  onChange({ faq: faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Supprimer la question"
                onClick={() => onChange({ faq: faq.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              placeholder="Réponse"
              rows={3}
              value={q.answer}
              onChange={(e) =>
                onChange({ faq: faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const VERSION_VIDE: VersionInput = {
  statut: "brouillon",
  titre: "",
  metaTitle: "",
  metaDescription: "",
  extrait: "",
  contenuHtml: "",
  faq: [],
  imageCoverAlt: "",
};

/**
 * Édition d'un article éditorial (HTML importé) : un onglet par langue
 * (textes, corps, FAQ), réglages communs dans la barre latérale (statut,
 * date, slug, catégorie, « À lire aussi »). Un seul enregistrement pour tout.
 */
export function ArticleEditorialEditor({
  article,
  autresArticles,
  motsCles,
  imageCoverAlt,
  imagesResolues,
}: {
  article: ArticleEditorialData;
  /** « À lire aussi » : les autres articles (même slug dans les deux langues). */
  autresArticles: { slug: string; titre: string }[];
  motsCles: string[];
  /** Alt français de la couverture (section Images) : point de départ de l'anglais. */
  imageCoverAlt: string;
  /** Chemin logique → URL affichable des images (aperçu dans l'éditeur visuel). */
  imagesResolues: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [a, setA] = useState(article);
  // Recrée l'éditeur visuel anglais quand son contenu est remplacé d'un bloc.
  const [generationEn, setGenerationEn] = useState(0);

  const maj = <K extends keyof ArticleEditorialData>(cle: K, valeur: ArticleEditorialData[K]) =>
    setA((prev) => ({ ...prev, [cle]: valeur }));
  /** Champs français (colonnes de l'article). */
  const majFr = (patch: Partial<ChampsVersionValeurs>) => setA((prev) => ({ ...prev, ...patch }));
  /** Champs de la version anglaise. */
  const majEn = (patch: Partial<VersionInput>) =>
    setA((prev) =>
      prev.traductions.en
        ? { ...prev, traductions: { en: { ...prev.traductions.en, ...patch } } }
        : prev
    );

  const en = a.traductions.en;
  const lies = a.articlesLies ?? [];

  function enregistrer() {
    startTransition(async () => {
      const result = await saveArticleEditorial(a);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  /** Point de départ de la version anglaise : le texte français, à traduire. */
  function partirDuFrancais() {
    if (
      en &&
      (en.titre || en.contenuHtml) &&
      !window.confirm("Remplacer la version anglaise actuelle par une copie du texte français ?")
    ) {
      return;
    }
    setA((prev) => ({
      ...prev,
      traductions: {
        en: {
          ...traductionDepuis({
            titre: prev.titre,
            meta_title: prev.metaTitle,
            meta_description: prev.metaDescription,
            extrait: prev.extrait,
            contenu_html: prev.contenuHtml,
            faq: prev.faq ?? [],
            image_cover_alt: imageCoverAlt,
          }),
          statut: prev.traductions.en?.statut ?? "brouillon",
        },
      },
    }));
    setGenerationEn((g) => g + 1);
  }

  function commencerAVide() {
    setA((prev) => ({ ...prev, traductions: { en: VERSION_VIDE } }));
    setGenerationEn((g) => g + 1);
  }

  function supprimerVersionAnglaise() {
    if (!window.confirm("Supprimer la version anglaise ? Son texte sera perdu à l'enregistrement.")) return;
    setA((prev) => ({ ...prev, traductions: {} }));
  }

  const etatEn = !en ? "absente" : en.statut === "publie" ? "publiée" : "brouillon";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <Tabs defaultValue="fr" className="gap-5">
        <TabsList>
          <TabsTrigger value="fr">Français</TabsTrigger>
          <TabsTrigger value="en">
            English
            <span
              className={cn(
                "rounded-full border px-1.5 text-[11px] leading-4",
                etatEn === "publiée" && "border-green-300 bg-green-50 text-green-800",
                etatEn === "brouillon" && "border-amber-300 bg-amber-50 text-amber-800",
                etatEn === "absente" && "text-muted-foreground"
              )}
            >
              {etatEn}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fr">
          <ChampsVersion
            prefixe="fr"
            valeurs={{
              titre: a.titre,
              metaTitle: a.metaTitle,
              metaDescription: a.metaDescription,
              extrait: a.extrait,
              contenuHtml: a.contenuHtml,
              faq: a.faq ?? [],
            }}
            onChange={majFr}
            imagesResolues={imagesResolues}
          />
        </TabsContent>

        {/* keepMounted : l'éditeur visuel anglais n'est pas recréé à chaque bascule d'onglet. */}
        <TabsContent value="en" keepMounted>
          {!en ? (
            <div className="space-y-4 rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de version anglaise. Elle partage l&apos;URL, les images, la date et
                les réglages de l&apos;article ; seuls les textes sont à traduire. Elle reste
                invisible tant qu&apos;elle est en brouillon.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" onClick={partirDuFrancais}>
                  <Languages className="size-4" /> Partir du texte français
                </Button>
                <Button type="button" variant="outline" onClick={commencerAVide}>
                  Commencer à vide
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
                <div className="min-w-64 flex-1 space-y-2">
                  <Label htmlFor="en-statut">Version anglaise</Label>
                  <select
                    id="en-statut"
                    className={classeSelect}
                    value={en.statut}
                    onChange={(e) => majEn({ statut: e.target.value as VersionInput["statut"] })}
                  >
                    <option value="brouillon">Brouillon (invisible sur le site)</option>
                    <option value="publie">
                      Publiée (sur /en/blog dès que l&apos;article est en ligne)
                    </option>
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={partirDuFrancais}>
                  <Languages className="size-4" /> Repartir du texte français
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={supprimerVersionAnglaise}
                >
                  <Trash2 className="size-4" /> Supprimer la version anglaise
                </Button>
              </div>

              <ChampsVersion
                prefixe="en"
                valeurs={en}
                onChange={majEn}
                imagesResolues={imagesResolues}
                cleEditeur={`en-${generationEn}`}
                avantCorps={
                  <div className="space-y-2">
                    <Label htmlFor="en-imageCoverAlt">Texte alternatif de la couverture</Label>
                    <Input
                      id="en-imageCoverAlt"
                      value={en.imageCoverAlt}
                      onChange={(e) => majEn({ imageCoverAlt: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Les images sont celles de la section Images (communes aux deux langues).
                      Les légendes des images du corps se traduisent dans le texte ci-dessous
                      (leur attribut alt en mode HTML).
                    </p>
                  </div>
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

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
          <p className="text-xs text-muted-foreground">
            Enregistre les deux langues. Statut et date valent pour l&apos;article entier ;
            la version anglaise a son propre interrupteur dans l&apos;onglet English.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL /blog/… et /en/blog/…)</Label>
            <Input id="slug" value={a.slug} onChange={(e) => maj("slug", e.target.value)} />
            <p className="text-xs text-muted-foreground">
              À ne plus changer une fois l&apos;article en ligne (liens et référencement perdus).
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
          <p className="text-xs text-muted-foreground">
            Sur la page anglaise, seuls les articles dont la version anglaise est publiée
            apparaissent.
          </p>
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
