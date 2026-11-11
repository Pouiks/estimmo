/**
 * AUDIT - reproduction du calcul d'estimation de VENTE à partir d'un export DVF.
 *
 * Ce script ne touche pas à la production : il IMPORTE les fonctions du site
 * (nettoyage DVF de `scripts/dvf-clean.ts`, moteur de `lib/estimation`) et
 * ré-implémente en TypeScript la seule partie non importable : les fonctions
 * SQL `find_comparables_*` (supabase/migrations/20261016130000_dvf_index_filtres.sql)
 * et les arrondis de l'import (scripts/import-dvf.ts:102-122).
 *
 * Entrées acceptées :
 *   --csv <fichier>     export geo-dvf (séparateur `,`) ou export de l'explorateur
 *                       DVF app.dvf.etalab.gouv.fr (séparateur `;`), détection auto
 *   --json <fichier>    réponse de l'API de l'explorateur DVF
 *                       (https://app.dvf.etalab.gouv.fr/api/mutations3/<insee>/<section>)
 *   --telecharger <insee>/<section>   télécharge cette réponse dans audit/data/
 *   --section 000PX     ne garde que cette section cadastrale (id_parcelle)
 *
 * Bien à estimer (reproduction du moteur) :
 *   --type appartement|maison   --surface 41   [--lat 43.347 --lon 3.215]
 *   [--date-ref 2026-11-11]  date « aujourd'hui » du calcul (fenêtre 30 mois)
 *   [--date-max 2025-12-30]  ignore les ventes postérieures (= contenu réel de la base)
 *   [--etat bon|a_renover|a_rafraichir|refait_neuf] [--dpe A..G] [--etage 2]
 *   [--ascenseur oui|non] [--dernier-etage] [--exterieur balcon,terrasse,jardin]
 *   [--stationnement aucun|place|garage_box] [--cuisine moins_5|5_10|10_20|plus_20]
 *   [--sdb idem]
 *   [--sortie audit/sorties/mon-rapport.md]
 *
 * Exemple (cas de référence Béziers, section 000PX) :
 *   node --import tsx audit/reproduire-estimation.ts --telecharger 34032/000PX
 *   node --import tsx audit/reproduire-estimation.ts --json audit/data/34032-000PX.json \
 *        --type appartement --surface 41 --date-ref 2026-11-11
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  accumulateRow,
  finalizeGroup,
  type DvfRawRow,
  type ExclusionReason,
  type MutationGroup,
} from "../scripts/dvf-clean";
import { parseArgs } from "../scripts/util";
import { calculerAjustement } from "../lib/estimation/ajustements";
import { iqr, quantile, weightedMedian } from "../lib/estimation/stats";
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
import type {
  AgeTranche,
  CaracteristiquesBien,
  Comparable,
  Dpe,
  EtatGeneral,
  Exterieur,
  Stationnement,
  TypeBien,
} from "../lib/estimation/types";

// ---------------------------------------------------------------------------
// 1. Lecture de l'export (CSV geo-dvf, CSV explorateur, JSON explorateur)
// ---------------------------------------------------------------------------

/** Ligne DVF brute enrichie des colonnes utiles à l'affichage (adresse, lots). */
interface LigneDvf extends DvfRawRow {
  adresse: string;
  id_parcelle: string;
  section: string;
  nombre_lots: string;
  lot_numero: string;
  surface_carrez_lots: number | null;
}

const LIMITE_SQL = 5000; // `limit 5000` des trois fonctions SQL

/** L'explorateur DVF encode l'absence par "None"/"nan" et les entiers par "79.0". */
function normaliser(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const s = String(valeur).trim();
  if (s === "None" || s === "nan" || s === "NaN") return "";
  return s;
}

function versLigne(brut: Record<string, unknown>, decimaleVirgule: boolean): LigneDvf {
  const v = (cle: string) => {
    const s = normaliser(brut[cle]);
    return decimaleVirgule ? s.replace(",", ".") : s;
  };
  const idParcelle = v("id_parcelle");
  const section = v("section_prefixe") || idParcelle.slice(5, 10);
  let carrez: number | null = null;
  for (let i = 1; i <= 5; i++) {
    const n = Number.parseFloat(v(`lot${i}_surface_carrez`));
    if (Number.isFinite(n) && n > 0) carrez = (carrez ?? 0) + n;
  }
  const numero = [v("adresse_numero"), v("adresse_suffixe")].filter(Boolean).join("");
  return {
    id_mutation: v("id_mutation"),
    date_mutation: v("date_mutation").slice(0, 10),
    nature_mutation: v("nature_mutation"),
    valeur_fonciere: v("valeur_fonciere"),
    code_postal: v("code_postal"),
    code_commune: v("code_commune"),
    nom_commune: v("nom_commune"),
    code_departement: v("code_departement"),
    type_local: v("type_local"),
    surface_reelle_bati: v("surface_reelle_bati"),
    nombre_pieces_principales: v("nombre_pieces_principales"),
    longitude: v("longitude"),
    latitude: v("latitude"),
    adresse: [numero, v("adresse_nom_voie")].filter(Boolean).join(" "),
    id_parcelle: idParcelle,
    section,
    nombre_lots: v("nombre_lots"),
    lot_numero: v("lot1_numero"),
    surface_carrez_lots: carrez,
  };
}

function lireCsv(fichier: string): LigneDvf[] {
  const texte = readFileSync(fichier, "utf8");
  const entete = texte.slice(0, texte.indexOf("\n"));
  const delimiter = (entete.match(/;/g) ?? []).length > (entete.match(/,/g) ?? []).length ? ";" : ",";
  const lignes = parse(texte, {
    columns: true,
    bom: true,
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  return lignes.map((l) => versLigne(l, delimiter === ";"));
}

function lireJson(fichier: string): LigneDvf[] {
  const data = JSON.parse(readFileSync(fichier, "utf8")) as {
    mutations?: Record<string, unknown>[];
  };
  const mutations = Array.isArray(data) ? (data as Record<string, unknown>[]) : data.mutations ?? [];
  return mutations.map((m) => versLigne(m, false));
}

async function telecharger(cible: string): Promise<string> {
  const [insee, section] = cible.split("/");
  if (!insee || !section) throw new Error("--telecharger attend <code insee>/<section>, ex. 34032/000PX");
  const url = `https://app.dvf.etalab.gouv.fr/api/mutations3/${insee}/${section}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement échoué (${res.status}) : ${url}`);
  const dossier = path.join("audit", "data");
  mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, `${insee}-${section}.json`);
  writeFileSync(fichier, await res.text());
  console.log(`Téléchargé : ${fichier} (source ${url})`);
  return fichier;
}

// ---------------------------------------------------------------------------
// 2. Regroupement par mutation : logique du site (dvf-clean.ts) + référence
// ---------------------------------------------------------------------------

interface LocalVu {
  type: string;
  surface: number;
  pieces: number;
  /** Numéro du lot (lot1_numero) : vide quand la mutation n'a pas de lots. */
  lot: string;
}

interface Mutation {
  id: string;
  date: string;
  nature: string;
  valeur: number | null;
  adresse: string;
  parcelles: Set<string>;
  nbLignes: number;
  locaux: LocalVu[]; // toutes les lignes de local (y compris répétées)
  nbDependances: number;
  nbCommerces: number;
  carrez: number | null;
  /** Résultat du nettoyage du site (scripts/dvf-clean.ts). */
  site: { retenue: true; type: TypeBien; surface: number; prixM2: number; lat: number; lon: number } | { retenue: false; raison: ExclusionReason };
  /** Résultat du filtre de référence (1 logement, pas de commerce, 300-3 500 €/m²). */
  reference: { retenue: true; type: TypeBien; surface: number; prixM2: number } | { retenue: false; raison: string };
}

const LIBELLE_EXCLUSION: Record<ExclusionReason, string> = {
  nature: "nature ≠ Vente",
  local_non_habitation: "local commercial/industriel dans la mutation",
  aucun_logement: "aucun logement (parcelle, dépendance seule…)",
  multi_logements: "plusieurs logements (après dédoublonnage)",
  dependances: "deux dépendances ou plus (prix des annexes non séparable)",
  valeur: "valeur hors 5 000 € – 10 M€",
  surface: "surface hors 8 – 500 m²",
  prix_m2: "prix/m² hors 200 – 25 000 €",
  coords: "coordonnées absentes",
};

function regrouper(lignes: LigneDvf[]): Mutation[] {
  const groupes = new Map<string, MutationGroup>();
  const infos = new Map<string, Mutation>();

  for (const l of lignes) {
    accumulateRow(groupes, l); // ← logique de production, inchangée
    let m = infos.get(l.id_mutation);
    if (!m) {
      m = {
        id: l.id_mutation,
        date: l.date_mutation,
        nature: l.nature_mutation,
        valeur: Number.parseFloat(l.valeur_fonciere) || null,
        adresse: l.adresse,
        parcelles: new Set(),
        nbLignes: 0,
        locaux: [],
        nbDependances: 0,
        nbCommerces: 0,
        carrez: null,
        site: { retenue: false, raison: "nature" },
        reference: { retenue: false, raison: "" },
      };
      infos.set(l.id_mutation, m);
    }
    m.nbLignes++;
    m.parcelles.add(l.id_parcelle);
    if (l.surface_carrez_lots) m.carrez = (m.carrez ?? 0) + l.surface_carrez_lots;
    if (l.type_local === "Dépendance") m.nbDependances++;
    else if (l.type_local === "Appartement" || l.type_local === "Maison") {
      m.locaux.push({
        type: l.type_local,
        surface: Number.parseFloat(l.surface_reelle_bati) || 0,
        pieces: Number.parseFloat(l.nombre_pieces_principales) || 0,
        lot: l.lot_numero,
      });
    } else if (l.type_local) m.nbCommerces++;
  }

  for (const [id, groupe] of groupes) {
    const m = infos.get(id)!;
    const resultat = finalizeGroup(groupe); // ← logique de production, inchangée
    if ("row" in resultat) {
      const r = resultat.row;
      m.site = {
        retenue: true,
        type: r.type_local,
        surface: r.surface_reelle_bati,
        prixM2: r.valeur_fonciere / r.surface_reelle_bati,
        lat: r.lat,
        lon: r.lon,
      };
    } else {
      m.site = { retenue: false, raison: resultat.excluded };
    }
    m.reference = filtreReference(groupe, m);
  }
  return [...infos.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Filtre « référence » (calcul indépendant de Virgile, 11/11/2026) : ventes
 * d'un seul logement, sans local commercial, lignes dédoublonnées (deux lignes
 * identiques = un logement ; deux numéros de lot différents = deux logements),
 * surface réelle bâtie, 300 ≤ €/m² ≤ 3 500. Volontairement indépendant des
 * règles du site pour rester un point de comparaison stable quand elles changent.
 */
function filtreReference(groupe: MutationGroup, m: Mutation): Mutation["reference"] {
  if (groupe.nature !== "Vente") return { retenue: false, raison: "nature ≠ Vente" };
  if (groupe.hasNonHousingLocal) return { retenue: false, raison: "local commercial" };
  const logements = new Set(m.locaux.map((l) => `${l.type}|${l.surface}|${l.pieces}|${l.lot}`));
  if (logements.size === 0) return { retenue: false, raison: "aucun logement" };
  if (logements.size > 1) {
    const lots = [...new Set(m.locaux.map((l) => l.lot).filter(Boolean))];
    return { retenue: false, raison: lots.length > 1 ? `plusieurs logements (lots n° ${lots.join(", ")})` : "plusieurs logements" };
  }
  const local = m.locaux[0];
  const type: TypeBien = local.type === "Maison" ? "maison" : "appartement";
  if (m.valeur === null || local.surface <= 0) return { retenue: false, raison: "valeur ou surface manquante" };
  const prixM2 = m.valeur / local.surface;
  if (prixM2 < 300 || prixM2 > 3500) return { retenue: false, raison: `prix/m² hors 300 – 3 500 (${fmt(prixM2)})` };
  return { retenue: true, type, surface: local.surface, prixM2 };
}

// ---------------------------------------------------------------------------
// 3. Statistiques de section (site vs référence)
// ---------------------------------------------------------------------------

interface Stat {
  n: number;
  moyenne: number | null;
  mediane: number | null;
}

function stat(valeurs: number[]): Stat {
  if (valeurs.length === 0) return { n: 0, moyenne: null, mediane: null };
  const moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  return { n: valeurs.length, moyenne, mediane: quantile(valeurs, 0.5) };
}

function moinsMois(dateIso: string, mois: number): string {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() - mois);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 4. Reproduction des fonctions SQL (find_comparables_*) et de l'import
// ---------------------------------------------------------------------------

/** Distance géodésique (haversine, sphère). PostGIS `geography` utilise le
 *  sphéroïde WGS84 : écart < 0,5 %, sans effet sur la sélection sauf cas limite. */
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Copie de lib/estimation/repository.ts:25-29 (non importable : client Supabase). */
function dateMinMutation(now: Date): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - MOIS_MAX_MUTATION);
  return d.toISOString().slice(0, 10);
}

interface ComparableAudit extends Comparable {
  id: string;
  adresse: string;
  valeur: number;
  surfaceBrute: number;
}

/**
 * Ligne telle qu'elle est stockée en base (scripts/import-dvf.ts:113-119) :
 * prix/m² arrondi à 2 décimales, surface arrondie à l'entier, position en
 * micro-degrés.
 */
function versLigneBase(m: Mutation & { site: { retenue: true } }, now: Date) {
  const latE6 = Math.round(m.site.lat * 1e6);
  const lonE6 = Math.round(m.site.lon * 1e6);
  return {
    m,
    prix_m2: Math.round(m.site.prixM2 * 100) / 100,
    surface: Math.round(m.site.surface),
    date: m.date,
    lat: latE6 / 1e6,
    lon: lonE6 / 1e6,
    now,
  };
}

function rechercherComparables(
  mutations: Mutation[],
  bien: { type: TypeBien; surface: number; lat: number; lon: number; codeInsee: string },
  now: Date,
  dateMax: string | null
): ComparablesParPalier & { dateMin: string; surfaceMin: number; surfaceMax: number } {
  // 3.0.0 (P2) : fenêtre ancrée sur la dernière vente connue (--date-max joue ce
  // rôle ici) ; sans --date-max, ancien comportement (30 mois avant la date du jour).
  const dateMin = dateMax ? moinsMois(dateMax, MOIS_MAX_MUTATION) : dateMinMutation(now);
  // find_comparables_radius : surface >= ceil(min) et <= floor(max) (lignes 56-57)
  const surfaceMin = Math.ceil(bien.surface * RATIO_SURFACE_MIN);
  const surfaceMax = Math.floor(bien.surface * RATIO_SURFACE_MAX);

  const candidats = mutations
    .filter((m): m is Mutation & { site: { retenue: true } } => m.site.retenue)
    .filter((m) => dateMax === null || m.date <= dateMax)
    .map((m) => versLigneBase(m, now))
    .filter((l) => l.m.site.type === bien.type)
    .filter((l) => l.surface >= surfaceMin && l.surface <= surfaceMax)
    .filter((l) => l.date >= dateMin)
    .map<ComparableAudit>((l) => ({
      id: l.m.id,
      adresse: l.m.adresse,
      valeur: l.m.valeur ?? 0,
      surfaceBrute: l.m.site.surface,
      prix_m2: l.prix_m2,
      surface_reelle_bati: l.surface,
      date_mutation: l.date,
      distance_m: distanceM(bien.lat, bien.lon, l.lat, l.lon),
    }))
    .sort((a, b) => a.distance_m - b.distance_m);

  const rayon3000 = candidats.filter((c) => c.distance_m <= 3000).slice(0, LIMITE_SQL);
  // Paliers suivants : appelés par repository.ts seulement si < 8 à 3 000 m.
  const commune =
    rayon3000.length < MIN_COMPARABLES
      ? candidats.slice(0, LIMITE_SQL) // le fichier est déjà limité à la commune
      : [];
  const departement = rayon3000.length < MIN_COMPARABLES && commune.length < MIN_COMPARABLES ? candidats.slice(0, LIMITE_SQL) : [];
  void bien.codeInsee;
  return { rayon3000, commune, departement, dateMin, surfaceMin, surfaceMax };
}

// ---------------------------------------------------------------------------
// 5. Mise en forme
// ---------------------------------------------------------------------------

function fmt(n: number | null, decimales = 0): string {
  if (n === null || !Number.isFinite(n)) return "–";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function ligneStat(libelle: string, s: Stat): string {
  return `| ${libelle} | ${s.n} | ${fmt(s.moyenne)} | ${fmt(s.mediane)} |`;
}

function sectionStats(
  titre: string,
  mutations: Mutation[],
  cle: "site" | "reference",
  dateFin: string,
  dateMaxBase: string | null
): string[] {
  const out: string[] = [`### ${titre}`, ""];
  const retenues = mutations.filter((m) => m[cle].retenue);
  const depuis12 = moinsMois(dateFin, 12);
  out.push(`| Périmètre | Ventes | Moyenne €/m² | Médiane €/m² |`, `|---|---:|---:|---:|`);
  for (const type of ["maison", "appartement"] as const) {
    const toutes = retenues.filter((m) => (m[cle] as { type: TypeBien }).type === type);
    const prix = (liste: Mutation[]) => liste.map((m) => (m[cle] as { prixM2: number }).prixM2);
    out.push(ligneStat(`${type}s, toute la période`, stat(prix(toutes))));
    out.push(ligneStat(`${type}s, 12 derniers mois (depuis le ${depuis12})`, stat(prix(toutes.filter((m) => m.date > depuis12)))));
    if (dateMaxBase) {
      out.push(ligneStat(`${type}s, ventes réellement en base (≤ ${dateMaxBase})`, stat(prix(toutes.filter((m) => m.date <= dateMaxBase)))));
    }
  }
  out.push("");
  return out;
}

function tableauMutations(mutations: Mutation[]): string[] {
  const out = [
    "| id_mutation | Date | Adresse | Lignes | Locaux (type/surface/pièces) | Dép. | Prix | Site | Référence |",
    "|---|---|---|---:|---|---:|---:|---|---|",
  ];
  for (const m of mutations) {
    const locaux = m.locaux.map((l) => `${l.type[0]}${l.surface}/${l.pieces}`).join(", ") + (m.nbCommerces ? ` +${m.nbCommerces} commerce` : "");
    const site = m.site.retenue ? `✅ ${fmt(m.site.prixM2)} €/m²` : `❌ ${LIBELLE_EXCLUSION[m.site.raison]}`;
    const ref = m.reference.retenue ? `✅ ${fmt(m.reference.prixM2)} €/m²` : `❌ ${m.reference.raison}`;
    out.push(`| ${m.id} | ${m.date} | ${m.adresse} | ${m.nbLignes} | ${locaux || "–"} | ${m.nbDependances || ""} | ${fmt(m.valeur)} | ${site} | ${ref} |`);
  }
  return out;
}

function ecarts(mutations: Mutation[]): string[] {
  const out: string[] = [];
  const diff = mutations.filter((m) => m.site.retenue !== m.reference.retenue);
  if (diff.length === 0) return ["Aucune différence entre les deux filtres."];
  out.push("| id_mutation | Date | Prix | Locaux | Site | Référence | Pourquoi |", "|---|---|---:|---|---|---|---|");
  for (const m of diff) {
    const locaux = m.locaux.map((l) => `${l.type[0]}${l.surface}/${l.pieces}`).join(", ");
    const pourquoi = m.site.retenue
      ? `le site garde tout ce qui est entre 200 et 25 000 €/m² ; ici ${fmt((m.site as { prixM2: number }).prixM2)} €/m²` +
        (m.locaux.length > 1
          ? new Set(m.locaux.map((l) => l.lot)).size > 1
            ? ` (${m.locaux.length} logements identiques mais lots n° ${m.locaux.map((l) => l.lot).join(" et ")} : fusionnés en un seul par le site, prix total attribué à un seul logement)`
            : ` (${m.locaux.length} lignes de logement identiques sans numéro de lot, fusionnées en une seule : prix total attribué à un seul logement)`
          : "") +
        (m.nbDependances ? ` ; ${m.nbDependances} dépendance(s) dont le prix est inclus` : "")
      : `exclue par le site : ${LIBELLE_EXCLUSION[(m.site as { raison: ExclusionReason }).raison]}`;
    out.push(`| ${m.id} | ${m.date} | ${fmt(m.valeur)} | ${locaux} | ${m.site.retenue ? "✅" : "❌"} | ${m.reference.retenue ? "✅" : "❌"} | ${pourquoi} |`);
  }
  return out;
}

function reproduireMoteur(
  mutations: Mutation[],
  bien: CaracteristiquesBien & { lat: number; lon: number; codeInsee: string },
  now: Date,
  dateMax: string | null
): string[] {
  const out: string[] = [];
  const recherche = rechercherComparables(mutations, { type: bien.typeBien, surface: bien.surface, lat: bien.lat, lon: bien.lon, codeInsee: bien.codeInsee }, now, dateMax);
  out.push(
    `- Bien : ${bien.typeBien} de ${bien.surface} m² au point ${bien.lat.toFixed(6)}, ${bien.lon.toFixed(6)}`,
    `- Date de calcul : ${now.toISOString().slice(0, 10)} → ventes depuis le **${recherche.dateMin}** (30 mois, repository.ts:25-29)` +
      (dateMax ? ` et jusqu'au ${dateMax} (contenu de la base)` : ""),
    `- Surface des comparables : **${recherche.surfaceMin} à ${recherche.surfaceMax} m²** (×0,7 / ×1,3 puis ceil/floor, SQL lignes 56-57)`,
    `- Candidats ≤ 3 000 m : ${recherche.rayon3000.length}` +
      RAYONS_M.map((r) => ` ; ≤ ${r} m : ${recherche.rayon3000.filter((c) => c.distance_m <= r).length}`).join(""),
    ""
  );

  const selection = choisirPalier(recherche);
  if (!selection) {
    out.push(`**Aucun palier n'atteint ${MIN_COMPARABLES} comparables dans ce fichier → le site basculerait en estimation manuelle** (si le fichier ne couvre qu'une section, la vraie base contient le reste de la commune : voir audit/comparables-base.ts).`);
    return out;
  }
  const { gardes, ecartes } = ecarterAtypiques(selection.retenus);
  const retenus = gardes as ComparableAudit[];
  const palier = selection.palier.type === "rayon" ? `rayon ${selection.palier.rayonM} m` : selection.palier.type;
  out.push(
    `**Palier retenu : ${palier}** (premier palier avec ≥ ${MIN_COMPARABLES} ventes, vente.ts) - ${selection.retenus.length} comparables, dont ${ecartes.length} écartée(s) comme atypique(s) (règle de Tukey dès 12 ventes, 3.0.0)` +
      (ecartes.length ? ` : ${(ecartes as ComparableAudit[]).map((c) => `${c.id} à ${fmt(c.prix_m2)} €/m²`).join(", ")}` : ""),
    ""
  );

  // Tableau des comparables, triés par prix/m² pour suivre la médiane pondérée
  const pondere = retenus.map((c) => ({ c, poids: poidsComparable(c, now) })).sort((a, b) => a.c.prix_m2 - b.c.prix_m2);
  const total = pondere.reduce((s, p) => s + p.poids, 0);
  let cumul = 0;
  let mediane: number | null = null;
  out.push(
    "| id_mutation | Date | Adresse | Prix | Surface | €/m² | Distance | Poids | Cumul poids |",
    "|---|---|---|---:|---:|---:|---:|---:|---:|"
  );
  for (const { c, poids } of pondere) {
    cumul += poids;
    const atteint = mediane === null && cumul >= total / 2;
    if (atteint) mediane = c.prix_m2;
    out.push(
      `| ${c.id} | ${c.date_mutation} | ${c.adresse} | ${fmt(c.valeur)} | ${c.surface_reelle_bati} | ${fmt(c.prix_m2)} | ${fmt(c.distance_m)} m | ${poids.toFixed(3)} | ${cumul.toFixed(3)}${atteint ? " ← médiane" : ""} |`
    );
  }
  out.push("");

  const estimation = estimerVente(bien, recherche, now);
  if (!estimation) return out;
  const prixM2Zone = weightedMedian(retenus.map((c) => ({ value: c.prix_m2, weight: poidsComparable(c, now) })));
  const prix = retenus.map((c) => c.prix_m2);
  const q1 = quantile(prix, 0.25);
  const q3 = quantile(prix, 0.75);
  const ajustement = calculerAjustement(bien);
  const dispersion = iqr(prix) / prixM2Zone;
  out.push(
    "**Calcul à la main (formules de lib/estimation/vente.ts:89-119)**",
    "",
    `1. Poids d'une vente = 1/(1+distance_km) × 1/(1+ancienneté_mois/12) ; poids total = ${total.toFixed(3)}, moitié = ${(total / 2).toFixed(3)}.`,
    `2. Médiane pondérée = première valeur (prix croissants) dont le cumul des poids atteint la moitié → **prixM2Zone = ${fmt(prixM2Zone)} €/m²** (médiane simple non pondérée : ${fmt(quantile(prix, 0.5))} ; moyenne simple : ${fmt(prix.reduce((s, v) => s + v, 0) / prix.length)}).`,
    `3. Ajustements (somme plafonnée ±25 %) = ${(ajustement * 100).toFixed(0)} % → prixM2Ajuste = ${fmt(prixM2Zone)} × ${(1 + ajustement).toFixed(2)} = **${fmt(prixM2Zone * (1 + ajustement))} €/m²**.`,
    `4. Médiane du bien = ${fmt(prixM2Zone * (1 + ajustement))} × ${bien.surface} m² = ${fmt(prixM2Zone * (1 + ajustement) * bien.surface)} € → arrondi au millier : **${fmt(estimation.mediane)} €**.`,
    `5. Dispersion = (Q3 − Q1) / prixM2Zone = (${fmt(q3)} − ${fmt(q1)}) / ${fmt(prixM2Zone)} = ${dispersion.toFixed(3)} → fourchette = clamp(${dispersion.toFixed(3)} × 40, 5, 10) = **±${estimation.fourchettePct} %**.`,
    `6. Fourchette : **${fmt(estimation.fourchetteBasse)} € – ${fmt(estimation.fourchetteHaute)} €**, confiance **${estimation.confiance}** (haute si ≥ 15 ventes et rayon ≤ 800 m ; moyenne si ≥ 8 en rayon ; faible sinon).`,
    "",
    "```json",
    JSON.stringify(estimation, null, 2),
    "```"
  );
  return out;
}

// ---------------------------------------------------------------------------
// 6. Programme principal
// ---------------------------------------------------------------------------

function lireListe<T extends string>(valeur: string | true | undefined): T[] | undefined {
  if (typeof valeur !== "string") return undefined;
  return valeur.split(",").map((v) => v.trim()).filter(Boolean) as T[];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const fichier = typeof args.get("csv") === "string" ? (args.get("csv") as string) : null;
  let json = typeof args.get("json") === "string" ? (args.get("json") as string) : null;
  if (typeof args.get("telecharger") === "string") json = await telecharger(args.get("telecharger") as string);
  if (!fichier && !json) {
    console.error("Usage : --csv <export.csv> | --json <export.json> | --telecharger <insee>/<section> [--section 000PX] [--type … --surface …]");
    process.exit(1);
  }

  let lignes = fichier ? lireCsv(fichier) : lireJson(json!);
  const source = fichier ?? json!;
  const section = typeof args.get("section") === "string" ? (args.get("section") as string).toUpperCase() : null;
  if (section) lignes = lignes.filter((l) => l.section === section);
  if (lignes.length === 0) throw new Error("Aucune ligne (vérifier le fichier ou --section).");

  const now = typeof args.get("date-ref") === "string" ? new Date(`${args.get("date-ref")}T12:00:00`) : new Date();
  const dateMax = typeof args.get("date-max") === "string" ? (args.get("date-max") as string) : null;

  const mutations = regrouper(lignes);
  const dates = lignes.map((l) => l.date_mutation).sort();
  const codeInsee = lignes[0].code_commune;

  const out: string[] = [];
  out.push(
    `# Reproduction du calcul d'estimation - ${source}${section ? ` (section ${section})` : ""}`,
    "",
    `- ${lignes.length} lignes, ${mutations.length} mutations, ventes du ${dates[0]} au ${dates[dates.length - 1]}`,
    `- Généré le ${new Date().toISOString().slice(0, 16).replace("T", " ")} ; date de calcul : ${now.toISOString().slice(0, 10)}`,
    `- Logique importée du site : scripts/dvf-clean.ts (nettoyage), lib/estimation/vente.ts, stats.ts, ajustements.ts ; SQL et arrondis d'import reproduits dans ce script.`,
    ""
  );

  // A. Comptes par motif
  const motifs = new Map<string, number>();
  for (const m of mutations) {
    const cle = m.site.retenue ? "retenue par le site" : LIBELLE_EXCLUSION[m.site.raison];
    motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
  }
  out.push("## A. Tri des mutations par le nettoyage du site (scripts/dvf-clean.ts)", "", "| Statut | Mutations |", "|---|---:|");
  for (const [cle, n] of [...motifs.entries()].sort((a, b) => b[1] - a[1])) out.push(`| ${cle} | ${n} |`);
  out.push("");

  // B. Statistiques
  out.push("## B. Prix au m² de la zone, avant tout ajustement", "");
  out.push(...sectionStats("Filtres du site (Vente, 1 logement, pas de commerce, 8-500 m², 5 k€-10 M€, 200-25 000 €/m², coordonnées)", mutations, "site", dates[dates.length - 1], dateMax));
  out.push(...sectionStats("Filtres de référence (Vente, 1 logement, pas de commerce, 300-3 500 €/m²)", mutations, "reference", dates[dates.length - 1], dateMax));
  out.push("### Mutations classées différemment par les deux filtres", "", ...ecarts(mutations), "");

  // Carrez vs surface réelle bâtie (appartements retenus avec lots Carrez)
  const avecCarrez = mutations.filter((m) => m.site.retenue && (m.site as { type: TypeBien }).type === "appartement" && m.carrez && m.locaux.length === 1);
  if (avecCarrez.length > 0) {
    // Ratio sur la surface réelle bâtie brute (depuis la 2.0.0, la surface retenue par le site est déjà la Carrez)
    const ratios = avecCarrez.map((m) => (m.carrez as number) / m.locaux[0].surface);
    out.push(
      "### Surface Carrez des lots vs surface réelle bâtie (appartements retenus)",
      "",
      `${avecCarrez.length} appartements ont une surface Carrez renseignée : ratio Carrez / surface_reelle_bati médian **${quantile(ratios, 0.5).toFixed(3)}** (Q1 ${quantile(ratios, 0.25).toFixed(3)}, Q3 ${quantile(ratios, 0.75).toFixed(3)}). Depuis la 2.0.0, le site retient la surface Carrez du lot quand elle est plausible (ratio 0,5-1,5), sinon la surface réelle bâtie.`,
      ""
    );
  }

  // C. Reproduction du moteur
  const type = args.get("type") as TypeBien | undefined;
  const surface = Number.parseFloat(String(args.get("surface") ?? ""));
  if (type && Number.isFinite(surface)) {
    const retenues = mutations.filter((m): m is Mutation & { site: { retenue: true } } => m.site.retenue);
    const lat = Number.parseFloat(String(args.get("lat") ?? "")) || retenues.reduce((s, m) => s + m.site.lat, 0) / retenues.length;
    const lon = Number.parseFloat(String(args.get("lon") ?? "")) || retenues.reduce((s, m) => s + m.site.lon, 0) / retenues.length;
    const bien: CaracteristiquesBien & { lat: number; lon: number; codeInsee: string } = {
      typeBien: type,
      surface,
      lat,
      lon,
      codeInsee,
      etatGeneral: (args.get("etat") as EtatGeneral | undefined) ?? null,
      dpe: (args.get("dpe") as Dpe | undefined) ?? null,
      etage: typeof args.get("etage") === "string" ? Number.parseInt(args.get("etage") as string, 10) : null,
      ascenseur: args.get("ascenseur") === "oui" ? true : args.get("ascenseur") === "non" ? false : null,
      exterieur: lireListe<Exterieur>(args.get("exterieur")) ?? [],
      stationnement: (args.get("stationnement") as Stationnement | undefined) ?? null,
      ageCuisine: (args.get("cuisine") as AgeTranche | undefined) ?? null,
      ageSdb: (args.get("sdb") as AgeTranche | undefined) ?? null,
      atouts: args.get("dernier-etage") ? ["dernier_etage"] : [],
    };
    out.push("## C. Reproduction du moteur du site pour un bien donné", "", ...reproduireMoteur(mutations, bien, now, dateMax), "");
  } else {
    out.push("## C. Reproduction du moteur", "", "Passer `--type appartement|maison --surface <m²>` pour rejouer le moteur sur un bien.", "");
  }

  // D. Détail de toutes les mutations
  out.push("## D. Toutes les mutations du fichier", "", ...tableauMutations(mutations), "");

  const texte = out.join("\n");
  const sortie =
    typeof args.get("sortie") === "string"
      ? (args.get("sortie") as string)
      : path.join("audit", "sorties", `${path.basename(source).replace(/\.[^.]+$/, "")}${section ? `-${section}` : ""}-${now.toISOString().slice(0, 10)}.md`);
  mkdirSync(path.dirname(sortie), { recursive: true });
  writeFileSync(sortie, texte);
  console.log(texte);
  console.log(`\n→ Rapport écrit dans ${sortie}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
