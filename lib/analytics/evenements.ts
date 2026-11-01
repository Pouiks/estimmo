/**
 * Vocabulaire du suivi du formulaire d'estimation, partagé entre le
 * navigateur (components/estimation), l'API /api/track et l'admin.
 *
 * Confidentialité : aucune donnée personnelle ne transite. Pour un champ
 * texte (adresse, surface, email…) on enregistre seulement qu'il a été touché
 * ou renseigné ; la valeur n'est transmise que pour les champs à choix.
 */
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/routing";

export const EVENEMENTS = [
  "view",
  "complete",
  "submit",
  "focus",
  "saisie",
  "erreur",
  "retour",
  "erreur_api",
  "recommencer",
  "sortie",
] as const;
export type Evenement = (typeof EVENEMENTS)[number];

export const APPAREILS = ["mobile", "tablette", "ordinateur"] as const;
export type Appareil = (typeof APPAREILS)[number];

/** Étapes du tunnel ; 5 = écran résultat. */
export type Etape = 1 | 2 | 3 | 4 | 5;
export const ETAPES_FORMULAIRE = [1, 2, 3, 4] as const;

/**
 * Nature d'un champ, qui décide de ce qui est enregistré :
 * - texte : « renseigné » une seule fois, jamais la valeur ;
 * - choix : chaque changement, avec la valeur (énumération) ;
 * - multi : chaque changement, valeurs triées jointes par « , » (« aucun » si vide) ;
 * - bool : chaque changement, « oui » / « non ».
 */
export type TypeChamp = "texte" | "choix" | "multi" | "bool";

export interface DefinitionChamp {
  etape: 1 | 2 | 3 | 4;
  type: TypeChamp;
}

/** Champs suivis, dans l'ordre d'affichage du formulaire. */
export const CHAMPS = {
  adresse: { etape: 1, type: "texte" },
  projet: { etape: 1, type: "choix" },
  horizon: { etape: 1, type: "choix" },
  typeBien: { etape: 1, type: "choix" },
  surface: { etape: 2, type: "texte" },
  pieces: { etape: 2, type: "texte" },
  chambres: { etape: 2, type: "texte" },
  etage: { etape: 2, type: "texte" },
  etagesImmeuble: { etape: 2, type: "texte" },
  ascenseur: { etape: 2, type: "bool" },
  etatGeneral: { etape: 3, type: "choix" },
  ageCuisine: { etape: 3, type: "choix" },
  ageSdb: { etape: 3, type: "choix" },
  dpe: { etape: 3, type: "choix" },
  exterieur: { etape: 3, type: "multi" },
  stationnement: { etape: 3, type: "choix" },
  atouts: { etape: 3, type: "multi" },
  prenom: { etape: 4, type: "texte" },
  nom: { etape: 4, type: "texte" },
  email: { etape: 4, type: "texte" },
  telephone: { etape: 4, type: "texte" },
  consentement: { etape: 4, type: "bool" },
} as const satisfies Record<string, DefinitionChamp>;

export type Champ = keyof typeof CHAMPS;
export const NOMS_CHAMPS = Object.keys(CHAMPS) as [Champ, ...Champ[]];

export function estChamp(valeur: unknown): valeur is Champ {
  return typeof valeur === "string" && valeur in CHAMPS;
}

/** Champs d'une étape, dans l'ordre du formulaire. */
export function champsDeEtape(etape: number): Champ[] {
  return NOMS_CHAMPS.filter((c) => CHAMPS[c].etape === etape);
}

/** Valeur stockée pour un champ multiple vide. */
export const VALEUR_AUCUN = "aucun";

/** Nombre maximal d'événements par requête vers /api/track. */
export const TAILLE_MAX_LOT = 50;

export const evenementSchema = z
  .object({
    etape: z.number().int().min(1).max(5),
    event: z.enum(EVENEMENTS),
    champ: z.enum(NOMS_CHAMPS).optional(),
    valeur: z.string().max(80).optional(),
    /** Millisecondes écoulées depuis l'ouverture du formulaire. */
    t: z.number().int().min(0).max(2_000_000_000),
  })
  // Défense en profondeur : une valeur n'est jamais acceptée pour un champ
  // texte (adresse, email, téléphone…), même si un client la transmettait.
  .refine(
    (e) => !(e.champ && CHAMPS[e.champ].type === "texte" && e.valeur !== undefined),
    { message: "valeur interdite pour un champ texte", path: ["valeur"] }
  );
export type EvenementSuivi = z.infer<typeof evenementSchema>;

export const lotEvenementsSchema = z.object({
  sessionId: z.uuid(),
  locale: z.enum(LOCALES).optional(),
  appareil: z.enum(APPAREILS).optional(),
  page: z.string().max(120).optional(),
  evenements: z.array(evenementSchema).min(1).max(TAILLE_MAX_LOT),
});
export type LotEvenements = z.infer<typeof lotEvenementsSchema>;

/**
 * Ancien format (un événement par requête, sans champ ni durée), encore
 * émis par les pages servies avant le déploiement : accepté tel quel.
 */
const evenementLegacySchema = z.object({
  sessionId: z.uuid(),
  step: z.number().int().min(1).max(4),
  event: z.enum(["view", "complete", "submit"]),
});

/** Valide un corps de requête /api/track ; null si invalide. */
export function normaliserLot(body: unknown): LotEvenements | null {
  const lot = lotEvenementsSchema.safeParse(body);
  if (lot.success) return lot.data;
  const legacy = evenementLegacySchema.safeParse(body);
  if (!legacy.success) return null;
  return {
    sessionId: legacy.data.sessionId,
    evenements: [{ etape: legacy.data.step, event: legacy.data.event, t: 0 }],
  };
}

/** Classe l'appareil d'après la largeur de la fenêtre (points de rupture Tailwind). */
export function classerAppareil(largeurPx: number): Appareil {
  if (largeurPx < 768) return "mobile";
  if (largeurPx < 1024) return "tablette";
  return "ordinateur";
}
