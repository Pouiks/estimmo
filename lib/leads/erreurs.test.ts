import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import en from "@/messages/en";
import fr from "@/messages/fr";
import { traduireCle } from "@/lib/i18n/traduire-cle";
import { AVEC_CLES, cleGenerique, traduireIssues } from "./erreurs";
import {
  etape1Schema,
  etape2Schema,
  etape3Schema,
  etape4Schema,
  leadPayloadSchema,
} from "./schema";

type Arbre = { [cle: string]: string | Arbre };
function clesDe(arbre: Arbre, prefixe = ""): string[] {
  return Object.entries(arbre).flatMap(([cle, valeur]) => {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    return typeof valeur === "string" ? [chemin] : clesDe(valeur, chemin);
  });
}

const tFr = createTranslator({ locale: "fr", messages: fr });
const tEn = createTranslator({ locale: "en", messages: en });

describe("cleGenerique (règles Zod sans message explicite)", () => {
  it("remplace les messages anglais par défaut de Zod par des clés", () => {
    const schema = z.object({
      entier: z.number().int(),
      petit: z.number().min(0),
      grand: z.number().max(50),
      choix: z.enum(["a", "b"]),
      requis: z.string(),
    });
    const res = schema.safeParse(
      { entier: 2.5, petit: -1, grand: 60, choix: "zzz" },
      AVEC_CLES
    );
    expect(res.success).toBe(false);
    const messages = Object.fromEntries(
      res.error!.issues.map((i) => [i.path.join("."), i.message])
    );
    expect(messages.entier).toBe("validation.generique.type");
    expect(messages.petit).toBe("validation.generique.tropPetit");
    expect(messages.grand).toBe("validation.generique.tropGrand");
    expect(messages.choix).toBe("validation.generique.choix");
    expect(messages.requis).toBe("validation.generique.requis");
  });

  it("ne remplace pas un message explicite du schéma", () => {
    const res = z
      .object({ surface: z.number().min(8, "validation.surface.min") })
      .safeParse({ surface: 3 }, AVEC_CLES);
    expect(res.error!.issues[0].message).toBe("validation.surface.min");
  });

  it("renvoie une clé générique pour tout autre code", () => {
    expect(
      cleGenerique({ code: "custom", input: 1, path: [] } as never)
    ).toBe("validation.generique.invalide");
  });
});

describe("traduireIssues", () => {
  it("regroupe par champ, garde la première erreur et traduit", () => {
    const erreurs = traduireIssues(
      [
        { path: ["adresse", "libelle"], message: "validation.adresse.liste" },
        { path: ["surface"], message: "validation.surface.min" },
        { path: ["surface"], message: "validation.surface.max" },
        { path: [], message: "validation.formulaireInvalide" },
      ],
      (cle) => traduireCle(tFr, cle)
    );
    expect(erreurs).toEqual({
      "adresse.libelle": "Sélectionnez une adresse dans la liste",
      surface: "Surface minimale : 8 m²",
      form: "Formulaire invalide",
    });
  });

  it("traduit en anglais avec le même code", () => {
    const erreurs = traduireIssues(
      [{ path: ["telephone"], message: "validation.telephone" }],
      (cle) => traduireCle(tEn, cle)
    );
    expect(erreurs.telephone).toBe(
      "Invalid French phone number (e.g. 06 12 34 56 78)"
    );
  });

  it("laisse passer une clé inconnue telle quelle (jamais de crash)", () => {
    const erreurs = traduireIssues(
      [{ path: ["x"], message: "validation.inconnue" }],
      (cle) => traduireCle(tFr, cle)
    );
    expect(erreurs.x).toBe("validation.inconnue");
  });
});

describe("clés utilisées par les schémas", () => {
  /** Toutes les clés validation.* possibles dans les messages FR. */
  const clesConnues = new Set(clesDe(fr.validation as Arbre, "validation"));

  function clesDuSchema(schema: z.ZodType, entree: unknown): string[] {
    const res = schema.safeParse(entree, AVEC_CLES);
    return res.success ? [] : res.error.issues.map((i) => i.message);
  }

  it("chaque message des schémas existe dans validation.json", () => {
    const vide = {};
    const messages = [
      ...clesDuSchema(etape1Schema, { projet: "vente", adresse: {} }),
      ...clesDuSchema(etape2Schema("appartement"), { surface: 3, pieces: 0, chambres: 99 }),
      ...clesDuSchema(etape2Schema("appartement"), { surface: 900, pieces: 25, etage: -1, etagesImmeuble: 0 }),
      ...clesDuSchema(etape2Schema("appartement"), { surface: 50, pieces: 2, chambres: 1, etage: 5, etagesImmeuble: 2 }),
      ...clesDuSchema(etape3Schema, vide),
      ...clesDuSchema(etape4Schema, { prenom: " ", nom: "", email: "x", telephone: "123", consentement: false }),
      ...clesDuSchema(leadPayloadSchema, { projet: "vente", typeBien: "appartement", adresse: { libelle: "a", codeInsee: "x", lat: 0, lon: 0 } }),
    ];
    expect(messages.length).toBeGreaterThan(15);
    for (const message of messages) {
      expect(clesConnues.has(message), message).toBe(true);
    }
  });

  it("le payload accepte la locale et retombe sur fr par défaut", () => {
    const base = {
      projet: "location",
      typeBien: "maison",
      adresse: { libelle: "1 rue de Nice", codeInsee: "06088", lat: 43.7, lon: 7.26 },
      surface: 80,
      pieces: 4,
      chambres: 2,
      etatGeneral: "bon",
      stationnement: "aucun",
      ageCuisine: "5_10",
      ageSdb: "5_10",
      dpe: "C",
      prenom: "Jane",
      nom: "Smith",
      email: "jane@example.com",
      telephone: "06 12 34 56 78",
      consentement: true,
    };
    expect(leadPayloadSchema.parse(base).locale).toBe("fr");
    expect(leadPayloadSchema.parse({ ...base, locale: "en" }).locale).toBe("en");
    expect(leadPayloadSchema.safeParse({ ...base, locale: "de" }).success).toBe(false);
  });
});
