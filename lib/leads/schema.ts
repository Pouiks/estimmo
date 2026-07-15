/**
 * Schémas Zod du parcours d'estimation — partagés entre le formulaire
 * (validation par étape) et l'API /api/leads (revalidation serveur complète).
 */
import { z } from "zod";

export const TELEPHONE_FR_REGEX =
  /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

/** "+33 6 12 34 56 78" → "0612345678" */
export function normaliserTelephone(brut: string): string {
  const compact = brut.replace(/[\s.-]/g, "");
  if (compact.startsWith("+33")) return `0${compact.slice(3)}`;
  if (compact.startsWith("0033")) return `0${compact.slice(4)}`;
  return compact;
}

const CODE_INSEE_REGEX = /^(\d{5}|2[AB]\d{3})$/i;

export const adresseSchema = z.object({
  libelle: z.string().min(3, "Sélectionnez une adresse dans la liste"),
  codeInsee: z
    .string()
    .regex(CODE_INSEE_REGEX, "Adresse invalide — sélectionnez-la dans la liste"),
  codePostal: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

// ---------------------------------------------------------------------------
// Étape 1 — Votre projet
// ---------------------------------------------------------------------------
export const etape1Schema = z
  .object({
    projet: z.enum(["vente", "location"], "Choisissez votre projet"),
    horizon: z
      .enum(["en_vente", "moins_3_mois", "3_6_mois", "curiosite"])
      .nullish(),
    typeBien: z.enum(["appartement", "maison"], "Choisissez le type de bien"),
    adresse: adresseSchema,
  })
  .superRefine((data, ctx) => {
    if (data.projet === "vente" && !data.horizon) {
      ctx.addIssue({
        code: "custom",
        path: ["horizon"],
        message: "Précisez votre horizon de vente",
      });
    }
  });

// ---------------------------------------------------------------------------
// Étape 2 — Votre bien
// ---------------------------------------------------------------------------
export const etape2Base = z.object({
  surface: z
    .number("Indiquez la surface")
    .min(8, "Surface minimale : 8 m²")
    .max(800, "Surface maximale : 800 m²"),
  pieces: z
    .number("Indiquez le nombre de pièces")
    .int()
    .min(1, "Au moins 1 pièce")
    .max(20, "20 pièces maximum"),
  chambres: z
    .number("Indiquez le nombre de chambres")
    .int()
    .min(0)
    .max(15, "15 chambres maximum"),
  etage: z.number().int().min(0, "L'étage ne peut être négatif").max(50).nullish(),
  etagesImmeuble: z
    .number()
    .int()
    .min(1, "Au moins 1 étage")
    .max(60, "60 étages maximum")
    .nullish(),
  ascenseur: z.boolean().nullish(),
  surfaceTerrain: z
    .number()
    .min(0)
    .max(1_000_000, "Surface de terrain invalide")
    .nullish(),
  // Retiré du formulaire (design concis) mais conservé en base : optionnel.
  anneeConstruction: z
    .enum(["avant_1950", "1950_1975", "1975_2000", "2000_2012", "apres_2012"])
    .nullish(),
});

export function etape2Schema(typeBien: "appartement" | "maison") {
  return etape2Base.superRefine((data, ctx) => {
    if (typeBien === "appartement") {
      if (data.etage === null || data.etage === undefined) {
        ctx.addIssue({ code: "custom", path: ["etage"], message: "Indiquez l'étage" });
      }
      if (data.etagesImmeuble === null || data.etagesImmeuble === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["etagesImmeuble"],
          message: "Indiquez le nombre d'étages de l'immeuble",
        });
      } else if (
        data.etage !== null &&
        data.etage !== undefined &&
        data.etagesImmeuble < data.etage
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["etagesImmeuble"],
          message: "L'immeuble compte moins d'étages que le vôtre ?",
        });
      }
      if (data.ascenseur === null || data.ascenseur === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["ascenseur"],
          message: "Ascenseur : oui ou non ?",
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Étape 3 — État & atouts
// (extérieur et stationnement sont posés à cette étape depuis le reskin)
// ---------------------------------------------------------------------------
export const etape3Schema = z.object({
  etatGeneral: z.enum(
    ["a_renover", "a_rafraichir", "bon", "refait_neuf"],
    "Indiquez l'état général"
  ),
  exterieur: z.array(z.enum(["balcon", "terrasse", "jardin"])).default([]),
  stationnement: z.enum(
    ["aucun", "place", "garage_box"],
    "Indiquez le stationnement"
  ),
  ageCuisine: z.enum(
    ["moins_5", "5_10", "10_20", "plus_20"],
    "Indiquez l'âge de la cuisine"
  ),
  ageSdb: z.enum(
    ["moins_5", "5_10", "10_20", "plus_20"],
    "Indiquez l'âge de la salle de bain"
  ),
  dpe: z.enum(
    ["A", "B", "C", "D", "E", "F", "G", "ne_sait_pas"],
    "Indiquez le DPE (ou « Je ne sais pas »)"
  ),
  atouts: z
    .array(
      z.enum(["vue_degagee", "lumineux", "calme", "dernier_etage", "traversant"])
    )
    .default([]),
});

// ---------------------------------------------------------------------------
// Étape 4 — Vos coordonnées
// ---------------------------------------------------------------------------
export const etape4Schema = z.object({
  prenom: z.string().trim().min(1, "Votre prénom"),
  nom: z.string().trim().min(1, "Votre nom"),
  email: z.email("Email invalide"),
  telephone: z
    .string()
    .trim()
    .regex(TELEPHONE_FR_REGEX, "Numéro de téléphone français invalide"),
  consentement: z.literal(true, {
    error: "Votre consentement est nécessaire pour recevoir l'estimation",
  }),
});

// ---------------------------------------------------------------------------
// Payload complet envoyé à POST /api/leads (revalidé côté serveur)
// ---------------------------------------------------------------------------
export const leadPayloadSchema = z
  .object({
    projet: z.enum(["vente", "location"]),
    horizon: z.enum(["en_vente", "moins_3_mois", "3_6_mois", "curiosite"]).nullish(),
    typeBien: z.enum(["appartement", "maison"]),
    adresse: adresseSchema,
    sessionId: z.uuid().optional(),
    utm: z.record(z.string(), z.string()).optional(),
  })
  .extend(etape2Base.shape)
  .extend(etape3Schema.shape)
  .extend(etape4Schema.shape)
  .superRefine((data, ctx) => {
    if (data.projet === "vente" && !data.horizon) {
      ctx.addIssue({ code: "custom", path: ["horizon"], message: "Horizon requis" });
    }
    if (data.typeBien === "appartement") {
      if (data.etage === null || data.etage === undefined) {
        ctx.addIssue({ code: "custom", path: ["etage"], message: "Étage requis" });
      }
      if (data.ascenseur === null || data.ascenseur === undefined) {
        ctx.addIssue({ code: "custom", path: ["ascenseur"], message: "Ascenseur requis" });
      }
    }
  });

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type Adresse = z.infer<typeof adresseSchema>;
