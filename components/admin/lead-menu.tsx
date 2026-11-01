"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteLead } from "@/app/admin/(protected)/leads/actions";

/**
 * Menu d'actions d'un lead (bouton « … ») : ouvrir la fiche, supprimer avec
 * confirmation. Utilisé dans la liste et sur la fiche.
 */
export function LeadMenu({
  leadId,
  libelle,
  afficherFiche = true,
  apresSuppression,
}: {
  leadId: string;
  /** Nom affiché dans la confirmation (ex. « Camille Durand »). */
  libelle: string;
  /** Entrée « Ouvrir la fiche » (inutile depuis la fiche elle-même). */
  afficherFiche?: boolean;
  /** Où aller une fois le lead supprimé (fiche → liste). */
  apresSuppression?: string;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [pending, startTransition] = useTransition();

  function supprimer() {
    startTransition(async () => {
      const result = await deleteLead(leadId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setConfirmation(false);
      if (apresSuppression) router.push(apresSuppression);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Actions"
              className="relative z-10 text-muted-foreground"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {afficherFiche && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/admin/leads/${leadId}`)}>
                <ExternalLink /> Ouvrir la fiche
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmation(true)}>
            <Trash2 /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Supprimer ce lead ?</DialogTitle>
            <DialogDescription>
              {libelle} sera supprimé définitivement, avec ses notes et sa file
              de synchronisation CRM. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmation(false)}
            >
              Annuler
            </Button>
            <Button variant="destructive" disabled={pending} onClick={supprimer}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
