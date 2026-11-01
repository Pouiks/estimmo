import { describe, expect, it } from "vitest";
import {
  debutJourParis,
  formaterDuree,
  formaterJour,
  jourParis,
  joursEntre,
  pourcentage,
  preparerAnalytics,
  type AnalyticsBrut,
} from "./agregats";

const VIDE: AnalyticsBrut = {
  sessions: 0,
  engagees: 0,
  soumissions: 0,
  duree_mediane_ms: null,
  etapes: [],
  champs: [],
  derniers: [],
  valeurs: [],
  jours: [],
  segments: [],
};

const BRUT: AnalyticsBrut = {
  sessions: 100,
  engagees: 80,
  soumissions: 12,
  duree_mediane_ms: 185_000,
  etapes: [
    { etape: 1, vues: 100, completees: 60, retours: 0, erreurs: 30, sessions_erreur: 20, sorties: 35, abandons: 40, duree_mediane_ms: 42_000 },
    { etape: 2, vues: 60, completees: 45, retours: 5, erreurs: 10, sessions_erreur: 8, sorties: 12, abandons: 15, duree_mediane_ms: 61_500 },
    { etape: 3, vues: 45, completees: 30, retours: 2, erreurs: 4, sessions_erreur: 4, sorties: 10, abandons: 15, duree_mediane_ms: 70_000 },
    { etape: 4, vues: 30, completees: 13, retours: 1, erreurs: 6, sessions_erreur: 5, sorties: 15, abandons: 18, duree_mediane_ms: null },
    { etape: 5, vues: 12, completees: 0, retours: 0, erreurs: 0, sessions_erreur: 0, sorties: 9, abandons: 0, duree_mediane_ms: null },
  ],
  champs: [
    { step: 1, champ: "adresse", touches: 80, renseignes: 70, erreurs: 25, sessions_erreur: 18 },
    { step: 1, champ: "projet", touches: 0, renseignes: 75, erreurs: 5, sessions_erreur: 5 },
    { step: 4, champ: "telephone", touches: 20, renseignes: 15, erreurs: 6, sessions_erreur: 5 },
  ],
  derniers: [
    { step: 1, champ: "adresse", n: 15 },
    { step: 1, champ: null, n: 25 },
    { step: 4, champ: "telephone", n: 10 },
    { step: 4, champ: "consentement", n: 8 },
  ],
  valeurs: [
    { champ: "projet", valeur: "vente", n: 55 },
    { champ: "projet", valeur: "location", n: 20 },
    { champ: "dpe", valeur: "ne_sait_pas", n: 9 },
    { champ: "dpe", valeur: "C", n: 3 },
    { champ: "exterieur", valeur: "balcon", n: 10 },
    { champ: "exterieur", valeur: "aucun", n: 5 },
    { champ: "ascenseur", valeur: "oui", n: 7 },
  ],
  jours: [
    { jour: "2026-10-30", sessions: 40, soumissions: 5 },
    { jour: "2026-10-31", sessions: 60, soumissions: 7 },
  ],
  segments: [
    { dimension: "appareil", valeur: "mobile", sessions: 70, soumissions: 7 },
    { dimension: "appareil", valeur: "ordinateur", sessions: 30, soumissions: 5 },
    { dimension: "locale", valeur: "fr", sessions: 95, soumissions: 12 },
    { dimension: "locale", valeur: "inconnu", sessions: 5, soumissions: 0 },
    { dimension: "page", valeur: "/", sessions: 90, soumissions: 10 },
    { dimension: "page", valeur: "/estimation", sessions: 10, soumissions: 2 },
  ],
};

describe("pourcentage et durées", () => {
  it("pourcentage arrondi, null sans total", () => {
    expect(pourcentage(12, 100)).toBe(12);
    expect(pourcentage(1, 3)).toBe(33);
    expect(pourcentage(0, 0)).toBeNull();
    expect(pourcentage(5, -1)).toBeNull();
  });

  it("formaterDuree", () => {
    expect(formaterDuree(null)).toBeNull();
    expect(formaterDuree(undefined)).toBeNull();
    expect(formaterDuree(-5)).toBeNull();
    expect(formaterDuree(45_000)).toBe("45 s");
    expect(formaterDuree(60_000)).toBe("1 min");
    expect(formaterDuree(83_400)).toBe("1 min 23 s");
    expect(formaterDuree(3_720_000)).toBe("1 h 02 min");
  });
});

describe("jours (heure de Paris)", () => {
  it("jourParis bascule à minuit heure de Paris, pas UTC", () => {
    // 31/10 23:30 UTC = 1er novembre 00:30 à Paris (UTC+1 après le 25/10).
    expect(jourParis(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    expect(jourParis(new Date("2026-10-31T22:30:00Z"))).toBe("2026-10-31");
  });

  it("debutJourParis renvoie minuit à Paris (été et hiver)", () => {
    expect(debutJourParis(new Date("2026-10-31T15:00:00Z")).toISOString()).toBe(
      "2026-10-30T23:00:00.000Z"
    );
    expect(debutJourParis(new Date("2026-07-15T15:00:00Z")).toISOString()).toBe(
      "2026-07-14T22:00:00.000Z"
    );
  });

  it("joursEntre énumère les jours civils, y compris au changement d'heure", () => {
    expect(
      joursEntre(new Date("2026-10-24T10:00:00Z"), new Date("2026-10-26T10:00:00Z"))
    ).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(joursEntre(new Date("2026-11-01T10:00:00Z"), new Date("2026-11-01T11:00:00Z"))).toEqual([
      "2026-11-01",
    ]);
    expect(joursEntre(new Date("2026-11-02T10:00:00Z"), new Date("2026-11-01T10:00:00Z"))).toEqual(
      []
    );
  });

  it("formaterJour", () => {
    expect(formaterJour("2026-10-31")).toBe("31 oct.");
    expect(formaterJour("2026-03-01")).toBe("1 mars");
  });
});

describe("preparerAnalytics", () => {
  const periode = {
    depuis: new Date("2026-10-29T10:00:00Z"),
    jusqua: new Date("2026-10-31T18:00:00Z"),
  };

  it("supporte un résultat vide", () => {
    const a = preparerAnalytics(VIDE, periode);
    expect(a.kpis).toEqual({
      sessions: 0,
      engagees: 0,
      tauxEngagement: null,
      soumissions: 0,
      tauxConversion: null,
      tauxConversionEngagees: null,
      dureeMediane: null,
      etapeCritique: null,
    });
    expect(a.entonnoir).toHaveLength(4);
    expect(a.entonnoir[0]).toMatchObject({
      vues: 0,
      abandons: 0,
      abandonsSansInteraction: 0,
      tauxAbandon: null,
    });
    expect(a.etapes[1].champs.map((c) => c.champ)).toEqual([
      "surface",
      "pieces",
      "chambres",
      "etage",
      "etagesImmeuble",
      "ascenseur",
    ]);
    expect(a.reponses).toEqual([]);
    expect(a.jours.map((j) => j.sessions)).toEqual([0, 0, 0]);
    expect(a.segments.appareil).toEqual([]);
  });

  it("calcule les KPI et l'entonnoir", () => {
    const a = preparerAnalytics(BRUT, periode);
    expect(a.kpis).toEqual({
      sessions: 100,
      engagees: 80,
      tauxEngagement: 80,
      soumissions: 12,
      tauxConversion: 12,
      tauxConversionEngagees: 15,
      dureeMediane: "3 min 5 s",
      // Étape 1 : 40 abandons dont 25 sans interaction → 15 réels ;
      // l'étape 4 en a 18 : c'est elle qui perd le plus de remplisseurs.
      etapeCritique: 4,
    });
    expect(a.entonnoir[0]).toEqual({
      etape: 1,
      libelle: "Votre projet",
      vues: 100,
      completees: 60,
      abandons: 40,
      abandonsSansInteraction: 25,
      tauxAbandon: 40,
      partSessions: 100,
      dureeMediane: "42 s",
      retours: 0,
      erreurs: 30,
      sessionsErreur: 20,
    });
    expect(a.entonnoir[3]).toMatchObject({
      libelle: "Vos coordonnées",
      vues: 30,
      tauxAbandon: 60,
      partSessions: 30,
      dureeMediane: null,
    });
  });

  it("détaille les champs de chaque étape avec les abandons qui suivent", () => {
    const a = preparerAnalytics(BRUT, periode);
    const etape1 = a.etapes[0];
    expect(etape1.abandons).toBe(40);
    expect(etape1.abandonsSansInteraction).toBe(25);
    expect(etape1.champs[0]).toEqual({
      champ: "adresse",
      libelle: "Adresse du bien",
      touches: 80,
      renseignes: 70,
      erreurs: 25,
      sessionsErreur: 18,
      abandonsApres: 15,
    });
    // Champ sans aucune donnée : présent, à zéro.
    expect(etape1.champs[2]).toMatchObject({ champ: "horizon", touches: 0, renseignes: 0, abandonsApres: 0 });
    const etape4 = a.etapes[3];
    expect(etape4.champs.find((c) => c.champ === "consentement")?.abandonsApres).toBe(8);
    expect(etape4.abandonsSansInteraction).toBe(0);
  });

  it("l'étape critique ignore les affichages sans interaction, pas les abandons suivants", () => {
    // Sans le « sans interaction » de l'étape 1, c'est elle qui domine (40 > 18).
    const brut = { ...BRUT, derniers: BRUT.derniers.filter((d) => d.champ !== null) };
    expect(preparerAnalytics(brut, periode).kpis.etapeCritique).toBe(1);
    // Un abandon à l'étape 3 sans toucher ses champs reste un abandon réel.
    const brut3 = {
      ...BRUT,
      derniers: [...BRUT.derniers, { step: 3, champ: null, n: 15 }],
      etapes: BRUT.etapes.map((e) => (e.etape === 3 ? { ...e, abandons: 30 } : e)),
    };
    expect(preparerAnalytics(brut3, periode).kpis.etapeCritique).toBe(3);
  });

  it("classe les réponses par fréquence avec les libellés du site, sans les booléens", () => {
    const a = preparerAnalytics(BRUT, periode);
    expect(a.reponses.map((r) => r.champ)).toEqual(["projet", "dpe", "exterieur"]);
    expect(a.reponses[0]).toEqual({
      champ: "projet",
      libelle: "Vendre / louer",
      total: 75,
      valeurs: [
        { valeur: "vente", libelle: "Vente", n: 55, part: 73 },
        { valeur: "location", libelle: "Location", n: 20, part: 27 },
      ],
    });
    expect(a.reponses[1].valeurs[0]).toMatchObject({ libelle: "Je ne sais pas", n: 9 });
    expect(a.reponses[2].valeurs.map((v) => v.libelle)).toEqual(["Balcon", "Aucun"]);
  });

  it("complète la série journalière sur toute la période", () => {
    const a = preparerAnalytics(BRUT, periode);
    expect(a.jours).toEqual([
      { jour: "2026-10-29", libelle: "29 oct.", sessions: 0, soumissions: 0 },
      { jour: "2026-10-30", libelle: "30 oct.", sessions: 40, soumissions: 5 },
      { jour: "2026-10-31", libelle: "31 oct.", sessions: 60, soumissions: 7 },
    ]);
  });

  it("segmente par appareil, langue et page avec le taux de conversion", () => {
    const a = preparerAnalytics(BRUT, periode);
    expect(a.segments.appareil).toEqual([
      { valeur: "mobile", libelle: "Mobile", sessions: 70, soumissions: 7, taux: 10 },
      { valeur: "ordinateur", libelle: "Ordinateur", sessions: 30, soumissions: 5, taux: 17 },
    ]);
    expect(a.segments.locale.map((s) => s.libelle)).toEqual(["Français", "Inconnue"]);
    expect(a.segments.locale[1].taux).toBe(0);
    expect(a.segments.page.map((s) => s.libelle)).toEqual(["/", "/estimation"]);
  });
});
