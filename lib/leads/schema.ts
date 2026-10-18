/**
 * Schémas Zod du parcours d'estimation - partagés entre le formulaire
 * (validation par étape) et l'API /api/leads (revalidation serveur complète).
 *
 * Les messages sont des CLÉS de traduction (namespace `validation`,
 * fichiers messages/<locale>/validation.json), traduites à l'affichage par
 * `traduireIssues` (lib/leads/erreurs.ts). Les règles sans message passent
 * par l'error map `cleGenerique`.
 */
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/routing";

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
  libelle: z.string().min(3, "validation.adresse.liste"),
  codeInsee: z.string().regex(CODE_INSEE_REGEX, "validation.adresse.invalide"),
  codePostal: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/** Langue de l'interface au moment de la demande (emails, suivi). */
export const localeSchema = z.enum(LOCALES).default("fr");

// ---------------------------------------------------------------------------
// Étape 1 - Votre projet
// ---------------------------------------------------------------------------
export const etape1Schema = z
  .object({
    projet: z.enum(["vente", "location"], "validation.projet"),
    horizon: z
      .enum(["en_vente", "moins_3_mois", "3_6_mois", "curiosite"])
      .nullish(),
    typeBien: z.enum(["appartement", "maison"], "validation.typeBien"),
    adresse: adresseSchema,
  })
  .superRefine((data, ctx) => {
    if (data.projet === "vente" && !data.horizon) {
      ctx.addIssue({
        code: "custom",
        path: ["horizon"],
        message: "validation.horizon",
      });
    }
  });

// ---------------------------------------------------------------------------
// Étape 2 - Votre bien
// ---------------------------------------------------------------------------
export const etape2Base = z.object({
  surface: z
    .number("validation.surface.requis")
    .min(8, "validation.surface.min")
    .max(800, "validation.surface.max"),
  pieces: z
    .number("validation.pieces.requis")
    .int()
    .min(1, "validation.pieces.min")
    .max(20, "validation.pieces.max"),
  chambres: z
    .number("validation.chambres.requis")
    .int()
    .min(0)
    .max(15, "validation.chambres.max"),
  etage: z
    .number()
    .int()
    .min(0, "validation.etage.min")
    .max(50, "validation.etage.max")
    .nullish(),
  etagesImmeuble: z
    .number()
    .int()
    .min(1, "validation.etagesImmeuble.min")
    .max(60, "validation.etagesImmeuble.max")
    .nullish(),
  ascenseur: z.boolean().nullish(),
  surfaceTerrain: z
    .number()
    .min(0)
    .max(1_000_000, "validation.surfaceTerrain")
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
        ctx.addIssue({
          code: "custom",
          path: ["etage"],
          message: "validation.etage.requis",
        });
      }
      if (data.etagesImmeuble === null || data.etagesImmeuble === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["etagesImmeuble"],
          message: "validation.etagesImmeuble.requis",
        });
      } else if (
        data.etage !== null &&
        data.etage !== undefined &&
        data.etagesImmeuble < data.etage
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["etagesImmeuble"],
          message: "validation.etagesImmeuble.incoherent",
        });
      }
      if (data.ascenseur === null || data.ascenseur === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["ascenseur"],
          message: "validation.ascenseur",
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Étape 3 - État & atouts
// (extérieur et stationnement sont posés à cette étape depuis le reskin)
// ---------------------------------------------------------------------------
export const etape3Schema = z.object({
  etatGeneral: z.enum(
    ["a_renover", "a_rafraichir", "bon", "refait_neuf"],
    "validation.etatGeneral"
  ),
  exterieur: z.array(z.enum(["balcon", "terrasse", "jardin"])).default([]),
  stationnement: z.enum(
    ["aucun", "place", "garage_box"],
    "validation.stationnement"
  ),
  ageCuisine: z.enum(
    ["moins_5", "5_10", "10_20", "plus_20"],
    "validation.ageCuisine"
  ),
  ageSdb: z.enum(["moins_5", "5_10", "10_20", "plus_20"], "validation.ageSdb"),
  dpe: z.enum(
    ["A", "B", "C", "D", "E", "F", "G", "ne_sait_pas"],
    "validation.dpe"
  ),
  atouts: z
    .array(
      z.enum(["vue_degagee", "lumineux", "calme", "dernier_etage", "traversant"])
    )
    .default([]),
});

// ---------------------------------------------------------------------------
// Étape 4 - Vos coordonnées
// ---------------------------------------------------------------------------
export const etape4Schema = z.object({
  prenom: z.string().trim().min(1, "validation.prenom"),
  nom: z.string().trim().min(1, "validation.nom"),
  email: z.email("validation.email"),
  // Conseillère en France : seuls les numéros français sont rappelés.
  telephone: z.string().trim().regex(TELEPHONE_FR_REGEX, "validation.telephone"),
  consentement: z.literal(true, { error: "validation.consentement" }),
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
    locale: localeSchema,
    sessionId: z.uuid().optional(),
    utm: z.record(z.string(), z.string()).optional(),
    /** Pot de miel anti-robots : doit rester vide (champ caché du formulaire). */
    website: z.string().max(200).optional(),
  })
  .extend(etape2Base.shape)
  .extend(etape3Schema.shape)
  .extend(etape4Schema.shape)
  .superRefine((data, ctx) => {
    if (data.projet === "vente" && !data.horizon) {
      ctx.addIssue({ code: "custom", path: ["horizon"], message: "validation.horizon" });
    }
    if (data.typeBien === "appartement") {
      if (data.etage === null || data.etage === undefined) {
        ctx.addIssue({ code: "custom", path: ["etage"], message: "validation.etage.requis" });
      }
      if (data.ascenseur === null || data.ascenseur === undefined) {
        ctx.addIssue({ code: "custom", path: ["ascenseur"], message: "validation.ascenseur" });
      }
    }
  });

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type Adresse = z.infer<typeof adresseSchema>;
