"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  listerMediasPourChoix,
  type MediaChoix,
} from "@/app/admin/(protected)/blog/actions";

/**
 * Choix d'une image de la bibliothèque pour un emplacement d'article. Les
 * images déjà au bon format sont proposées d'abord ; les autres seront
 * recadrées automatiquement. Monté à l'ouverture seulement : la bibliothèque
 * est rechargée à chaque fois.
 */
export function SelecteurMedia({
  onFermer,
  onChoisir,
  largeur,
  hauteur,
  occupe,
}: {
  onFermer: () => void;
  onChoisir: (media: MediaChoix) => void;
  largeur: number;
  hauteur: number;
  /** Affectation en cours : grille désactivée. */
  occupe: boolean;
}) {
  const [medias, setMedias] = useState<MediaChoix[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [memeFormat, setMemeFormat] = useState(true);

  useEffect(() => {
    let actif = true;
    listerMediasPourChoix()
      .then((liste) => {
        if (actif) setMedias(liste);
      })
      .catch(() => {
        if (actif) setErreur("Bibliothèque injoignable");
      });
    return () => {
      actif = false;
    };
  }, []);

  const auFormat = (m: MediaChoix) => m.largeur === largeur && m.hauteur === hauteur;
  const visibles = (medias ?? []).filter((m) => !memeFormat || auFormat(m));
  const nbAuFormat = (medias ?? []).filter(auFormat).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choisir dans la bibliothèque</DialogTitle>
          <DialogDescription>
            Emplacement {largeur} × {hauteur}. Une image d&apos;un autre format est recadrée
            automatiquement ; l&apos;original reste dans la bibliothèque.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          {(
            [
              [true, `Même format (${nbAuFormat})`],
              [false, `Toutes (${medias?.length ?? 0})`],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={String(valeur)}
              type="button"
              onClick={() => setMemeFormat(valeur)}
              className={cn(
                "rounded-full border px-3 py-1",
                memeFormat === valeur ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
              )}
            >
              {libelle}
            </button>
          ))}
        </div>

        {erreur ? (
          <p className="text-sm text-destructive">{erreur}</p>
        ) : medias === null ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </p>
        ) : visibles.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {memeFormat
              ? "Aucune image à ce format. Affichez « Toutes » pour en recadrer une."
              : "La bibliothèque est vide : ajoutez des images depuis la page Médias."}
          </p>
        ) : (
          <div className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-4", occupe && "pointer-events-none opacity-60")}>
            {visibles.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChoisir(m)}
                className="group space-y-1 rounded-lg border p-1.5 text-left hover:border-primary"
              >
                {/* Vignette de la bibliothèque : fichier déjà optimisé */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-md bg-muted object-cover"
                />
                <p className="truncate text-xs" title={m.alt}>
                  {m.alt || <span className="text-muted-foreground">(sans alt)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {m.largeur} × {m.hauteur} · {Math.round(m.taille / 1024)} Ko
                  {!auFormat(m) && <span className="ml-1 text-amber-700">· recadrage</span>}
                </p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
