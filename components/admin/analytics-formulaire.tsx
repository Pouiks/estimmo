import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EtapeChamps,
  Jour,
  LigneEntonnoir,
  Reponse,
  Segment,
} from "@/lib/analytics/agregats";
import { CHAMPS } from "@/lib/analytics/evenements";
import { cn } from "@/lib/utils";

const nombre = (n: number) => n.toLocaleString("fr-FR");
const pct = (n: number | null) => (n === null ? "–" : `${n} %`);

export function FiltreLien({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      {label}
    </Link>
  );
}

/** Tuile de chiffre clé : libellé, valeur, précision. */
export function Kpi({
  label,
  value,
  suffix,
  detail,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">
          {typeof value === "number" ? nombre(value) : value}
          {suffix && (
            <span className="text-base font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Barre horizontale fine : base carrée à gauche, bout arrondi. */
function Barre({
  part,
  className,
  title,
}: {
  part: number | null;
  className?: string;
  title?: string;
}) {
  return (
    <div className="h-2 w-full rounded-r-[4px] bg-muted" title={title}>
      <div
        className={cn("h-full rounded-r-[4px] bg-primary", className)}
        style={{ width: `${Math.min(100, Math.max(0, part ?? 0))}%` }}
      />
    </div>
  );
}

export function Entonnoir({
  lignes,
  sessions,
  soumissions,
  etapeCritique,
}: {
  lignes: LigneEntonnoir[];
  sessions: number;
  soumissions: number;
  etapeCritique: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entonnoir par étape</CardTitle>
        <CardDescription>
          Sessions ayant affiché chaque étape. Un abandon est une session dont
          c'est la dernière étape vue, sans estimation obtenue ; à l'étape 1,
          la plupart n'ont fait qu'afficher la page (voir « sans toucher aucun
          champ » plus bas).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lignes.map((l) => (
          <div key={l.etape} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Étape {l.etape} · {l.libelle}
                {etapeCritique === l.etape && (
                  <Badge variant="outline" className="font-normal">
                    Plus d'abandons
                  </Badge>
                )}
              </span>
              <span className="tabular-nums">
                <span className="font-semibold">{nombre(l.vues)}</span>{" "}
                <span className="text-muted-foreground">
                  ({pct(l.partSessions)})
                </span>
              </span>
            </div>
            <Barre
              part={l.partSessions}
              title={`${nombre(l.vues)} session(s) sur ${nombre(sessions)}`}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              Abandons : {nombre(l.abandons)} ({pct(l.tauxAbandon)}) · Durée
              médiane : {l.dureeMediane ?? "–"} · Retours : {nombre(l.retours)}{" "}
              · Erreurs de saisie : {nombre(l.erreurs)}
              {l.sessionsErreur > 0 && ` (${nombre(l.sessionsErreur)} sessions)`}
            </p>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t pt-3 text-sm">
          <span className="font-medium">Estimations obtenues</span>
          <span className="tabular-nums">
            <span className="font-semibold">{nombre(soumissions)}</span>{" "}
            <span className="text-muted-foreground">
              ({pct(sessions > 0 ? Math.round((soumissions / sessions) * 100) : null)}{" "}
              des sessions)
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Colonnes empilées par jour : estimations obtenues + sessions sans estimation. */
export function ColonnesJours({ jours }: { jours: Jour[] }) {
  const max = Math.max(1, ...jours.map((j) => j.sessions));
  const vide = jours.every((j) => j.sessions === 0);
  const HAUTEUR = 128;
  const pasEtiquette = jours.length > 14 ? Math.ceil(jours.length / 6) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions par jour</CardTitle>
        <CardDescription>
          Ouvertures du formulaire, dont celles arrivées jusqu'à l'estimation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vide ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucune session sur la période.
          </p>
        ) : (
          <>
            <div
              className="flex items-end gap-[2px]"
              style={{ height: HAUTEUR }}
              role="img"
              aria-label="Sessions par jour"
            >
              {jours.map((j) => {
                const reste = j.sessions - j.soumissions;
                const hReste = Math.round((reste / max) * HAUTEUR);
                const hSoumis = Math.round((j.soumissions / max) * HAUTEUR);
                return (
                  <div
                    key={j.jour}
                    className="flex h-full max-w-6 flex-1 flex-col justify-end gap-[2px]"
                    title={`${j.libelle} : ${nombre(j.sessions)} session(s), ${nombre(j.soumissions)} estimation(s)`}
                  >
                    {reste > 0 && (
                      <div
                        className="w-full rounded-t-[4px] bg-primary/25"
                        style={{ height: Math.max(2, hReste) }}
                      />
                    )}
                    {j.soumissions > 0 && (
                      <div
                        className={cn(
                          "w-full bg-primary",
                          reste === 0 && "rounded-t-[4px]"
                        )}
                        style={{ height: Math.max(2, hSoumis) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-[2px] text-[11px] text-muted-foreground">
              {jours.map((j, i) => (
                <div key={j.jour} className="max-w-6 flex-1 truncate text-center">
                  {i % pasEtiquette === 0 || i === jours.length - 1
                    ? j.libelle
                    : ""}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-primary" />
                Estimations obtenues
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-primary/25" />
                Sessions sans estimation
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Détail des champs d'une étape : interactions, erreurs, abandons qui suivent. */
export function TableauChamps({ etape }: { etape: EtapeChamps }) {
  const maxAbandons = Math.max(0, ...etape.champs.map((c) => c.abandonsApres));
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Étape {etape.etape} · {etape.libelle}
        </CardTitle>
        <CardDescription>
          {etape.abandons === 0
            ? "Aucun abandon sur cette étape."
            : `${nombre(etape.abandons)} abandon(s) sur cette étape, dont ${nombre(etape.abandonsSansInteraction)} sans toucher aucun champ.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Champ</TableHead>
              <TableHead className="text-right" title="Sessions ayant mis le focus dans le champ (champs texte)">
                Touché
              </TableHead>
              <TableHead className="text-right" title="Sessions ayant donné une valeur">
                Renseigné
              </TableHead>
              <TableHead className="text-right" title="Erreurs de validation affichées (sessions concernées)">
                Erreurs
              </TableHead>
              <TableHead className="text-right" title="Abandons dont ce champ est le dernier touché">
                Abandon après
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {etape.champs.map((c) => {
              const texte = CHAMPS[c.champ].type === "texte";
              const critique = maxAbandons > 0 && c.abandonsApres === maxAbandons;
              return (
                <TableRow key={c.champ}>
                  <TableCell className={cn(critique && "font-semibold")}>
                    {c.libelle}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {texte ? nombre(c.touches) : <span className="text-muted-foreground">–</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {nombre(c.renseignes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.erreurs === 0 ? (
                      <span className="text-muted-foreground">0</span>
                    ) : (
                      <>
                        {nombre(c.erreurs)}{" "}
                        <span className="text-muted-foreground">
                          ({nombre(c.sessionsErreur)})
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      critique && "font-semibold"
                    )}
                  >
                    {nombre(c.abandonsApres)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** Réponses données aux champs à choix, toutes sessions confondues. */
export function Reponses({ reponses }: { reponses: Reponse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Réponses données</CardTitle>
        <CardDescription>
          Dernière valeur choisie par session, y compris les parcours
          abandonnés (les leads n'en gardent que les parcours complets).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reponses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune réponse enregistrée sur la période.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reponses.map((r) => (
              <div key={r.champ} className="space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{r.libelle}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {nombre(r.total)} réponse(s)
                  </span>
                </div>
                {r.valeurs.map((v) => (
                  <div key={v.valeur} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{v.libelle}</span>
                      <span className="tabular-nums">
                        {nombre(v.n)}{" "}
                        <span className="text-muted-foreground">({v.part} %)</span>
                      </span>
                    </div>
                    <Barre part={v.part} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Segments({
  titre,
  segments,
}: {
  titre: string;
  segments: Segment[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{titre}</h3>
      {segments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Estimations</TableHead>
              <TableHead className="text-right">Taux</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((s) => (
              <TableRow key={s.valeur}>
                <TableCell className="max-w-48 truncate" title={s.valeur}>
                  {s.libelle}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {nombre(s.sessions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {nombre(s.soumissions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{pct(s.taux)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
