import {
  BoutonSupprimerNonUtilises,
  CarteMedia,
  EnvoiMedias,
  type MediaCarte,
} from "@/components/admin/bibliotheque-medias";
import { listerMedias, synchroniserStorage, usagesParUrl } from "@/lib/blog/medias";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata = { title: "Médias", robots: { index: false } };

export default async function MediasPage() {
  await requireAdmin();

  // Les fichiers déposés dans Storage sans passer par l'admin (ou avant la
  // bibliothèque) sont enregistrés au passage ; une panne de Storage ne
  // bloque pas la page.
  let avertissement: string | null = null;
  try {
    await synchroniserStorage();
  } catch (err) {
    avertissement = `Synchronisation avec Storage impossible : ${(err as Error).message}`;
  }

  const [medias, usages] = await Promise.all([listerMedias(), usagesParUrl()]);
  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });
  const poids = medias.reduce((s, m) => s + m.taille, 0);
  const cartes: MediaCarte[] = medias.map((m) => ({
    id: m.id,
    chemin: m.chemin,
    url: m.url,
    alt: m.alt,
    legende: m.legende,
    largeur: m.largeur,
    hauteur: m.hauteur,
    taille: m.taille,
    format: m.format,
    creeLe: m.created_at,
    usages: usages.get(m.url) ?? [],
  }));
  const nonUtilisees = cartes.filter((c) => c.usages.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Médias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {medias.length} image(s) · {(poids / 1024 / 1024).toFixed(1)} Mo sur 1 Go (Supabase
            Storage). Toutes les images du blog sont ici : celles envoyées depuis un
            article comme les envois libres. Depuis un article, le bouton « Bibliothèque »
            d&apos;un emplacement pioche dedans.
          </p>
        </div>
        <BoutonSupprimerNonUtilises nombre={nonUtilisees} />
      </div>

      {avertissement && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {avertissement}
        </p>
      )}

      <EnvoiMedias />

      {cartes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune image pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cartes.map((c) => (
            <CarteMedia key={c.id} media={c} date={dateFmt.format(new Date(c.creeLe))} />
          ))}
        </div>
      )}
    </div>
  );
}
