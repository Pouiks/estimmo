/**
 * Nettoyage DVF — logique pure (testée dans dvf-clean.test.ts).
 *
 * Règles (cf. starter.md) :
 *  - nature_mutation = 'Vente' uniquement (exclut VEFA, échanges, adjudications)
 *  - type_local ∈ {Appartement, Maison} ; les Dépendances (cave, parking…)
 *    vendues avec le logement sont ignorées sans invalider la mutation ;
 *    la présence d'un local industriel/commercial invalide la mutation
 *  - une mutation multi-lignes (même id_mutation) est réduite à UNE ligne si
 *    elle porte sur un seul logement ; les mutations portant sur plusieurs
 *    logements sont exclues (le prix global n'est pas attribuable à un bien)
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
}

export interface CleanMutation {
  date_mutation: string;
  valeur_fonciere: number;
  type_local: "appartement" | "maison";
  surface_reelle_bati: number;
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
  | "valeur"
  | "surface"
  | "prix_m2"
  | "coords";

interface HousingLocal {
  type: "appartement" | "maison";
  surface: number;
  pieces: number | null;
}

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
  seenLocalKeys: Set<string>;
  housing: HousingLocal[];
  hasNonHousingLocal: boolean;
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
      housing: [],
      hasNonHousingLocal: false,
    };
    groups.set(row.id_mutation, group);
  }

  const type = row.type_local;
  if (!type) return; // ligne de parcelle seule (nature_culture) : rien à faire

  if (type === "Dépendance") return; // cave/parking vendus avec : ignorés

  const mapped = TYPE_MAP[type];
  if (!mapped) {
    // Local industriel, commercial ou assimilé → mutation hétérogène
    group.hasNonHousingLocal = true;
    return;
  }

  // Une même ligne de local peut être répétée (une par parcelle/lot) :
  // on dédoublonne par (type, surface, pièces).
  const key = `${mapped}|${row.surface_reelle_bati}|${row.nombre_pieces_principales}`;
  if (group.seenLocalKeys.has(key)) return;
  group.seenLocalKeys.add(key);

  group.housing.push({
    type: mapped,
    surface: toNumber(row.surface_reelle_bati) ?? 0,
    pieces: toNumber(row.nombre_pieces_principales),
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

  const local = group.housing[0];
  const valeur = group.valeur;

  if (valeur === null || valeur < 5_000 || valeur > 10_000_000) {
    return { excluded: "valeur" };
  }
  if (local.surface < 8 || local.surface > 500) {
    return { excluded: "surface" };
  }
  const prixM2 = valeur / local.surface;
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
      surface_reelle_bati: local.surface,
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
