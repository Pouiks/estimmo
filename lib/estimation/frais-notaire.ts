/**
 * Frais de notaire (frais d'acquisition) dans l'ancien - fonctions pures.
 *
 * Affichés à titre INDICATIF sous l'estimation de vente : ils sont à la charge
 * de l'acquéreur et ne font pas partie du prix estimé (la valeur foncière DVF
 * est le prix de l'acte, hors frais d'acquisition). On affiche une fourchette
 * qui couvre les cas courants plutôt qu'un montant précis :
 *  - droits de mutation : taxe départementale 4,5 % (3,8 % dans de rares
 *    départements, 5 % dans ceux qui ont voté la hausse temporaire ouverte par
 *    la loi de finances 2025) + 2,37 % de frais d'assiette sur cette taxe
 *    + taxe communale 1,2 % (CGI art. 1594 D, 1595 bis, 1647 V) ;
 *  - émoluments du notaire : barème proportionnel par tranches (arrêté du
 *    28 février 2020, remise de 20 % possible au-delà de 100 000 € non
 *    comptée), TVA 20 % ;
 *  - contribution de sécurité immobilière : 0,10 % ;
 *  - débours et formalités : de l'ordre de 800 à 1 400 € selon le dossier.
 * Le montant exact dépend du prix définitif, du département, du mobilier
 * éventuel et du dossier : seul le notaire peut l'établir.
 */

/** Taux départemental bas (4,5 %) et haut (5 %) des droits de mutation. */
export const TAUX_DEPARTEMENTAL = { bas: 0.045, haut: 0.05 } as const;
const FRAIS_ASSIETTE = 0.0237; // sur la taxe départementale
const TAXE_COMMUNALE = 0.012;
const CONTRIBUTION_SECURITE_IMMOBILIERE = 0.001;
const TVA = 0.2;
/** Débours et émoluments de formalités : fourchette courante. */
export const DEBOURS = { bas: 800, haut: 1400 } as const;

/** Barème des émoluments proportionnels HT (tranches cumulatives). */
export const TRANCHES_EMOLUMENTS: ReadonlyArray<{ jusqua: number; taux: number }> = [
  { jusqua: 6_500, taux: 0.0387 },
  { jusqua: 17_000, taux: 0.01596 },
  { jusqua: 60_000, taux: 0.01064 },
  { jusqua: Number.POSITIVE_INFINITY, taux: 0.00799 },
];

/** Émoluments proportionnels TTC pour un prix donné. */
export function emolumentsNotaire(prix: number): number {
  let ht = 0;
  let plancher = 0;
  for (const tranche of TRANCHES_EMOLUMENTS) {
    if (prix <= plancher) break;
    const assiette = Math.min(prix, tranche.jusqua) - plancher;
    ht += assiette * tranche.taux;
    plancher = tranche.jusqua;
  }
  return ht * (1 + TVA);
}

/** Droits de mutation (taxe départementale + frais d'assiette + taxe communale). */
export function droitsMutation(prix: number, tauxDepartemental: number): number {
  return prix * (tauxDepartemental * (1 + FRAIS_ASSIETTE) + TAXE_COMMUNALE);
}

/** Total des frais d'acquisition pour un prix, un taux départemental et un niveau de débours. */
export function fraisNotaire(
  prix: number,
  tauxDepartemental: number,
  debours: number
): number {
  if (!Number.isFinite(prix) || prix <= 0) return 0;
  return (
    droitsMutation(prix, tauxDepartemental) +
    emolumentsNotaire(prix) +
    prix * CONTRIBUTION_SECURITE_IMMOBILIERE +
    debours
  );
}

export interface FourchetteFraisNotaire {
  /** Frais sur la fourchette basse, taux départemental 4,5 %, débours bas - arrondi à la centaine inférieure. */
  bas: number;
  /** Frais sur la fourchette haute, taux départemental 5 %, débours haut - arrondi à la centaine supérieure. */
  haut: number;
  /** Part des frais dans le prix, en % (bas / fourchette basse et haut / fourchette haute). */
  pctBas: number;
  pctHaut: number;
}

/**
 * Fourchette couvrante des frais de notaire pour une estimation de vente :
 * du cas le plus favorable (prix bas, 4,5 %, débours bas) au moins favorable
 * (prix haut, 5 %, débours haut).
 */
export function fourchetteFraisNotaire(
  fourchetteBasse: number,
  fourchetteHaute: number
): FourchetteFraisNotaire | null {
  if (!(fourchetteBasse > 0) || !(fourchetteHaute >= fourchetteBasse)) return null;
  const brutBas = fraisNotaire(fourchetteBasse, TAUX_DEPARTEMENTAL.bas, DEBOURS.bas);
  const brutHaut = fraisNotaire(fourchetteHaute, TAUX_DEPARTEMENTAL.haut, DEBOURS.haut);
  const bas = Math.floor(brutBas / 100) * 100;
  const haut = Math.ceil(brutHaut / 100) * 100;
  return {
    bas,
    haut,
    pctBas: Math.round((bas / fourchetteBasse) * 1000) / 10,
    pctHaut: Math.round((haut / fourchetteHaute) * 1000) / 10,
  };
}
