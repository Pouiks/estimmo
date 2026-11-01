"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  changerPublicationEn,
  publierVersionsAnglaises,
  type ActionPublicationEn,
} from "@/app/admin/(protected)/blog/actions";

/** Publier / dépublier la version anglaise d'un article, depuis la liste. */
export function PublicationEnButton({
  articleId,
  action,
}: {
  articleId: string;
  action: ActionPublicationEn;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={action === "depublier" ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      title={
        action === "publier"
          ? "Mettre la version anglaise en ligne (/en/blog)"
          : "Repasser la version anglaise en brouillon"
      }
      onClick={() =>
        startTransition(async () => {
          const result = await changerPublicationEn(articleId, action);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
      {action === "publier" ? "Publier EN" : "Dépublier EN"}
    </Button>
  );
}

/** Publie toutes les versions anglaises en brouillon (celles qui sont complètes). */
export function PublierVersionsEnButton({ nombre }: { nombre: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Publier les ${nombre} version(s) anglaise(s) en brouillon ? Elles seront visibles sous /en/blog pour les articles en ligne et déclarées aux moteurs (hreflang, sitemap).`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await publierVersionsAnglaises();
          if (result.ok) toast.success(result.message, { duration: 8000 });
          else toast.error(result.message, { duration: 10_000 });
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
      Publier les {nombre} versions EN
    </Button>
  );
}
