import { describe, expect, it } from "vitest";
import { placeholdersIcu, signatureIcu, validerSurcharge } from "./icu";

describe("signatureIcu", () => {
  it("relève les arguments typés et les balises, y compris dans les cas plural/select", () => {
    expect(
      signatureIcu(
        "Bonjour {prenom}, {n, plural, one {# vente} other {# ventes}} {hausse, select, true {en hausse} other {en baisse}} le {date, date, long} <strong>ok</strong>"
      )
    ).toEqual({
      args: { prenom: "texte", n: "nombre", hausse: "select", date: "date" },
      tags: ["strong"],
    });
    expect(signatureIcu("Sans argument")).toEqual({ args: {}, tags: [] });
  });

  it("rejette une syntaxe invalide", () => {
    expect(() => signatureIcu("Accolade {ouverte")).toThrow();
  });
});

describe("placeholdersIcu", () => {
  it("liste les éléments à conserver pour l'admin", () => {
    expect(placeholdersIcu("{nom} a <lien>x</lien>")).toEqual(["{nom}", "<lien>"]);
    expect(placeholdersIcu("texte {cassé")).toEqual([]);
  });
});

describe("validerSurcharge", () => {
  const defaut = "Prix immobilier à {nom} ({cp}) - Prix au m² {annee}";

  it("accepte une reformulation qui garde les mêmes arguments", () => {
    expect(validerSurcharge(defaut, "{nom} ({cp}) : les prix au m² en {annee}")).toBeNull();
  });

  it("refuse un texte vide ou une syntaxe invalide", () => {
    expect(validerSurcharge(defaut, "   ")).toMatch(/vide/);
    expect(validerSurcharge(defaut, "{nom ({cp}) {annee}")).toMatch(/Syntaxe ICU invalide/);
  });

  it("refuse un argument manquant, inconnu ou de type différent", () => {
    expect(validerSurcharge(defaut, "Prix à {nom} ({cp})")).toMatch(/manquant.*\{annee\}/);
    expect(validerSurcharge(defaut, `${defaut} {bonus}`)).toMatch(/inconnu.*\{bonus\}/);
    expect(
      validerSurcharge("{n, plural, one {# vente} other {# ventes}}", "{n} ventes")
    ).toMatch(/type différent.*\{n\}/);
  });

  it("refuse une balise manquante ou inconnue", () => {
    expect(validerSurcharge("Voir la <lien>politique</lien>", "Voir la politique")).toMatch(/balise\(s\) manquante/);
    expect(validerSurcharge("Texte simple", "Texte <b>gras</b>")).toMatch(/balise\(s\) inconnue/);
  });
});
