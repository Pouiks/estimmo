import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import fr from "@/messages/fr";
import { formats } from "./formats";
import { signatureIcu as analyser, type TypeArgument as TypeArg } from "./icu";
import { LOCALES, type Locale } from "./routing";

type Arbre = { [cle: string]: string | Arbre };

/** { a: { b: "x" } } → { "a.b": "x" } */
function aplatir(arbre: Arbre, prefixe = ""): Record<string, string> {
  const plat: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(arbre)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof valeur === "string") plat[chemin] = valeur;
    else Object.assign(plat, aplatir(valeur, chemin));
  }
  return plat;
}

const MESSAGES: Record<Locale, Arbre> = { fr, en };
const PLATS = { fr: aplatir(fr), en: aplatir(en) };

/** Valeurs factices compatibles avec le type de chaque argument. */
function valeursFactices(args: Record<string, TypeArg>): Record<string, unknown> {
  const valeurs: Record<string, unknown> = {};
  for (const [nom, type] of Object.entries(args)) {
    if (type === "nombre") valeurs[nom] = 2;
    else if (type === "select") valeurs[nom] = "other";
    else if (type === "date") valeurs[nom] = new Date("2026-10-18T12:00:00Z");
    else valeurs[nom] = "x";
  }
  return valeurs;
}

describe("fichiers de traduction", () => {
  it("fr et en ont exactement les mêmes clés", () => {
    const clesFr = Object.keys(PLATS.fr).sort();
    const clesEn = Object.keys(PLATS.en).sort();
    expect(clesEn).toEqual(clesFr);
  });

  it("aucun message vide", () => {
    for (const locale of LOCALES) {
      for (const [cle, message] of Object.entries(PLATS[locale])) {
        expect(message.trim(), `${locale}:${cle}`).not.toBe("");
      }
    }
  });

  it.each(LOCALES)("tous les messages %s ont une syntaxe ICU valide", (locale) => {
    for (const [cle, message] of Object.entries(PLATS[locale])) {
      expect(() => analyser(message), `${locale}:${cle}`).not.toThrow();
    }
  });

  it("chaque clé utilise les mêmes arguments (et types) et balises en fr et en", () => {
    for (const [cle, messageFr] of Object.entries(PLATS.fr)) {
      const messageEn = PLATS.en[cle];
      expect(analyser(messageEn), cle).toEqual(analyser(messageFr));
    }
  });

  it.each(LOCALES)("tous les messages %s se rendent avec des valeurs factices", (locale) => {
    const t = createTranslator({
      locale,
      messages: MESSAGES[locale],
      formats,
      timeZone: "Europe/Paris",
    });
    for (const [cle, message] of Object.entries(PLATS[locale])) {
      const { args, tags } = analyser(message);
      const valeurs = valeursFactices(args);
      const rendu =
        tags.length > 0
          ? t.markup(cle as never, {
              ...valeurs,
              ...Object.fromEntries(
                tags.map((tag) => [tag, (c: string) => c])
              ),
            } as never)
          : t(cle as never, valeurs as never);
      expect(typeof rendu, `${locale}:${cle}`).toBe("string");
      expect(rendu.trim(), `${locale}:${cle}`).not.toBe("");
    }
  });
});
