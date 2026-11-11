import { fenetrePour, type Fenetre, type Regime } from "./indexation";

/**
 * Analyse d'une commune : transforme les agrégats (communes_stats +
 * commune_contexte()) en « faits » qualitatifs dont dépendent les textes
 * des pages (marché en hausse ou en baisse, peu ou beaucoup de ventes,
 * commune plus chère ou moins chère que ses voisines…). Fonctions pures.
 */

export interface StatsCommune {
  code_insee: string;
  nom_commune: string;
  slug: string;
  code_postal: string | null;
  departement: string;
  prix_m2_median_appartement: number | null;
  prix_m2_median_maison: number | null;
  nb_ventes_12m: number;
  evolution_1an_pct: number | null;
  nb_ventes_36m?: number | null;
  prix_m2_median_36m_appartement?: number | null;
  prix_m2_median_36m_maison?: number | null;
}

export interface VoisineContexte {
  code_insee: string;
  nom_commune: string;
  slug: string;
  code_postal: string | null;
  departement: string;
  prix_m2_median_appartement: number | null;
  prix_m2_median_maison: number | null;
  nb_ventes_12m: number;
  nb_ventes_36m: number | null;
  prix_m2_median_36m_appartement: number | null;
  prix_m2_median_36m_maison: number | null;
  distance_km: number;
}

export interface ContexteCommune {
  geo: { lat: number; lon: number; population: number | null; code_region: string | null } | null;
  insee: {
    millesime: number;
    logements: number | null;
    residences_principales: number | null;
    rp_proprietaires: number | null;
    maisons: number | null;
    appartements: number | null;
  } | null;
  departement: {
    departement: string;
    prix_m2_median_appartement: number | null;
    prix_m2_median_maison: number | null;
    nb_ventes_12m: number;
    evolution_1an_pct: number | null;
  } | null;
  voisines: VoisineContexte[];
  annuelles: { annee: number; type_local: "A" | "M"; nb_ventes: number; prix_m2_median: number | null }[];
  derniere_vente: string | null;
}

export type TypeLocal = "A" | "M";
export type Tendance = "hausse" | "baisse" | "stable";
export type Volume = "faible" | "moyen" | "fort";
export type Position = "plusCher" | "moinsCher" | "proche";

export interface PrixAffiches {
  fenetre: Fenetre;
  ventes: number;
  appart: number | null;
  maison: number | null;
}

export interface VoisineComparee extends VoisineContexte {
  /** Prix du type de référence, dans la fenêtre de la commune. */
  prix: number | null;
}

export interface LigneAnnuelle {
  annee: number;
  appart: { nb: number; prix: number | null } | null;
  maison: { nb: number; prix: number | null } | null;
}

export interface Faits {
  prix: PrixAffiches;
  typeReference: TypeLocal | null;
  prixReference: number | null;
  evolution1an: number | null;
  tendance: Tendance | null;
  volume: Volume;
  voisines: VoisineComparee[];
  nbVoisinesComparees: number;
  medianeVoisines: number | null;
  ecartVoisinesPct: number | null;
  positionVoisines: Position | null;
  prixDepartement: number | null;
  ecartDepartementPct: number | null;
  positionDepartement: Position | null;
  evolutionLongue: { depuis: number; jusqua: number; pct: number } | null;
  serieAnnuelle: LigneAnnuelle[];
  insee: {
    millesime: number;
    population: number | null;
    logements: number | null;
    partProprietaires: number | null;
    partMaisons: number | null;
    partAppartements: number | null;
    dominante: "maisons" | "appartements" | "mixte" | null;
  } | null;
}

/** Sous ce volume annuel, l'évolution sur un an n'est que du bruit. */
export const SEUIL_EVOLUTION = 10;
/** Nombre de voisines comparées (les plus proches ayant un prix). */
export const NB_VOISINES_COMPAREES = 5;
/** Écart (en %) en deçà duquel deux prix sont « proches ». */
const SEUIL_PROCHE_PCT = 5;
/** Volume annuel minimal pour qu'une médiane annuelle compte dans l'évolution longue. */
const SEUIL_ANNEE = 5;

export function evolutionAffichable(
  stats: Pick<StatsCommune, "nb_ventes_12m" | "evolution_1an_pct">
): boolean {
  return stats.evolution_1an_pct !== null && stats.nb_ventes_12m >= SEUIL_EVOLUTION;
}

/** Prix et volume à afficher selon la fenêtre du régime. */
export function prixAffiches(stats: StatsCommune, fenetre: Fenetre): PrixAffiches {
  if (fenetre === "36m") {
    return {
      fenetre,
      ventes: stats.nb_ventes_36m ?? 0,
      appart: stats.prix_m2_median_36m_appartement ?? null,
      maison: stats.prix_m2_median_36m_maison ?? null,
    };
  }
  return {
    fenetre,
    ventes: stats.nb_ventes_12m,
    appart: stats.prix_m2_median_appartement,
    maison: stats.prix_m2_median_maison,
  };
}

/** Prix d'une voisine pour un type, dans la fenêtre de la commune (repli sur 12 mois). */
function prixVoisine(v: VoisineContexte, type: TypeLocal, fenetre: Fenetre): number | null {
  if (fenetre === "36m") {
    const p36 = type === "A" ? v.prix_m2_median_36m_appartement : v.prix_m2_median_36m_maison;
    if (p36) return p36;
  }
  return type === "A" ? v.prix_m2_median_appartement : v.prix_m2_median_maison;
}

function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const m = (tri.length - 1) / 2;
  return (tri[Math.floor(m)] + tri[Math.ceil(m)]) / 2;
}

function position(prix: number | null, reference: number | null): {
  ecart: number | null;
  position: Position | null;
} {
  if (!prix || !reference) return { ecart: null, position: null };
  const ecart = Math.round(((prix - reference) / reference) * 1000) / 10;
  if (Math.abs(ecart) < SEUIL_PROCHE_PCT) return { ecart, position: "proche" };
  return { ecart, position: ecart > 0 ? "plusCher" : "moinsCher" };
}

export function tendanceDe(evolution: number | null): Tendance | null {
  if (evolution === null) return null;
  if (Math.abs(evolution) < 0.5) return "stable";
  return evolution > 0 ? "hausse" : "baisse";
}

/** Faible : moins de 20 ventes par an ; fort : 100 et plus. */
export function volumeDe(ventesParAn: number): Volume {
  if (ventesParAn < 20) return "faible";
  if (ventesParAn < 100) return "moyen";
  return "fort";
}

/**
 * Type de bien de référence pour les comparaisons : celui qui domine le parc
 * (INSEE) s'il a un prix, sinon celui qui a un prix.
 */
export function typeReferenceDe(
  prix: PrixAffiches,
  insee: ContexteCommune["insee"]
): TypeLocal | null {
  const maisonsDominent =
    insee?.maisons != null && insee.appartements != null
      ? insee.maisons >= insee.appartements
      : null;
  if (prix.appart && prix.maison) {
    if (maisonsDominent === null) return "A";
    return maisonsDominent ? "M" : "A";
  }
  if (prix.appart) return "A";
  if (prix.maison) return "M";
  return null;
}

export function serieAnnuelleDe(annuelles: ContexteCommune["annuelles"]): LigneAnnuelle[] {
  const parAnnee = new Map<number, LigneAnnuelle>();
  for (const a of annuelles) {
    const ligne = parAnnee.get(a.annee) ?? { annee: a.annee, appart: null, maison: null };
    const valeur = { nb: a.nb_ventes, prix: a.prix_m2_median };
    if (a.type_local === "A") ligne.appart = valeur;
    else ligne.maison = valeur;
    parAnnee.set(a.annee, ligne);
  }
  return [...parAnnee.values()].sort((x, y) => x.annee - y.annee);
}

/** Évolution entre la première et la dernière année fiable (≥ 5 ventes), si ≥ 2 ans d'écart. */
export function evolutionLongueDe(
  annuelles: ContexteCommune["annuelles"],
  type: TypeLocal | null
): Faits["evolutionLongue"] {
  if (!type) return null;
  const fiables = annuelles
    .filter((a) => a.type_local === type && a.nb_ventes >= SEUIL_ANNEE && a.prix_m2_median)
    .sort((x, y) => x.annee - y.annee);
  if (fiables.length < 2) return null;
  const premiere = fiables[0];
  const derniere = fiables[fiables.length - 1];
  if (derniere.annee - premiere.annee < 2) return null;
  const pct =
    Math.round(((derniere.prix_m2_median! - premiere.prix_m2_median!) / premiere.prix_m2_median!) * 1000) /
    10;
  return { depuis: premiere.annee, jusqua: derniere.annee, pct };
}

function pourcentage(part: number | null | undefined, total: number | null | undefined): number | null {
  if (part == null || !total) return null;
  return Math.round((part / total) * 100);
}

export function inseeDe(contexte: ContexteCommune | null): Faits["insee"] {
  const i = contexte?.insee;
  if (!i) return null;
  const partMaisons = pourcentage(i.maisons, i.logements);
  const partAppartements = pourcentage(i.appartements, i.logements);
  let dominante: NonNullable<Faits["insee"]>["dominante"] = null;
  if (partMaisons !== null && partAppartements !== null) {
    if (partMaisons >= 65) dominante = "maisons";
    else if (partAppartements >= 65) dominante = "appartements";
    else dominante = "mixte";
  }
  return {
    millesime: i.millesime,
    population: contexte?.geo?.population ?? null,
    logements: i.logements,
    partProprietaires: pourcentage(i.rp_proprietaires, i.residences_principales),
    partMaisons,
    partAppartements,
    dominante,
  };
}

export function analyserCommune(
  stats: StatsCommune,
  contexte: ContexteCommune | null,
  regime: Pick<Regime, "fenetre"> = { fenetre: fenetrePour(stats) }
): Faits {
  const prix = prixAffiches(stats, regime.fenetre);
  const insee = inseeDe(contexte);
  const typeReference = typeReferenceDe(prix, contexte?.insee ?? null);
  const prixReference = typeReference ? (typeReference === "A" ? prix.appart : prix.maison) : null;

  const evolution1an = evolutionAffichable(stats) ? Number(stats.evolution_1an_pct) : null;
  const ventesParAn = prix.fenetre === "36m" ? prix.ventes / 3 : prix.ventes;

  const voisines: VoisineComparee[] = (contexte?.voisines ?? []).map((v) => ({
    ...v,
    prix: typeReference ? prixVoisine(v, typeReference, prix.fenetre) : null,
  }));
  const comparees = voisines.filter((v) => v.prix).slice(0, NB_VOISINES_COMPAREES);
  const medianeVoisines = mediane(comparees.map((v) => v.prix!));
  const vsVoisines = position(prixReference, comparees.length >= 3 ? medianeVoisines : null);

  const prixDepartement = typeReference
    ? typeReference === "A"
      ? (contexte?.departement?.prix_m2_median_appartement ?? null)
      : (contexte?.departement?.prix_m2_median_maison ?? null)
    : null;
  const vsDepartement = position(prixReference, prixDepartement);

  return {
    prix,
    typeReference,
    prixReference,
    evolution1an,
    tendance: tendanceDe(evolution1an),
    volume: volumeDe(ventesParAn),
    voisines,
    nbVoisinesComparees: comparees.length,
    medianeVoisines: comparees.length >= 3 ? medianeVoisines : null,
    ecartVoisinesPct: vsVoisines.ecart,
    positionVoisines: vsVoisines.position,
    prixDepartement,
    ecartDepartementPct: vsDepartement.ecart,
    positionDepartement: vsDepartement.position,
    evolutionLongue: evolutionLongueDe(contexte?.annuelles ?? [], typeReference),
    serieAnnuelle: serieAnnuelleDe(contexte?.annuelles ?? []),
    insee,
  };
}
