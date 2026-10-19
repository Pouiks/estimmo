"use client";

import { useTransition } from "react";
import { EyeOff, Loader2, Rocket, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  changerPublication,
  type ActionPublication,
} from "@/app/admin/(protected)/blog/actions";

const LIBELLES: Record<ActionPublication, { texte: string; icone: typeof Send }> = {
  publier: { texte: "Publier", icone: Send },
  maintenant: { texte: "Publier maintenant", icone: Rocket },
  depublier: { texte: "Dépublier", icone: EyeOff },
};

/** Publication / dépublication en un clic depuis la liste des articles. */
export function PublicationArticleButton({
  articleId,
  action,
  titre,
}: {
  articleId: string;
  action: ActionPublication;
  titre: string;
}) {
  const [pending, startTransition] = useTransition();
  const { texte, icone: Icone } = LIBELLES[action];

  return (
    <Button
      variant={action === "depublier" ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          action === "maintenant" &&
          !window.confirm(`Mettre « ${titre} » en ligne dès maintenant ? Sa date programmée sera remplacée.`)
        ) {
          return;
        }
        startTransition(async () => {
          const result = await changerPublication(articleId, action);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Icone className="size-4" />}
      {texte}
    </Button>
  );
}
