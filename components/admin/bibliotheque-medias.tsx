"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reduireImage } from "@/lib/blog/reduire-image";
import { cn } from "@/lib/utils";
import {
  envoyerMedia,
  modifierTextesMedia,
  supprimerMediaAction,
  supprimerMediasNonUtilises,
  synchroniserMedias,
} from "@/app/admin/(protected)/medias/actions";

/**
 * Zone d'envoi de la bibliothèque (plusieurs fichiers à la fois). Les actions
 * appellent revalidatePath("/admin/medias") : la page se met à jour seule.
 */
export function EnvoiMedias() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [survol, setSurvol] = useState(false);

  function envoyer(fichiers: File[]) {
    const images = fichiers.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    startTransition(async () => {
      for (const f of images) {
        try {
          const donnees = new FormData();
          donnees.set("nom", f.name);
          donnees.set("fichier", await reduireImage(f), f.name);
          const r = await envoyerMedia(donnees);
          if (r.ok) toast.success(`${f.name} : ${r.message}`);
          else toast.error(`${f.name} : ${r.message}`);
        } catch {
          toast.error(`${f.name} : envoi impossible`);
        }
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center",
        survol && "border-primary bg-primary/5"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        envoyer([...e.dataTransfer.files]);
      }}
    >
      <p className="text-sm text-muted-foreground">
        Glissez des photos ici (JPG, PNG, WebP, toute taille). Elles sont converties en
        WebP ; renseignez ensuite leur texte alternatif.
      </p>
      <Button disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Ajouter des images
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          envoyer([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export interface MediaCarte {
  id: string;
  chemin: string;
  url: string;
  alt: string;
  legende: string | null;
  largeur: number;
  hauteur: number;
  taille: number;
  format: string;
  creeLe: string;
  usages: { id: string; titre: string }[];
}

const FORMATS: Record<string, string> = {
  cover: "Couverture 1200 × 630",
  corps: "Corps 1200 × 800",
  libre: "Libre",
};

/** Vignette de la bibliothèque : alt et légende modifiables, URL, suppression. */
export function CarteMedia({ media, date }: { media: MediaCarte; date: string }) {
  const [pending, startTransition] = useTransition();
  const [alt, setAlt] = useState(media.alt);
  const [legende, setLegende] = useState(media.legende ?? "");
  const [copie, setCopie] = useState(false);
  const modifie = alt !== media.alt || legende !== (media.legende ?? "");

  function lancer(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const r = await action();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <a href={media.url} target="_blank" rel="noreferrer" className="block">
        {/* Vignette : fichier déjà optimisé, pas besoin de next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.alt}
          loading="lazy"
          className="aspect-[3/2] w-full rounded-lg bg-muted object-cover"
        />
      </a>
      <p className="text-xs text-muted-foreground">
        {FORMATS[media.format] ?? media.format} · {media.largeur} × {media.hauteur} ·{" "}
        {Math.round(media.taille / 1024)} Ko · {date}
      </p>

      <label className="block text-xs">
        <span className="font-medium">Texte alternatif</span>
        <Textarea rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} className="mt-1 text-xs" />
      </label>
      <label className="block text-xs">
        <span className="font-medium">Légende</span>
        <Textarea rows={2} value={legende} onChange={(e) => setLegende(e.target.value)} className="mt-1 text-xs" />
      </label>
      {modifie && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => lancer(() => modifierTextesMedia(media.id, { alt, legende }))}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
      )}

      {media.usages.length > 0 ? (
        <ul className="space-y-0.5 text-xs">
          {media.usages.map((u) => (
            <li key={u.id} className="truncate">
              <Link href={`/admin/blog/${u.id}`} className="text-primary hover:underline">
                {u.titre}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-amber-700">Non utilisée</p>
      )}

      <div className="mt-auto flex items-center gap-1 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(media.url);
            setCopie(true);
            setTimeout(() => setCopie(false), 1500);
          }}
        >
          {copie ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copie ? "Copiée" : "Copier l'URL"}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Supprimer"
          disabled={pending}
          onClick={() => {
            const avertissement =
              media.usages.length > 0
                ? `Cette image est utilisée par ${media.usages.length} article(s) : elle y sera remplacée par un aplat. Supprimer quand même ?`
                : "Supprimer définitivement cette image ?";
            if (!window.confirm(avertissement)) return;
            lancer(() => supprimerMediaAction(media.id));
          }}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
        </Button>
      </div>
    </div>
  );
}

export function BoutonSupprimerNonUtilises({ nombre }: { nombre: number }) {
  const [pending, startTransition] = useTransition();
  if (nombre === 0) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Supprimer les ${nombre} image(s) qu'aucun article n'utilise ?`)) return;
        startTransition(async () => {
          const r = await supprimerMediasNonUtilises();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer les {nombre} non utilisée(s)
    </Button>
  );
}

/** Reprise des fichiers déposés directement dans Storage (hors admin). */
export function BoutonSynchroniser() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      title="Enregistre dans la bibliothèque les fichiers déposés directement dans Supabase Storage"
      onClick={() =>
        startTransition(async () => {
          const r = await synchroniserMedias();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      Synchroniser avec Storage
    </Button>
  );
}
