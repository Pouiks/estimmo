/**
 * AUDIT - ce que le site calcule RÉELLEMENT pour un point donné, en lisant la
 * base de production (SELECT uniquement, via les mêmes fonctions SQL que
 * l'API /api/leads) puis en appliquant le moteur `estimerVente` du site.
 *
 * Usage :
 *   node --env-file-if-exists=.env.local --import tsx audit/comparables-base.ts \
 *        --lat 43.347125 --lon 3.215228 --insee 34032 --type appartement --surface 41 \
 *        [--date-ref 2026-11-11] [--derniere-vente 2025-12-30] [--sortie audit/sorties/base-appartement-41.md]
 *
 * Reproduit lib/estimation/repository.ts:31-78 (appels RPC) sans importer ce
 * fichier (il dépend du client Supabase « server-only »). Rien n'est écrit en base.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDbClient, parseArgs } from "../scripts/util";
import { quantile, weightedMedian } from "../lib/estimation/stats";
import {
  choisirPalier,
  ecarterAtypiques,
  estimerVente,
  MIN_COMPARABLES,
  MOIS_MAX_MUTATION,
  poidsComparable,
  RATIO_SURFACE_MAX,
  RATIO_SURFACE_MIN,
  RAYONS_M,
  type ComparablesParPalier,
} from "../lib/estimation/vente";
import type { Comparable, TypeBien } from "../lib/estimation/types";
import { deptFromInsee } from "../lib/estimation/zones";

/** Ancien calcul (≤ 2.x) : 30 mois avant la date du jour - repli seulement. */
function dateMinMutation(now: Date): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - MOIS_MAX_MUTATION);
  return d.toISOString().slice(0, 10);
}

/** Copie de lib/estimation/repository.ts (moinsMois) : calcul en UTC. */
function moinsMois(dateIso: string, mois: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - mois);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number | null | undefined, decimales = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

interface LigneRpc {
  prix_m2: string;
  surface_reelle_bati: string;
  date_mutation: Date | string;
  distance_m: number;
}

function versComparable(l: LigneRpc): Comparable {
  const d = l.date_mutation instanceof Date ? l.date_mutation : new Date(l.date_mutation);
  // La colonne est un `date` : on neutralise le fuseau pour garder la date civile.
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return {
    prix_m2: Number(l.prix_m2),
    surface_reelle_bati: Number(l.surface_reelle_bati),
    date_mutation: iso,
    distance_m: Number(l.distance_m),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lat = Number.parseFloat(String(args.get("lat")));
  const lon = Number.parseFloat(String(args.get("lon")));
  const insee = String(args.get("insee") ?? "");
  const type = args.get("type") as TypeBien;
  const surface = Number.parseFloat(String(args.get("surface")));
  if (![lat, lon, surface].every(Number.isFinite) || !insee || !type) {
    console.error("Usage : --lat … --lon … --insee 34032 --type appartement|maison --surface 41 [--date-ref AAAA-MM-JJ]");
    process.exit(1);
  }
  const now = typeof args.get("date-ref") === "string" ? new Date(`${args.get("date-ref")}T12:00:00`) : new Date();

  const client = getDbClient();
  await client.connect();
  const out: string[] = [];
  try {
    // 3.0.0 (P2) : fenêtre ancrée sur la dernière vente connue (dvf_meta) ;
    // repli sur la date du jour si la migration 20261111120000 n'est pas appliquée.
    let derniereVente: string | null = typeof args.get("derniere-vente") === "string" ? (args.get("derniere-vente") as string) : null;
    if (derniereVente === null) try {
      const r = await client.query<{ d: Date | null }>("select public.dvf_derniere_vente() as d");
      derniereVente = r.rows[0]?.d ? versComparable({ prix_m2: "0", surface_reelle_bati: "0", date_mutation: r.rows[0].d, distance_m: 0 }).date_mutation : null;
    } catch {
      derniereVente = null;
    }
    const pDateMin = derniereVente ? moinsMois(derniereVente, MOIS_MAX_MUTATION) : dateMinMutation(now);

    // Mêmes paramètres que repository.ts (supabase.rpc → ici appel SQL direct)
    const commun = {
      p_lat: lat,
      p_lon: lon,
      p_type_local: type,
      p_surface_min: surface * RATIO_SURFACE_MIN,
      p_surface_max: surface * RATIO_SURFACE_MAX,
      p_date_min: pDateMin,
    };

    const base = await client.query<{ min: Date; max: Date; total: string }>(
      "select min(date_mutation) as min, max(date_mutation) as max, count(*) as total from dvf_mutations"
    );
    const rayon = await client.query<LigneRpc>(
      "select * from find_comparables_radius($1, $2, $3, $4, $5, $6, $7)",
      [commun.p_lat, commun.p_lon, commun.p_type_local, commun.p_surface_min, commun.p_surface_max, commun.p_date_min, 3000]
    );
    const comparables: ComparablesParPalier = {
      rayon3000: rayon.rows.map(versComparable),
      commune: [],
      departement: [],
      fenetre: derniereVente ? { du: pDateMin, au: derniereVente } : undefined,
    };
    if (comparables.rayon3000.length < MIN_COMPARABLES) {
      const commune = await client.query<LigneRpc>(
        "select * from find_comparables_commune($1, $2, $3, $4, $5, $6, $7)",
        [commun.p_lat, commun.p_lon, insee, commun.p_type_local, commun.p_surface_min, commun.p_surface_max, commun.p_date_min]
      );
      comparables.commune = commune.rows.map(versComparable);
      if (comparables.commune.length < MIN_COMPARABLES) {
        const dept = await client.query<LigneRpc>(
          "select * from find_comparables_departement($1, $2, $3, $4, $5, $6, $7)",
          [commun.p_lat, commun.p_lon, deptFromInsee(insee), commun.p_type_local, commun.p_surface_min, commun.p_surface_max, commun.p_date_min]
        );
        comparables.departement = dept.rows.map(versComparable);
      }
    }

    const b = base.rows[0];
    out.push(
      `# Calcul réel du site depuis la base - ${type} ${surface} m² à ${lat}, ${lon} (${insee})`,
      "",
      `- Base dvf_mutations : ${fmt(Number(b.total))} ventes, du ${b.min.toISOString().slice(0, 10)} au ${b.max.toISOString().slice(0, 10)}`,
      `- Date de calcul ${now.toISOString().slice(0, 10)} ; dernière vente connue ${derniereVente ?? "inconnue (repli : date du jour)"} → p_date_min = **${commun.p_date_min}** ; surface ${Math.ceil(commun.p_surface_min)}–${Math.floor(commun.p_surface_max)} m²`,
      `- find_comparables_radius(3 000 m) : ${comparables.rayon3000.length} ventes` +
        RAYONS_M.map((r) => ` ; ≤ ${r} m : ${comparables.rayon3000.filter((c) => c.distance_m <= r).length}`).join(""),
      ""
    );
    const selection = choisirPalier(comparables);
    const estimation = estimerVente({ typeBien: type, surface }, comparables, now);
    if (!selection || !estimation) {
      out.push("**Aucun palier n'atteint 8 comparables → estimation manuelle.**");
    } else {
      // 3.0.0 (P5) : mêmes comparables que le moteur, après écrêtage des atypiques
      const { gardes: retenus, ecartes } = ecarterAtypiques(selection.retenus);
      out.push(`- Écrêtage (Tukey, dès 12 ventes) : ${ecartes.length} écartée(s) sur ${selection.retenus.length}` + (ecartes.length ? ` → ${ecartes.map((c) => fmt(c.prix_m2)).join(", ")} €/m²` : ""));
      const prix = retenus.map((c) => c.prix_m2);
      const palier = selection.palier.type === "rayon" ? `rayon ${selection.palier.rayonM} m` : selection.palier.type;
      const parAnnee = new Map<string, number>();
      for (const c of retenus) parAnnee.set(c.date_mutation.slice(0, 4), (parAnnee.get(c.date_mutation.slice(0, 4)) ?? 0) + 1);
      out.push(
        `**Palier retenu : ${palier}, ${retenus.length} comparables** (par année : ${[...parAnnee.entries()].map(([a, n]) => `${a} : ${n}`).join(", ")})`,
        "",
        `| Indicateur | Valeur |`,
        `|---|---:|`,
        `| Médiane pondérée (prixM2Zone) | ${fmt(weightedMedian(retenus.map((c) => ({ value: c.prix_m2, weight: poidsComparable(c, now) }))))} €/m² |`,
        `| Médiane simple | ${fmt(quantile(prix, 0.5))} €/m² |`,
        `| Moyenne simple | ${fmt(prix.reduce((s, v) => s + v, 0) / prix.length)} €/m² |`,
        `| Q1 / Q3 | ${fmt(quantile(prix, 0.25))} / ${fmt(quantile(prix, 0.75))} €/m² |`,
        `| Min / max | ${fmt(Math.min(...prix))} / ${fmt(Math.max(...prix))} €/m² |`,
        `| Fourchette affichée | ${fmt(estimation.fourchetteBasse)} – ${fmt(estimation.mediane)} – ${fmt(estimation.fourchetteHaute)} € (±${estimation.fourchettePct} %) |`,
        `| Confiance | ${estimation.confiance} |`,
        "",
        "```json",
        JSON.stringify(estimation, null, 2),
        "```",
        "",
        "## Comparables retenus (la base ne conserve ni id_mutation, ni adresse, ni prix total)",
        "",
        "| # | Date | Surface | €/m² | Distance | Poids |",
        "|---:|---|---:|---:|---:|---:|"
      );
      retenus
        .map((c) => ({ c, poids: poidsComparable(c, now) }))
        .sort((a, b) => a.c.prix_m2 - b.c.prix_m2)
        .forEach(({ c, poids }, i) => out.push(`| ${i + 1} | ${c.date_mutation} | ${c.surface_reelle_bati} | ${fmt(c.prix_m2)} | ${fmt(c.distance_m)} m | ${poids.toFixed(3)} |`));
    }
  } finally {
    await client.end();
  }

  const texte = out.join("\n");
  const sortie = typeof args.get("sortie") === "string" ? (args.get("sortie") as string) : path.join("audit", "sorties", `base-${type}-${surface}-${now.toISOString().slice(0, 10)}.md`);
  mkdirSync(path.dirname(sortie), { recursive: true });
  writeFileSync(sortie, texte);
  console.log(texte);
  console.log(`\n→ Rapport écrit dans ${sortie}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
