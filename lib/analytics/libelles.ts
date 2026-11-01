/**
 * Libellés français de l'admin Analytics. Les valeurs reprennent les textes
 * du site (messages/fr) pour que l'admin parle comme le formulaire.
 */
import estimationFr from "@/messages/fr/estimation.json";
import labelsFr from "@/messages/fr/labels.json";
import { VALEUR_AUCUN, type Champ, type Etape } from "./evenements";

export const LIBELLES_ETAPES: Record<Etape, string> = {
  1: estimationFr.etapes.projet,
  2: estimationFr.etapes.bien,
  3: estimationFr.etapes.etat,
  4: estimationFr.etapes.contact,
  5: estimationFr.resultat,
};

export const LIBELLES_CHAMPS: Record<Champ, string> = {
  adresse: "Adresse du bien",
  projet: "Vendre / louer",
  horizon: "Horizon de vente",
  typeBien: "Type de bien",
  surface: "Surface",
  pieces: "Pièces",
  chambres: "Chambres",
  etage: "Étage",
  etagesImmeuble: "Étages de l'immeuble",
  ascenseur: "Ascenseur",
  etatGeneral: "État général",
  ageCuisine: "Âge de la cuisine",
  ageSdb: "Âge de la salle de bain",
  dpe: "Classe énergie (DPE)",
  exterieur: "Extérieur",
  stationnement: "Stationnement",
  atouts: "Atouts",
  prenom: "Prénom",
  nom: "Nom",
  email: "Email",
  telephone: "Téléphone",
  consentement: "Consentement",
};

const GROUPES_VALEURS: Partial<Record<Champ, Record<string, string>>> = {
  projet: labelsFr.projet,
  horizon: labelsFr.horizon,
  typeBien: labelsFr.typeBien,
  etatGeneral: labelsFr.etatGeneral,
  ageCuisine: labelsFr.age,
  ageSdb: labelsFr.age,
  exterieur: labelsFr.exterieur,
  stationnement: labelsFr.stationnement,
  atouts: labelsFr.atouts,
  dpe: labelsFr.dpe,
};

/** Libellé d'une valeur enregistrée (« ne_sait_pas » → « Je ne sais pas »). */
export function libelleValeur(champ: Champ, valeur: string): string {
  if (valeur === VALEUR_AUCUN) return "Aucun";
  if (valeur === "oui") return "Oui";
  if (valeur === "non") return "Non";
  return GROUPES_VALEURS[champ]?.[valeur] ?? valeur;
}

export const LIBELLES_APPAREILS: Record<string, string> = {
  mobile: "Mobile",
  tablette: "Tablette",
  ordinateur: "Ordinateur",
  inconnu: "Inconnu",
};

export const LIBELLES_LANGUES: Record<string, string> = {
  fr: "Français",
  en: "Anglais",
  inconnu: "Inconnue",
};
