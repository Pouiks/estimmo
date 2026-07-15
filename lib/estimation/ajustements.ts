/**
 * Coefficients d'ajustement du prix/m² (vente) - cf. starter.md.
 * Chaque coefficient est borné par construction ; la SOMME est plafonnée
 * à ±25 % avant application.
 */
import { clamp } from "./stats";
import type {
  AgeTranche,
  CaracteristiquesBien,
  Dpe,
  EtatGeneral,
} from "./types";

export const PLAFOND_AJUSTEMENT = 0.25;

const ETAT_GENERAL: Record<EtatGeneral, number> = {
  a_renover: -0.15,
  a_rafraichir: -0.07,
  bon: 0,
  refait_neuf: 0.08,
};

const AGE_PIECE: Record<AgeTranche, number> = {
  moins_5: 0.03,
  "5_10": 0,
  "10_20": -0.02,
  plus_20: -0.04,
};

const DPE: Record<Dpe, number> = {
  A: 0.05,
  B: 0.05,
  C: 0,
  D: 0,
  E: -0.04,
  F: -0.08,
  G: -0.12,
  ne_sait_pas: 0,
};

const EXTERIEUR = { balcon: 0.03, terrasse: 0.05, jardin: 0.06 } as const;

const STATIONNEMENT = { aucun: 0, place: 0.02, garage_box: 0.04 } as const;

/** Somme des coefficients, chacun borné, total plafonné à ±25 %. */
export function calculerAjustement(bien: CaracteristiquesBien): number {
  let total = 0;

  if (bien.etatGeneral) total += ETAT_GENERAL[bien.etatGeneral];
  if (bien.ageCuisine) total += AGE_PIECE[bien.ageCuisine];
  if (bien.ageSdb) total += AGE_PIECE[bien.ageSdb];
  if (bien.dpe) total += DPE[bien.dpe];

  if (bien.typeBien === "appartement") {
    const etage = bien.etage ?? null;
    const dernierEtage = bien.atouts?.includes("dernier_etage") ?? false;
    if (etage === 0) {
      total += -0.05; // rez-de-chaussée
    } else if (dernierEtage && bien.ascenseur === true) {
      total += 0.05; // dernier étage avec ascenseur
    } else if (etage !== null && etage >= 2 && bien.ascenseur === false) {
      total += -0.03; // étage ≥ 2 sans ascenseur
    }
  }

  // Extérieurs non cumulables : on prend le meilleur.
  const exterieurs = bien.exterieur ?? [];
  if (exterieurs.length > 0) {
    total += Math.max(...exterieurs.map((e) => EXTERIEUR[e]));
  }

  if (bien.stationnement) total += STATIONNEMENT[bien.stationnement];

  return clamp(total, -PLAFOND_AJUSTEMENT, PLAFOND_AJUSTEMENT);
}
