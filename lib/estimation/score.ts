/**
 * Score du lead (0-100) — cf. starter.md :
 *   horizon : en_vente 40 / <3 mois 35 / 3-6 mois 20 / curiosité 5
 *   projet : vente 20 / location 10
 *   téléphone valide : 20
 *   DPE renseigné : 10
 *   atouts renseignés : 10
 */
import type { Atout, Dpe, Horizon, Projet } from "./types";

const SCORE_HORIZON: Record<Horizon, number> = {
  en_vente: 40,
  moins_3_mois: 35,
  "3_6_mois": 20,
  curiosite: 5,
};

export function calculerScoreLead(params: {
  projet: Projet;
  horizon?: Horizon | null;
  telephoneValide: boolean;
  dpe?: Dpe | null;
  atouts?: Atout[] | null;
}): number {
  let score = 0;

  if (params.horizon) score += SCORE_HORIZON[params.horizon];
  score += params.projet === "vente" ? 20 : 10;
  if (params.telephoneValide) score += 20;
  if (params.dpe && params.dpe !== "ne_sait_pas") score += 10;
  if (params.atouts && params.atouts.length > 0) score += 10;

  return Math.min(100, score);
}
