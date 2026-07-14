/** Types partagés du moteur d'estimation (fonctions pures, cf. starter.md). */

export type Projet = "vente" | "location";
export type TypeBien = "appartement" | "maison";
export type Horizon = "en_vente" | "moins_3_mois" | "3_6_mois" | "curiosite";
export type EtatGeneral = "a_renover" | "a_rafraichir" | "bon" | "refait_neuf";
export type AgeTranche = "moins_5" | "5_10" | "10_20" | "plus_20";
export type Dpe = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "ne_sait_pas";
export type Exterieur = "balcon" | "terrasse" | "jardin";
export type Stationnement = "aucun" | "place" | "garage_box";
export type AnneeConstruction =
  | "avant_1950"
  | "1950_1975"
  | "1975_2000"
  | "2000_2012"
  | "apres_2012";
export type Atout =
  | "vue_degagee"
  | "lumineux"
  | "calme"
  | "dernier_etage"
  | "traversant";

export type Confiance = "haute" | "moyenne" | "faible";

/** Vente comparable retournée par les fonctions SQL find_comparables_*. */
export interface Comparable {
  prix_m2: number;
  surface_reelle_bati: number;
  date_mutation: string; // ISO yyyy-mm-dd
  distance_m: number;
}

/** Caractéristiques qualitatives utilisées par les ajustements. */
export interface CaracteristiquesBien {
  typeBien: TypeBien;
  surface: number;
  pieces?: number | null;
  etage?: number | null;
  ascenseur?: boolean | null;
  etatGeneral?: EtatGeneral | null;
  ageCuisine?: AgeTranche | null;
  ageSdb?: AgeTranche | null;
  dpe?: Dpe | null;
  exterieur?: Exterieur[];
  stationnement?: Stationnement | null;
  atouts?: Atout[];
}

export type Palier =
  | { type: "rayon"; rayonM: number }
  | { type: "commune" }
  | { type: "departement" };

export interface EstimationVente {
  projet: "vente";
  fourchetteBasse: number;
  mediane: number;
  fourchetteHaute: number;
  /** Médiane pondérée €/m² de la zone, AVANT ajustements. */
  prixM2Zone: number;
  prixM2Ajuste: number;
  nbComparables: number;
  /** Rayon du palier retenu (null si palier commune/département). */
  rayonM: number | null;
  palier: Palier["type"];
  confiance: Confiance;
  /** Somme des coefficients d'ajustement appliquée (déjà plafonnée ±25 %). */
  ajustementPct: number;
  /** Demi-largeur de la fourchette en % (6 à 15 selon dispersion). */
  fourchettePct: number;
}

export type TypologieLoyer = "t1_t2" | "t3_plus" | "toutes" | "maison";

export interface LoyersCommune {
  loyer_m2_appartement: number | null;
  loyer_m2_appt_t1_t2: number | null;
  loyer_m2_appt_t3_plus: number | null;
  loyer_m2_maison: number | null;
  millesime: number;
}

export type DpeAlerteLocation =
  | "interdit_depuis_2025" // DPE G
  | "interdit_2028" // DPE F
  | "interdit_2034" // DPE E
  | null;

export interface EstimationLocation {
  projet: "location";
  loyerBas: number;
  loyerMedian: number;
  loyerHaut: number;
  /** €/m² ANIL retenu (charges comprises), avant ajustements. */
  loyerM2Zone: number;
  typologie: TypologieLoyer;
  millesime: number;
  ajustementPct: number;
  confiance: "indicative";
  dpeAlerte: DpeAlerteLocation;
}
