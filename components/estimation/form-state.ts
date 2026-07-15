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
import type { QuartierStats } from "./quartier-block";

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
  etagesImmeuble: string;
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
  /** Stats de quartier chargées à l'étape 1, réutilisées à l'écran résultat. */
  quartierStats: QuartierStats | null;
}

export const initialFormState: EstimationFormState = {
  projet: null,
  horizon: null,
  typeBien: null,
  adresse: null,
  surface: "",
  pieces: "3",
  chambres: "2",
  etage: "",
  etagesImmeuble: "",
  // Un interrupteur affiché "off" est une réponse : non. Jamais null,
  // sinon la validation bloque sans que l'utilisateur comprenne pourquoi.
  ascenseur: false,
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
  quartierStats: null,
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
