import type {
  AgeTranche,
  AnneeConstruction,
  Atout,
  Dpe,
  EtatGeneral,
  Exterieur,
  Horizon,
  Projet,
  Stationnement,
  TypeBien,
} from "@/lib/estimation/types";
import type { Adresse } from "@/lib/leads/schema";

/**
 * État du formulaire 4 étapes. Les champs numériques sont saisis en texte
 * (inputs contrôlés) puis convertis à la validation de chaque étape.
 */
export interface EstimationFormState {
  // Étape 1
  projet: Projet | null;
  horizon: Horizon | null;
  typeBien: TypeBien | null;
  adresse: Adresse | null;
  // Étape 2
  surface: string;
  pieces: string;
  chambres: string;
  etage: string;
  ascenseur: boolean | null;
  surfaceTerrain: string;
  anneeConstruction: AnneeConstruction | null;
  exterieur: Exterieur[];
  stationnement: Stationnement | null;
  // Étape 3
  etatGeneral: EtatGeneral | null;
  ageCuisine: AgeTranche | null;
  ageSdb: AgeTranche | null;
  dpe: Dpe | null;
  atouts: Atout[];
  // Étape 4
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  consentement: boolean;
}

export const initialFormState: EstimationFormState = {
  projet: null,
  horizon: null,
  typeBien: null,
  adresse: null,
  surface: "",
  pieces: "",
  chambres: "",
  etage: "",
  ascenseur: null,
  surfaceTerrain: "",
  anneeConstruction: null,
  exterieur: [],
  stationnement: null,
  etatGeneral: null,
  ageCuisine: null,
  ageSdb: null,
  dpe: null,
  atouts: [],
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  consentement: false,
};

export type FieldErrors = Record<string, string>;

export interface StepProps {
  state: EstimationFormState;
  setField: <K extends keyof EstimationFormState>(
    key: K,
    value: EstimationFormState[K]
  ) => void;
  errors: FieldErrors;
}

/** "" → undefined ; "62" → 62 (pour la validation Zod). */
export function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}
