"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteArticle } from "@/app/(admin)/admin/(protected)/blog/actions";

export function DeleteArticleButton({
  articleId,
  titre,
}: {
  articleId: string;
  titre: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Supprimer"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Supprimer définitivement « ${titre} » ?`)) return;
        startTransition(async () => {
          const result = await deleteArticle(articleId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4 text-destructive" />
      )}
    </Button>
  );
}
