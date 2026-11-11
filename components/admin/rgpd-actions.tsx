"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Eraser, Loader2, Trash2, UserX } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIONS_DEMANDE,
  CONTROLES_EXTERNES,
  TYPES_DEMANDE,
  type DemandeRgpd,
} from "@/lib/rgpd/demandes";
import {
  anonymiserProspect,
  supprimerProspectRgpd,
  type ActionResult,
} from "@/app/admin/(protected)/leads/actions";
import {
  cloturerDemande,
  creerDemande,
  lancerPurge,
  majDemande,
  supprimerDemande,
} from "@/app/admin/(protected)/rgpd/actions";

function notifier(result: ActionResult) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
  return result.ok;
}

/** Cases à cocher natives (pas de dépendance d'UI supplémentaire). */
function Case({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function ControlesExternes({
  valeurs,
  onChange,
}: {
  valeurs: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Copies hors base à traiter à la main (cochez ce qui est fait) :
      </p>
      {CONTROLES_EXTERNES.map((c) => (
        <Case
          key={c.cle}
          checked={!!valeurs[c.cle]}
          onChange={(v) => onChange({ ...valeurs, [c.cle]: v })}
        >
          {c.label}
        </Case>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fiche lead : export, anonymisation, suppression RGPD
// ---------------------------------------------------------------------------

export function BoutonsExport({ leadId, tous }: { leadId: string; tous: boolean }) {
  const suffixe = tous ? "&tous=1" : "";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<a href={`/admin/leads/${leadId}/export?format=txt${suffixe}`} />}
      >
        <Download className="size-4" /> Résumé texte (à coller dans la réponse)
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={<a href={`/admin/leads/${leadId}/export?format=json${suffixe}`} />}
      >
        <Download className="size-4" /> Export JSON (portabilité)
      </Button>
    </div>
  );
}

export function AnonymiserProspect({
  leadId,
  email,
  nombreDemandes,
}: {
  leadId: string;
  email: string | null;
  nombreDemandes: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<"anonymiser" | "supprimer">("anonymiser");
  const [tous, setTous] = useState(nombreDemandes > 1);
  const [demandeur, setDemandeur] = useState(email ?? "");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function confirmer() {
    startTransition(async () => {
      const result =
        mode === "anonymiser"
          ? await anonymiserProspect(leadId, { tous, demandeur, notes })
          : await supprimerProspectRgpd(leadId, { tous, demandeur, notes });
      if (!notifier(result)) return;
      setOuvert(false);
      router.push(mode === "supprimer" ? "/admin/rgpd" : `/admin/leads/${leadId}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMode("anonymiser");
            setOuvert(true);
          }}
        >
          <Eraser className="size-4" /> Anonymiser
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => {
            setMode("supprimer");
            setOuvert(true);
          }}
        >
          <Trash2 className="size-4" /> Supprimer (demande RGPD)
        </Button>
      </div>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {mode === "anonymiser" ? "Anonymiser ce prospect ?" : "Supprimer ce prospect ?"}
            </DialogTitle>
            <DialogDescription>
              {mode === "anonymiser"
                ? "Identité, coordonnées, adresse du bien et notes sont effacées définitivement. Le bien, l'estimation, le statut et la commune restent pour les statistiques, sans lien avec la personne."
                : "La ou les demandes sont supprimées définitivement, avec leur file CRM. Préférez l'anonymisation : elle conserve les statistiques."}{" "}
              L'opération est consignée dans le journal RGPD.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {nombreDemandes > 1 && (
              <Case checked={tous} onChange={setTous}>
                Appliquer aux <strong>{nombreDemandes} demandes</strong> de cet email
                (sinon : cette demande seulement)
              </Case>
            )}
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Demandeur (email ou téléphone reçu)</span>
              <Input value={demandeur} onChange={(e) => setDemandeur(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Note (facultatif)</span>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex. demande reçue par mail le 12/11"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Pensez ensuite aux copies hors base (CRM, Resend, boîte mail) : les cases
              sont dans le journal RGPD.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              variant={mode === "anonymiser" ? "default" : "destructive"}
              disabled={pending || demandeur.trim().length < 3}
              onClick={confirmer}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "anonymiser" ? (
                <UserX className="size-4" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {mode === "anonymiser" ? "Anonymiser" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Journal : nouvelle demande, clôture, cases, purge
// ---------------------------------------------------------------------------

export function NouvelleDemandeForm() {
  const router = useRouter();
  const [type, setType] = useState<string>("acces");
  const [demandeur, setDemandeur] = useState("");
  const [recueLe, setRecueLe] = useState(new Date().toISOString().slice(0, 10));
  const [prolongee, setProlongee] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const ok = notifier(
            await creerDemande({ type, demandeur, recueLe, prolongee, notes })
          );
          if (ok) {
            setDemandeur("");
            setNotes("");
            router.refresh();
          }
        });
      }}
    >
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Type de demande</span>
        <Select value={type} onValueChange={(v) => v && setType(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES_DEMANDE.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Demandeur (email ou téléphone)</span>
        <Input
          required
          value={demandeur}
          onChange={(e) => setDemandeur(e.target.value)}
          placeholder="prenom.nom@exemple.fr"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Reçue le</span>
        <Input type="date" value={recueLe} onChange={(e) => setRecueLe(e.target.value)} />
      </label>
      <div className="flex items-end pb-2">
        <Case checked={prolongee} onChange={setProlongee}>
          Demande complexe : délai prolongé à 3 mois (la personne doit en être informée
          sous 1 mois)
        </Case>
      </div>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="text-muted-foreground">Notes</span>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Enregistrer la demande
        </Button>
      </div>
    </form>
  );
}

export function CloturerDemande({ demande }: { demande: DemandeRgpd }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [action, setAction] = useState<string>(demande.action ?? "export");
  const [reponse, setReponse] = useState(demande.reponse_envoyee);
  const [controles, setControles] = useState<Record<string, boolean>>(
    (demande.controles ?? {}) as Record<string, boolean>
  );
  const [notes, setNotes] = useState(demande.notes ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOuvert(true)}>
        <CheckCircle2 className="size-4" /> Clôturer
      </Button>
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Clôturer la demande</DialogTitle>
            <DialogDescription>
              {demande.demandeur} · reçue le {demande.recue_le} · échéance {demande.echeance}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Action réalisée</span>
              <Select value={action} onValueChange={(v) => v && setAction(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS_DEMANDE.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <ControlesExternes valeurs={controles} onChange={setControles} />
            <Case checked={reponse} onChange={setReponse}>
              Réponse envoyée à la personne
            </Case>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const ok = notifier(
                    await cloturerDemande(demande.id, {
                      action,
                      reponseEnvoyee: reponse,
                      controles,
                      notes,
                    })
                  );
                  if (ok) {
                    setOuvert(false);
                    router.refresh();
                  }
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Cases des copies externes et « réponse envoyée », éditables sur une demande déjà traitée. */
export function SuiviDemande({ demande }: { demande: DemandeRgpd }) {
  const router = useRouter();
  const [controles, setControles] = useState<Record<string, boolean>>(
    (demande.controles ?? {}) as Record<string, boolean>
  );
  const [reponse, setReponse] = useState(demande.reponse_envoyee);
  const [pending, startTransition] = useTransition();

  function enregistrer(patch: { controles?: Record<string, boolean>; reponseEnvoyee?: boolean }) {
    startTransition(async () => {
      if (notifier(await majDemande(demande.id, patch))) router.refresh();
    });
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      <Case
        checked={reponse}
        onChange={(v) => {
          setReponse(v);
          enregistrer({ reponseEnvoyee: v });
        }}
      >
        Réponse envoyée
      </Case>
      {demande.action !== "export" && (
        <div className="mt-1 space-y-1">
          {CONTROLES_EXTERNES.map((c) => (
            <Case
              key={c.cle}
              checked={!!controles[c.cle]}
              onChange={(v) => {
                const suivant = { ...controles, [c.cle]: v };
                setControles(suivant);
                enregistrer({ controles: suivant });
              }}
            >
              {c.label}
            </Case>
          ))}
        </div>
      )}
    </div>
  );
}

export function SupprimerDemandeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Retirer du journal"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (notifier(await supprimerDemande(id))) router.refresh();
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function PurgeButton() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOuvert(true)}>
        <Eraser className="size-4" /> Lancer la purge maintenant
      </Button>
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Lancer la purge ?</DialogTitle>
            <DialogDescription>
              Applique immédiatement les durées de conservation (mêmes règles que le
              passage quotidien). Les prospects listés « à venir » dont le dernier
              contact dépasse la durée seront anonymisés. Irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (notifier(await lancerPurge())) {
                    setOuvert(false);
                    router.refresh();
                  }
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Purger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
