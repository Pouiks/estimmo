import { beforeEach, describe, expect, it, vi } from "vitest";
import { TAILLE_MAX_LOT, type LotEvenements } from "./evenements";
import { SuiviFormulaire, champDeCleErreur, serialiserValeur } from "./suivi";

const SESSION = "6f1c2b8e-3a4d-4f5e-9b6a-7c8d9e0f1a2b";

/** Suivi avec horloge et minuterie contrôlées. */
function creer(options: { delaiMs?: number; maxEvenements?: number } = {}) {
  let horloge = 10_000;
  const lots: LotEvenements[] = [];
  const minuteries: { fn: () => void; ms: number; annulee: boolean }[] = [];
  const suivi = new SuiviFormulaire({
    sessionId: SESSION,
    locale: "fr",
    appareil: "ordinateur",
    page: "/",
    envoyer: (lot) => lots.push(lot),
    maintenant: () => horloge,
    planifier: (fn, ms) => {
      const m = { fn, ms, annulee: false };
      minuteries.push(m);
      return m;
    },
    annuler: (id) => {
      (id as { annulee: boolean }).annulee = true;
    },
    ...options,
  });
  return {
    suivi,
    lots,
    minuteries,
    avancer: (ms: number) => {
      horloge += ms;
    },
    declencher: () => {
      const actives = minuteries.filter((m) => !m.annulee);
      minuteries.length = 0;
      for (const m of actives) m.fn();
    },
    evenements: () => lots.flatMap((l) => l.evenements),
  };
}

describe("serialiserValeur", () => {
  it("texte : renseigné ou rien, jamais la valeur", () => {
    expect(serialiserValeur("texte", "")).toBeNull();
    expect(serialiserValeur("texte", "   ")).toBeNull();
    expect(serialiserValeur("texte", null)).toBeNull();
    expect(serialiserValeur("texte", "camille@email.fr")).toBe("");
    expect(serialiserValeur("texte", { libelle: "12 rue des Lilas" })).toBe("");
  });

  it("choix, multi et bool", () => {
    expect(serialiserValeur("choix", "vente")).toBe("vente");
    expect(serialiserValeur("choix", null)).toBeNull();
    expect(serialiserValeur("multi", ["terrasse", "balcon"])).toBe("balcon,terrasse");
    expect(serialiserValeur("multi", [])).toBe("aucun");
    expect(serialiserValeur("multi", "balcon")).toBeNull();
    expect(serialiserValeur("bool", true)).toBe("oui");
    expect(serialiserValeur("bool", false)).toBe("non");
    expect(serialiserValeur("bool", null)).toBeNull();
  });
});

describe("champDeCleErreur", () => {
  it("ramène une clé imbriquée à son champ", () => {
    expect(champDeCleErreur("adresse.libelle")).toBe("adresse");
    expect(champDeCleErreur("email")).toBe("email");
    expect(champDeCleErreur("inconnu.x")).toBeNull();
  });
});

describe("SuiviFormulaire", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("regroupe les événements et les envoie après le délai, avec le contexte", () => {
    const t = creer();
    t.suivi.vue(1);
    t.avancer(800);
    t.suivi.saisie("projet", "vente");
    expect(t.lots).toHaveLength(0);
    expect(t.minuteries).toHaveLength(1);
    expect(t.minuteries[0].ms).toBe(1500);
    t.declencher();
    expect(t.lots).toHaveLength(1);
    expect(t.lots[0]).toMatchObject({
      sessionId: SESSION,
      locale: "fr",
      appareil: "ordinateur",
      page: "/",
    });
    expect(t.lots[0].evenements).toEqual([
      { etape: 1, event: "view", t: 0 },
      { etape: 1, event: "saisie", champ: "projet", valeur: "vente", t: 800 },
    ]);
  });

  it("un champ texte n'est renseigné qu'une fois et sans valeur", () => {
    const t = creer();
    t.suivi.saisie("surface", "6");
    t.suivi.saisie("surface", "65");
    t.suivi.saisie("surface", "");
    t.suivi.saisie("email", "a@b.fr");
    t.suivi.flush();
    expect(t.evenements()).toEqual([
      { etape: 2, event: "saisie", champ: "surface", t: 0 },
      { etape: 4, event: "saisie", champ: "email", t: 0 },
    ]);
  });

  it("un champ à choix enregistre chaque nouvelle valeur, pas les répétitions", () => {
    const t = creer();
    t.suivi.saisie("dpe", "C");
    t.suivi.saisie("dpe", "C");
    t.suivi.saisie("dpe", "ne_sait_pas");
    t.suivi.saisie("exterieur", ["balcon"]);
    t.suivi.saisie("exterieur", ["balcon", "jardin"]);
    t.suivi.saisie("exterieur", []);
    t.suivi.saisie("ascenseur", true);
    t.suivi.saisie("horizon", null);
    t.suivi.flush();
    expect(t.evenements().map((e) => [e.champ, e.valeur])).toEqual([
      ["dpe", "C"],
      ["dpe", "ne_sait_pas"],
      ["exterieur", "balcon"],
      ["exterieur", "balcon,jardin"],
      ["exterieur", "aucun"],
      ["ascenseur", "oui"],
    ]);
  });

  it("ignore les champs inconnus (pot de miel, données de quartier)", () => {
    const t = creer();
    t.suivi.saisie("siteWeb", "http://spam");
    t.suivi.saisie("quartierStats", { prix: 1 });
    t.suivi.focus("website");
    t.suivi.flush();
    expect(t.lots).toHaveLength(0);
  });

  it("le focus est compté une fois par champ, à l'étape du champ", () => {
    const t = creer();
    t.suivi.focus("adresse");
    t.suivi.focus("adresse");
    t.suivi.focus("telephone");
    t.suivi.flush();
    expect(t.evenements()).toEqual([
      { etape: 1, event: "focus", champ: "adresse", t: 0 },
      { etape: 4, event: "focus", champ: "telephone", t: 0 },
    ]);
  });

  it("les erreurs de validation sont ramenées au champ et dédoublonnées", () => {
    const t = creer();
    t.suivi.erreurs(1, ["adresse.libelle", "adresse.codeInsee", "projet", "inconnu"]);
    t.suivi.flush();
    expect(t.evenements().map((e) => e.champ)).toEqual(["adresse", "projet"]);
    expect(t.evenements().every((e) => e.event === "erreur" && e.etape === 1)).toBe(true);
  });

  it("soumis et sortie envoient immédiatement et annulent la minuterie", () => {
    const t = creer();
    t.suivi.vue(4);
    expect(t.minuteries.filter((m) => !m.annulee)).toHaveLength(1);
    t.suivi.soumis();
    expect(t.minuteries[0].annulee).toBe(true);
    expect(t.lots).toHaveLength(1);
    expect(t.evenements().map((e) => [e.etape, e.event])).toEqual([
      [4, "view"],
      [4, "submit"],
      [5, "view"],
    ]);

    t.suivi.sortie(5);
    expect(t.lots).toHaveLength(2);
    expect(t.lots[1].evenements).toEqual([{ etape: 5, event: "sortie", t: 0 }]);
  });

  it("retour, erreur API et recommencer", () => {
    const t = creer();
    t.suivi.retour(3);
    t.suivi.erreurApi("500");
    t.suivi.erreurApi("reseau");
    t.suivi.saisie("projet", "vente");
    t.suivi.saisie("email", "x@y.fr");
    t.suivi.recommencer();
    // Nouveau parcours : les mêmes valeurs sont de nouveau enregistrées.
    t.suivi.saisie("projet", "vente");
    t.suivi.saisie("email", "x@y.fr");
    t.suivi.flush();
    expect(t.evenements().map((e) => [e.etape, e.event, e.champ ?? e.valeur ?? null])).toEqual([
      [3, "retour", null],
      [4, "erreur_api", "500"],
      [4, "erreur_api", "reseau"],
      [1, "saisie", "projet"],
      [4, "saisie", "email"],
      [5, "recommencer", null],
      [1, "saisie", "projet"],
      [4, "saisie", "email"],
    ]);
  });

  it("découpe en lots de TAILLE_MAX_LOT et plafonne le nombre d'événements", () => {
    const t = creer({ maxEvenements: 120 });
    for (let i = 0; i < 200; i++) t.suivi.vue(1);
    t.suivi.flush();
    expect(t.evenements()).toHaveLength(120);
    expect(t.lots.map((l) => l.evenements.length)).toEqual([
      TAILLE_MAX_LOT,
      TAILLE_MAX_LOT,
      120 - 2 * TAILLE_MAX_LOT,
    ]);
  });

  it("la durée écoulée est entière, positive et bornée", () => {
    const t = creer();
    t.avancer(1234.6);
    t.suivi.vue(1);
    t.avancer(5_000_000_000);
    t.suivi.vue(2);
    t.suivi.flush();
    expect(t.evenements().map((e) => e.t)).toEqual([1235, 2_000_000_000]);
  });

  it("flush sans événement n'envoie rien", () => {
    const t = creer();
    t.suivi.flush();
    expect(t.lots).toHaveLength(0);
  });
});
