/**
 * Nettoyage DVF - logique pure (testée dans dvf-clean.test.ts).
 *
 * Règles (cf. starter.md, révisées en 2.0.0 après l'audit du 11/11/2026) :
 *  - nature_mutation = 'Vente' uniquement (exclut VEFA, échanges, adjudications)
 *  - type_local ∈ {Appartement, Maison} ; la présence d'un local
 *    industriel/commercial invalide la mutation
 *  - Dépendances (cave, parking…) : une seule est tolérée (son prix reste dans
 *    la valeur foncière) ; à partir de deux, la mutation est exclue car le prix
 *    des annexes fausse trop le prix au m² du logement
 *  - une mutation multi-lignes (même id_mutation) est réduite à UNE ligne si
 *    elle porte sur un seul logement. Une ligne de logement répétée sur
 *    plusieurs parcelles ou natures de culture est un doublon ; en revanche
 *    deux logements identiques (même type, surface, pièces) portant des
 *    numéros de lot différents, ou deux lignes strictement identiques sur la
 *    même parcelle, sont deux logements → mutation exclue (le prix global
 *    n'est pas attribuable à un bien)
 *  - appartement : si le lot vendu a une surface Carrez plausible (entre 0,5 et
 *    1,5 fois la surface réelle bâtie), c'est elle qui est retenue comme
 *    surface, car le prospect saisit sa surface Carrez
 *  - bornes : surface 8–500 m², valeur 5 000 € – 10 M€, prix/m² 200–25 000 €
 *  - coordonnées lat/lon obligatoires
 */

export interface DvfRawRow {
  id_mutation: string;
  date_mutation: string;
  nature_mutation: string;
  valeur_fonciere: string;
  code_postal: string;
  code_commune: string;
  nom_commune: string;
  code_departement: string;
  type_local: string;
  surface_reelle_bati: string;
  nombre_pieces_principales: string;
  longitude: string;
  latitude: string;
  /** Colonnes geo-dvf utilisées pour distinguer doublons et logements multiples. */
  numero_disposition?: string;
  id_parcelle?: string;
  numero_volume?: string;
  nature_culture?: string;
  nature_culture_speciale?: string;
  lot1_numero?: string;
  lot1_surface_carrez?: string;
  lot2_surface_carrez?: string;
  lot3_surface_carrez?: string;
  lot4_surface_carrez?: string;
  lot5_surface_carrez?: string;
}

export interface CleanMutation {
  date_mutation: string;
  valeur_fonciere: number;
  type_local: "appartement" | "maison";
  /** Surface retenue : Carrez du lot pour un appartement quand elle est plausible, sinon surface réelle bâtie. */
  surface_reelle_bati: number;
  surface_source: "carrez" | "reelle";
  nb_pieces: number | null;
  code_insee: string;
  code_departement: string;
  code_postal: string | null;
  nom_commune: string;
  lon: number;
  lat: number;
}

export type ExclusionReason =
  | "nature"
  | "local_non_habitation"
  | "aucun_logement"
  | "multi_logements"
  | "dependances"
  | "valeur"
  | "surface"
  | "prix_m2"
  | "coords";

interface HousingLocal {
  type: "appartement" | "maison";
  surface: number;
  pieces: number | null;
  /** Somme des surfaces Carrez des lots de la ligne (null si absente). */
  carrez: number | null;
}

/** Au-delà d'une dépendance, le prix des annexes fausse le prix au m². */
export const MAX_DEPENDANCES = 1;
/** Surface Carrez retenue seulement si elle reste cohérente avec la surface réelle bâtie. */
export const RATIO_CARREZ_MIN = 0.5;
export const RATIO_CARREZ_MAX = 1.5;

export interface MutationGroup {
  nature: string;
  date: string;
  valeur: number | null;
  codeInsee: string;
  codeDept: string;
  codePostal: string | null;
  nomCommune: string;
  lon: number | null;
  lat: number | null;
  /** Clés de logement (type|surface|pièces|lot) déjà vues : doublons par parcelle/nature de culture. */
  seenLocalKeys: Set<string>;
  /** Lignes strictement identiques (disposition, parcelle, volume, nature de culture, logement) déjà vues. */
  seenLineKeys: Set<string>;
  housing: HousingLocal[];
  hasNonHousingLocal: boolean;
  nbDependances: number;
}

function surfaceCarrez(row: DvfRawRow): number | null {
  let total = 0;
  for (const value of [
    row.lot1_surface_carrez,
    row.lot2_surface_carrez,
    row.lot3_surface_carrez,
    row.lot4_surface_carrez,
    row.lot5_surface_carrez,
  ]) {
    const n = toNumber(value ?? "");
    if (n !== null && n > 0) total += n;
  }
  return total > 0 ? total : null;
}

const TYPE_MAP: Record<string, "appartement" | "maison"> = {
  Appartement: "appartement",
  Maison: "maison",
};

function toNumber(value: string): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Accumule une ligne CSV dans son groupe de mutation. */
export function accumulateRow(
  groups: Map<string, MutationGroup>,
  row: DvfRawRow
): void {
  let group = groups.get(row.id_mutation);
  if (!group) {
    group = {
      nature: row.nature_mutation,
      date: row.date_mutation,
      valeur: toNumber(row.valeur_fonciere),
      codeInsee: row.code_commune,
      codeDept: row.code_departement,
      codePostal: row.code_postal || null,
      nomCommune: row.nom_commune,
      lon: null,
      lat: null,
      seenLocalKeys: new Set(),
      seenLineKeys: new Set(),
      housing: [],
      hasNonHousingLocal: false,
      nbDependances: 0,
    };
    groups.set(row.id_mutation, group);
  }

  const type = row.type_local;
  if (!type) return; // ligne de parcelle seule (nature_culture) : rien à faire

  if (type === "Dépendance") {
    // Cave/parking vendus avec le logement : comptés, tranchés dans finalizeGroup
    group.nbDependances++;
    return;
  }

  const mapped = TYPE_MAP[type];
  if (!mapped) {
    // Local industriel, commercial ou assimilé → mutation hétérogène
    group.hasNonHousingLocal = true;
    return;
  }

  // Une même ligne de local est répétée quand la mutation couvre plusieurs
  // parcelles ou natures de culture : même logement, même numéro de lot, mais
  // parcelle/nature différente → doublon ignoré. Deux lignes strictement
  // identiques (même parcelle, même nature) ou deux lots différents de mêmes
  // caractéristiques sont deux logements : on les garde tous les deux, et la
  // mutation sera exclue comme multi-logements.
  const key = `${mapped}|${row.surface_reelle_bati}|${row.nombre_pieces_principales}|${row.lot1_numero ?? ""}`;
  const lineKey = `${row.numero_disposition ?? ""}|${row.id_parcelle ?? ""}|${row.numero_volume ?? ""}|${row.nature_culture ?? ""}|${row.nature_culture_speciale ?? ""}|${key}`;
  if (group.seenLocalKeys.has(key) && !group.seenLineKeys.has(lineKey)) {
    group.seenLineKeys.add(lineKey);
    return;
  }
  group.seenLocalKeys.add(key);
  group.seenLineKeys.add(lineKey);

  group.housing.push({
    type: mapped,
    surface: toNumber(row.surface_reelle_bati) ?? 0,
    pieces: toNumber(row.nombre_pieces_principales),
    carrez: surfaceCarrez(row),
  });

  // Les coordonnées de la ligne du logement priment
  const lon = toNumber(row.longitude);
  const lat = toNumber(row.latitude);
  if (lon !== null && lat !== null && group.lon === null) {
    group.lon = lon;
    group.lat = lat;
  }
}

/** Applique les filtres qualité et produit la ligne finale (ou une exclusion). */
export function finalizeGroup(
  group: MutationGroup
): { row: CleanMutation } | { excluded: ExclusionReason } {
  if (group.nature !== "Vente") return { excluded: "nature" };
  if (group.hasNonHousingLocal) return { excluded: "local_non_habitation" };
  if (group.housing.length === 0) return { excluded: "aucun_logement" };
  if (group.housing.length > 1) return { excluded: "multi_logements" };
  if (group.nbDependances > MAX_DEPENDANCES) return { excluded: "dependances" };

  const local = group.housing[0];
  const valeur = group.valeur;

  if (valeur === null || valeur < 5_000 || valeur > 10_000_000) {
    return { excluded: "valeur" };
  }

  // Appartement : le prospect saisit une surface Carrez → on compare à la
  // surface Carrez du lot vendu quand elle existe et reste cohérente.
  let surface = local.surface;
  let surfaceSource: CleanMutation["surface_source"] = "reelle";
  if (
    local.type === "appartement" &&
    local.carrez !== null &&
    local.surface > 0 &&
    local.carrez / local.surface >= RATIO_CARREZ_MIN &&
    local.carrez / local.surface <= RATIO_CARREZ_MAX
  ) {
    surface = local.carrez;
    surfaceSource = "carrez";
  }

  if (surface < 8 || surface > 500) {
    return { excluded: "surface" };
  }
  const prixM2 = valeur / surface;
  if (prixM2 < 200 || prixM2 > 25_000) {
    return { excluded: "prix_m2" };
  }
  if (group.lon === null || group.lat === null) {
    return { excluded: "coords" };
  }

  return {
    row: {
      date_mutation: group.date,
      valeur_fonciere: valeur,
      type_local: local.type,
      surface_reelle_bati: surface,
      surface_source: surfaceSource,
      nb_pieces: local.pieces,
      code_insee: group.codeInsee,
      code_departement: group.codeDept,
      code_postal: group.codePostal,
      nom_commune: group.nomCommune,
      lon: group.lon,
      lat: group.lat,
    },
  };
}
