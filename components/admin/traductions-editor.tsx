"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  enregistrerTraduction,
  supprimerTraduction,
  type ActionResult,
} from "@/app/admin/(protected)/traductions/actions";

type Langue = "fr" | "en";
const LANGUES: readonly Langue[] = ["fr", "en"];

export interface LigneTraduction {
  cle: string;
  /** Arguments et balises à conserver : « {nom} », « <strong> ». */
  placeholders: string[];
  defaut: Record<Langue, string>;
  surcharge: Record<Langue, string | null>;
}

function ChampLangue({
  cle,
  langue,
  defaut,
  surchargeInitiale,
}: {
  cle: string;
  langue: Langue;
  defaut: string;
  surchargeInitiale: string | null;
}) {
  const [surcharge, setSurcharge] = useState<string | null>(surchargeInitiale);
  const [texte, setTexte] = useState(surchargeInitiale ?? defaut);
  const [pending, startTransition] = useTransition();
  const modifie = surcharge !== null;
  const sale = texte !== (surcharge ?? defaut);

  function appliquer(result: ActionResult, apres: () => void) {
    if (result.ok) {
      toast.success(result.message);
      apres();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono font-semibold uppercase">{langue}</span>
        {modifie && (
          <Badge className="bg-amber-100 text-amber-800">modifié</Badge>
        )}
      </div>
      <Textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={2}
        lang={langue}
        className="min-h-12 text-sm"
        disabled={pending}
      />
      {modifie && (
        <p className="text-xs text-muted-foreground">
          Origine : <span className="italic">{defaut}</span>
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !sale}
          onClick={() =>
            startTransition(async () => {
              const result = await enregistrerTraduction(langue, cle, texte);
              appliquer(result, () => {
                const nouvelle = texte.trim();
                setSurcharge(nouvelle === defaut ? null : nouvelle);
                setTexte(nouvelle);
              });
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
        {modifie && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await supprimerTraduction(langue, cle);
                appliquer(result, () => {
                  setSurcharge(null);
                  setTexte(defaut);
                });
              })
            }
          >
            <RotateCcw className="size-4" /> Rétablir l&apos;origine
          </Button>
        )}
      </div>
    </div>
  );
}

export function TraductionsEditor({ rows }: { rows: LigneTraduction[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucune clé ne correspond.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.cle} className="rounded-xl border p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.cle}</code>
            {row.placeholders.map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-[11px]">
                {p}
              </Badge>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {LANGUES.map((langue) => (
              <ChampLangue
                key={langue}
                cle={row.cle}
                langue={langue}
                defaut={row.defaut[langue]}
                surchargeInitiale={row.surcharge[langue]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
