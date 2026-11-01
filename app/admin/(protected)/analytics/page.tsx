import { Card, CardContent } from "@/components/ui/card";
import {
  ColonnesJours,
  Entonnoir,
  FiltreLien,
  Kpi,
  Reponses,
  Segments,
  TableauChamps,
} from "@/components/admin/analytics-formulaire";
import {
  debutJourParis,
  preparerAnalytics,
  type AnalyticsBrut,
} from "@/lib/analytics/agregats";
import { APPAREILS, type Appareil } from "@/lib/analytics/evenements";
import { LIBELLES_APPAREILS, LIBELLES_ETAPES } from "@/lib/analytics/libelles";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Analytics", robots: { index: false } };

const PERIODES = [7, 30, 90] as const;
type Periode = (typeof PERIODES)[number];

interface Filtres {
  periode?: string;
  appareil?: string;
  langue?: string;
}

function lien(filtres: Filtres, patch: Partial<Filtres>): string {
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries({ ...filtres, ...patch })) {
    if (valeur) params.set(cle, valeur);
  }
  const qs = params.toString();
  return `/admin/analytics${qs ? `?${qs}` : ""}`;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Filtres>;
}) {
  await requireAdmin();
  const filtres = await searchParams;
  const periode: Periode =
    PERIODES.find((p) => String(p) === filtres.periode) ?? 30;
  const appareil: Appareil | null =
    APPAREILS.find((a) => a === filtres.appareil) ?? null;
  const langue =
    filtres.langue === "fr" || filtres.langue === "en" ? filtres.langue : null;

  // Période = N jours civils (heure de Paris), aujourd'hui inclus.
  const jusqua = new Date();
  const depuis = debutJourParis(
    new Date(jusqua.getTime() - (periode - 1) * 86_400_000)
  );

  const { data, error } = await createAdminClient().rpc("analytics_formulaire", {
    p_depuis: depuis.toISOString(),
    p_jusqua: jusqua.toISOString(),
    p_appareil: appareil,
    p_locale: langue,
    p_page: null,
  });

  const analytics = error
    ? null
    : preparerAnalytics(data as AnalyticsBrut, { depuis, jusqua });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Analytics du formulaire
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parcours d'estimation : où les visiteurs avancent, hésitent et
          s'arrêtent. Mesure sans cookie, aucune donnée personnelle
          enregistrée.
        </p>
      </div>

      {/* Filtres : une seule rangée, tous les blocs suivent la même sélection */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Période :</span>
        {PERIODES.map((p) => (
          <FiltreLien
            key={p}
            href={lien(filtres, { periode: p === 30 ? undefined : String(p) })}
            active={periode === p}
            label={`${p} jours`}
          />
        ))}
        <span className="ml-4 text-muted-foreground">Appareil :</span>
        <FiltreLien
          href={lien(filtres, { appareil: undefined })}
          active={appareil === null}
          label="Tous"
        />
        {APPAREILS.map((a) => (
          <FiltreLien
            key={a}
            href={lien(filtres, { appareil: a })}
            active={appareil === a}
            label={LIBELLES_APPAREILS[a]}
          />
        ))}
        <span className="ml-4 text-muted-foreground">Langue :</span>
        <FiltreLien
          href={lien(filtres, { langue: undefined })}
          active={langue === null}
          label="Toutes"
        />
        <FiltreLien
          href={lien(filtres, { langue: "fr" })}
          active={langue === "fr"}
          label="Français"
        />
        <FiltreLien
          href={lien(filtres, { langue: "en" })}
          active={langue === "en"}
          label="Anglais"
        />
      </div>

      {analytics === null ? (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium text-red-700">
              Les agrégats ne peuvent pas être calculés.
            </p>
            <p className="mt-1 text-muted-foreground">
              La fonction SQL <code>analytics_formulaire</code> est absente ou
              en erreur : appliquez la migration{" "}
              <code>20261101120000_analytics_formulaire.sql</code> avec{" "}
              <code>pnpm db:migrate</code>.
            </p>
            {error && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {error.message}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Formulaires affichés"
              value={analytics.kpis.sessions}
              detail="Le formulaire est dans le hero de l'accueil : une session par affichage"
            />
            <Kpi
              label="Sessions engagées"
              value={analytics.kpis.engagees}
              detail={
                analytics.kpis.tauxEngagement === null
                  ? "Au moins un champ touché"
                  : `${analytics.kpis.tauxEngagement} % des affichages ont touché un champ`
              }
            />
            <Kpi
              label="Estimations obtenues"
              value={analytics.kpis.soumissions}
              detail={
                analytics.kpis.tauxConversionEngagees === null
                  ? "Parcours menés jusqu'au résultat"
                  : `${analytics.kpis.tauxConversionEngagees} % des sessions engagées · ${analytics.kpis.tauxConversion ?? 0} % des affichages`
              }
            />
            <Kpi
              label="Durée médiane du parcours"
              value={analytics.kpis.dureeMediane ?? "–"}
              detail={
                analytics.kpis.etapeCritique
                  ? `Étape la plus quittée : ${analytics.kpis.etapeCritique} · ${LIBELLES_ETAPES[analytics.kpis.etapeCritique]}`
                  : "De l'ouverture à l'estimation"
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Entonnoir
              lignes={analytics.entonnoir}
              sessions={analytics.kpis.sessions}
              soumissions={analytics.kpis.soumissions}
              etapeCritique={analytics.kpis.etapeCritique}
            />
            <ColonnesJours jours={analytics.jours} />
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Champs, étape par étape
            </h2>
            <p className="text-sm text-muted-foreground">
              « Abandon après » compte les abandons de l'étape dont ce champ est
              le dernier touché : c'est là que les visiteurs décrochent.
              « Touché » n'existe que pour les champs texte.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {analytics.etapes.map((etape) => (
              <TableauChamps key={etape.etape} etape={etape} />
            ))}
          </div>

          <Reponses reponses={analytics.reponses} />

          <Card>
            <CardContent className="grid gap-8 pt-6 lg:grid-cols-3">
              <Segments titre="Appareil" segments={analytics.segments.appareil} />
              <Segments titre="Langue" segments={analytics.segments.locale} />
              <Segments titre="Page d'entrée" segments={analytics.segments.page} />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Les événements sont envoyés par le navigateur : les visiteurs sans
            JavaScript ou équipés d'un bloqueur ne sont pas comptés. Les durées
            sont des médianes entre l'affichage d'une étape et sa validation.
            Les sessions antérieures au 1er novembre 2026 n'ont ni champs, ni
            durées, ni appareil (segment « Inconnu »).
          </p>
        </>
      )}
    </div>
  );
}
