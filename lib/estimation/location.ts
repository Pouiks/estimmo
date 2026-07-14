/**
 * Estimation LOCATION — fonctions pures.
 *
 * Loyer mensuel = loyer_m2 ANIL de la commune (colonne selon type et
 * typologie : T1-T2 si ≤ 2 pièces, T3+ sinon, maison) × surface.
 * Fourchette ±10 %. Ajustements limités : état général (−8 % à +5 %) et
 * DPE F/G (−8 %). Confiance toujours « indicative » + mention ANIL.
 */
import { arrondi, clamp } from "./stats";
import type {
  CaracteristiquesBien,
  DpeAlerteLocation,
  EstimationLocation,
  LoyersCommune,
  TypologieLoyer,
} from "./types";

const ETAT_GENERAL_LOCATION = {
  a_renover: -0.08,
  a_rafraichir: -0.04,
  bon: 0,
  refait_neuf: 0.05,
} as const;

export function choisirLoyerM2(
  bien: Pick<CaracteristiquesBien, "typeBien" | "pieces">,
  loyers: LoyersCommune
): { loyerM2: number; typologie: TypologieLoyer } | null {
  if (bien.typeBien === "maison") {
    return loyers.loyer_m2_maison !== null
      ? { loyerM2: loyers.loyer_m2_maison, typologie: "maison" }
      : null;
  }

  const pieces = bien.pieces ?? null;
  if (pieces !== null && pieces <= 2 && loyers.loyer_m2_appt_t1_t2 !== null) {
    return { loyerM2: loyers.loyer_m2_appt_t1_t2, typologie: "t1_t2" };
  }
  if (pieces !== null && pieces >= 3 && loyers.loyer_m2_appt_t3_plus !== null) {
    return { loyerM2: loyers.loyer_m2_appt_t3_plus, typologie: "t3_plus" };
  }
  return loyers.loyer_m2_appartement !== null
    ? { loyerM2: loyers.loyer_m2_appartement, typologie: "toutes" }
    : null;
}

/**
 * Calendrier loi Climat & Résilience (interdiction de louer les passoires) :
 * G interdit depuis janv. 2025, F à partir de 2028, E à partir de 2034.
 */
export function alerteDpeLocation(
  dpe: CaracteristiquesBien["dpe"]
): DpeAlerteLocation {
  if (dpe === "G") return "interdit_depuis_2025";
  if (dpe === "F") return "interdit_2028";
  if (dpe === "E") return "interdit_2034";
  return null;
}

/**
 * Calcule l'estimation de loyer. Retourne null si la commune n'a pas
 * d'indicateur ANIL exploitable → fallback estimation manuelle.
 */
export function estimerLocation(
  bien: CaracteristiquesBien,
  loyers: LoyersCommune | null
): EstimationLocation | null {
  if (!loyers) return null;

  const choix = choisirLoyerM2(bien, loyers);
  if (!choix) return null;

  let ajustement = 0;
  if (bien.etatGeneral) ajustement += ETAT_GENERAL_LOCATION[bien.etatGeneral];
  if (bien.dpe === "F" || bien.dpe === "G") ajustement += -0.08;
  ajustement = clamp(ajustement, -0.16, 0.05);

  const loyerMedian = choix.loyerM2 * bien.surface * (1 + ajustement);

  return {
    projet: "location",
    loyerBas: arrondi(loyerMedian * 0.9, 10),
    loyerMedian: arrondi(loyerMedian, 10),
    loyerHaut: arrondi(loyerMedian * 1.1, 10),
    loyerM2Zone: choix.loyerM2,
    typologie: choix.typologie,
    millesime: loyers.millesime,
    ajustementPct: Math.round(ajustement * 100),
    confiance: "indicative",
    dpeAlerte: alerteDpeLocation(bien.dpe),
  };
}
