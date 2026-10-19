import Image from "next/image";
import { couvertureAffichable } from "@/lib/blog/images";
import { cn } from "@/lib/utils";

/**
 * Image de couverture d'article (en-tête de page ou vignette de carte).
 * Tant que l'image n'est pas livrée : aplat aux couleurs du site, aux mêmes
 * proportions (pas d'image cassée, pas de décalage de mise en page).
 */
export function Couverture({
  src,
  alt,
  largeur,
  hauteur,
  sizes,
  enTete = false,
  className,
}: {
  src: string | null;
  alt: string;
  largeur?: number | null;
  hauteur?: number | null;
  sizes: string;
  /** Couverture de la page article : chargée en priorité (LCP). */
  enTete?: boolean;
  className?: string;
}) {
  const ratio = `${largeur || 1200} / ${hauteur || 630}`;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20",
        className
      )}
      style={{ aspectRatio: ratio }}
    >
      {couvertureAffichable(src) && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={enTete}
          className="object-cover"
        />
      )}
    </div>
  );
}
