"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUTS_LEAD } from "./badges";
import {
  retryCrmSync,
  saveLeadNotes,
  updateLeadStatut,
  type ActionResult,
} from "@/app/(admin)/admin/(protected)/leads/actions";

function handleResult(result: ActionResult) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
}

export function LeadStatutSelect({
  leadId,
  statut,
}: {
  leadId: string;
  statut: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={statut}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(async () => {
          handleResult(await updateLeadStatut(leadId, value));
        });
      }}
    >
      <SelectTrigger className="w-48" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS_LEAD.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LeadNotesForm({
  leadId,
  notes,
}: {
  leadId: string;
  notes: string | null;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notes d'appel, contexte, relances…"
        rows={5}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            handleResult(await saveLeadNotes(leadId, value));
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Enregistrer les notes
      </Button>
    </div>
  );
}

export function RetryCrmButton({ queueId }: { queueId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          handleResult(await retryCrmSync(queueId));
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Rejouer la synchro CRM
    </Button>
  );
}
