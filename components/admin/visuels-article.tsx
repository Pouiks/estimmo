"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ImagePlus,
  LibraryBig,
  Loader2,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SelecteurMedia } from "@/components/admin/selecteur-media";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reduireImage } from "@/lib/blog/reduire-image";
import { cn } from "@/lib/utils";
import {
  choisirMediaPourVisuel,
  envoyerVisuel,
  modifierTexteVisuel,
  retirerVisuel,
  type MediaChoix,
} from "@/app/admin/(protected)/blog/actions";

export interface EmplacementVisuel {
  /** Chemin logique de l'image dans le JSON éditorial (/images/blog/...) */
  cle: string;
  libelle: string;
  estCouverture: boolean;
  largeur: number;
  hauteur: number;
  /** Textes publiés sur la page (alt du <img>, figcaption pour une image du corps) */
  alt: string;
  legende: string | null;
  prompt: string | null;
  /** Image affichée aujourd'hui (bibliothèque ou public/), null = aplat */
  url: string | null;
  source: "bibliotheque" | "public" | null;
}

type Position = "auto" | "haut" | "centre" | "bas";

const POSITIONS: [Position, string, string][] = [
  ["auto", "Auto", "center"],
  ["haut", "Haut", "top"],
  ["centre", "Centre", "center"],
  ["bas", "Bas", "bottom"],
];

function Emplacement({ articleId, e }: { articleId: string; e: EmplacementVisuel }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  // Photo choisie et son URL d'aperçu locale (blob:), libérée au remplacement
  // (et par le navigateur en quittant la page).
  const [selection, setSelection] = useState<{ fichier: File; url: string } | null>(null);
  const fichier = selection?.fichier ?? null;
  const apercu = selection?.url ?? null;
  const [position, setPosition] = useState<Position>("auto");
  const [survol, setSurvol] = useState(false);
  const [copie, setCopie] = useState(false);
  const [selecteur, setSelecteur] = useState(false);
  const [alt, setAlt] = useState(e.alt);
  const [legende, setLegende] = useState(e.legende ?? "");
  const textesModifies = alt !== e.alt || legende !== (e.legende ?? "");

  function setFichier(f: File | null) {
    if (selection) URL.revokeObjectURL(selection.url);
    setSelection(f ? { fichier: f, url: URL.createObjectURL(f) } : null);
  }

  function choisir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Choisissez une image (JPG, PNG ou WebP)");
    setPosition("auto");
    setFichier(f);
  }

  /** Exécute une action serveur et rafraîchit la page si elle réussit. */
  function lancer(action: () => Promise<{ ok: boolean; message: string }>, apres?: () => void) {
    startTransition(async () => {
      try {
        const r = await action();
        if (!r.ok) return void toast.error(r.message);
        toast.success(r.message);
        apres?.();
        router.refresh();
      } catch {
        toast.error("Action impossible : image trop lourde ou connexion interrompue");
      }
    });
  }

  function envoyer() {
    if (!fichier) return;
    lancer(async () => {
      const donnees = new FormData();
      donnees.set("articleId", articleId);
      donnees.set("cle", e.cle);
      donnees.set("position", position);
      donnees.set("fichier", await reduireImage(fichier), "photo");
      return envoyerVisuel(donnees);
    }, () => setFichier(null));
  }

  function choisirMedia(media: MediaChoix) {
    setSelecteur(false);
    lancer(() => choisirMediaPourVisuel(articleId, e.cle, media.id));
  }

  function retirer() {
    if (!window.confirm(`Retirer l'image de « ${e.libelle} » ? Elle reste dans la bibliothèque ; un aplat s'affichera ici.`)) return;
    lancer(() => retirerVisuel(articleId, e.cle));
  }

  function enregistrerTextes() {
    lancer(() =>
      modifierTexteVisuel(articleId, e.cle, e.estCouverture ? { alt } : { alt, legende })
    );
  }

  const objectPosition = POSITIONS.find(([p]) => p === position)?.[2] ?? "center";
  const image = apercu ?? e.url;

  return (
    <div
      className={cn("space-y-3 rounded-xl border p-3", survol && "border-primary bg-primary/5")}
      onDragOver={(ev) => {
        ev.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setSurvol(false);
        choisir(ev.dataTransfer.files[0]);
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{e.libelle}</p>
        <p className="text-xs text-muted-foreground">
          {e.largeur} × {e.hauteur}
          {!apercu && (
            <span
              className={cn(
                "ml-2 rounded px-1.5 py-0.5",
                e.source ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              )}
            >
              {e.source === "bibliotheque" ? "bibliothèque" : e.source === "public" ? "public/" : "manquante"}
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative block w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20"
        style={{ aspectRatio: `${e.largeur} / ${e.hauteur}` }}
        aria-label={`Choisir une photo pour « ${e.libelle} »`}
      >
        {image ? (
          // Aperçu local (blob:) ou image en ligne : pas d'optimisation Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alt}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: apercu ? objectPosition : "center" }}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <ImagePlus className="size-5" />
            Cliquer ou glisser une photo
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(ev) => {
          choisir(ev.target.files?.[0]);
          ev.target.value = "";
        }}
      />

      {fichier ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 text-muted-foreground">Recadrage :</span>
            {POSITIONS.map(([p, libelle]) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5",
                  position === p ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
                )}
              >
                {libelle}
              </button>
            ))}
          </div>
          {position === "auto" && (
            <p className="text-xs text-muted-foreground">
              Auto : le serveur garde la zone la plus intéressante (l&apos;aperçu montre le centre).
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={pending} onClick={envoyer}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Envoyer
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setFichier(null)}>
              <X className="size-4" /> Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" /> Envoyer
          </Button>
          <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => setSelecteur(true)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <LibraryBig className="size-4" />}
            Bibliothèque
          </Button>
          {e.source === "bibliotheque" && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={retirer} aria-label="Retirer l'image">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      )}

      {selecteur && (
        <SelecteurMedia
          onFermer={() => setSelecteur(false)}
          onChoisir={choisirMedia}
          largeur={e.largeur}
          hauteur={e.hauteur}
          occupe={pending}
        />
      )}

      <div className="space-y-2">
        <label className="block text-xs">
          <span className="font-medium">Texte alternatif (balise alt)</span>
          <Textarea
            rows={2}
            value={alt}
            onChange={(ev) => setAlt(ev.target.value)}
            className="mt-1 text-xs"
          />
        </label>
        {!e.estCouverture && (
          <label className="block text-xs">
            <span className="font-medium">Légende affichée sous l&apos;image</span>
            <Textarea
              rows={2}
              value={legende}
              onChange={(ev) => setLegende(ev.target.value)}
              className="mt-1 text-xs"
            />
          </label>
        )}
        {textesModifies && (
          <Button size="sm" variant="secondary" className="w-full" disabled={pending} onClick={enregistrerTextes}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer les textes
          </Button>
        )}
      </div>

      {e.prompt && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Prompt de génération</summary>
          <p className="mt-2 rounded-md bg-muted p-2 leading-relaxed">{e.prompt}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            onClick={async () => {
              await navigator.clipboard.writeText(e.prompt!);
              setCopie(true);
              setTimeout(() => setCopie(false), 1500);
            }}
          >
            {copie ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copie ? "Copié" : "Copier le prompt"}
          </Button>
        </details>
      )}
    </div>
  );
}

/** Les emplacements d'images d'un article éditorial. */
export function VisuelsArticle({
  articleId,
  emplacements,
}: {
  articleId: string;
  emplacements: EmplacementVisuel[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {emplacements.map((e) => (
        <Emplacement key={e.cle} articleId={articleId} e={e} />
      ))}
    </div>
  );
}
