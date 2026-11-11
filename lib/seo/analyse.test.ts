import { describe, expect, it } from "vitest";
import {
  analyserCommune,
  evolutionLongueDe,
  inseeDe,
  prixAffiches,
  prixVoisine,
  serieAnnuelleDe,
  tendanceDe,
  typeReferenceDe,
  volumeDe,
  type ContexteCommune,
  type StatsCommune,
  type VoisineContexte,
} from "./analyse";

const calmette: StatsCommune = {
  code_insee: "30061",
  nom_commune: "La Calmette",
  slug: "la-calmette-30190",
  code_postal: "30190",
  departement: "30",
  prix_m2_median_appartement: null,
  prix_m2_median_maison: 2764,
  nb_ventes_12m: 15,
  evolution_1an_pct: 15.2,
  nb_ventes_36m: 48,
  prix_m2_median_36m_appartement: null,
  prix_m2_median_36m_maison: 2600,
};

function voisine(nom: string, maison: number | null, distance: number): VoisineContexte {
  return {
    code_insee: nom,
    nom_commune: nom,
    slug: nom.toLowerCase(),
    code_postal: "30190",
    departement: "30",
    prix_m2_median_appartement: null,
    prix_m2_median_maison: maison,
    nb_ventes_12m: 20,
    nb_ventes_36m: 60,
    prix_m2_median_36m_appartement: null,
    prix_m2_median_36m_maison: maison ? maison - 100 : null,
    distance_km: distance,
  };
}

const contexte: ContexteCommune = {
  geo: { lat: 43.927, lon: 4.26, population: 2300, code_region: "76" },
  insee: {
    millesime: 2022,
    logements: 1000,
    residences_principales: 900,
    rp_proprietaires: 630,
    maisons: 850,
    appartements: 150,
  },
  departement: {
    departement: "30",
    prix_m2_median_appartement: 2300,
    prix_m2_median_maison: 2500,
    nb_ventes_12m: 9000,
    evolution_1an_pct: 1.2,
  },
  voisines: [
    voisine("Dions", 2400, 3.1),
    voisine("Saint-Chaptes", 2500, 4.2),
    voisine("Sainte-Anastasie", null, 4.9),
    voisine("Brignon", 2300, 6),
    voisine("Moussac", 2450, 7.5),
    voisine("Bourdic", 2200, 8),
    voisine("Sauzet", 2000, 9),
  ],
  annuelles: [
    { annee: 2021, type_local: "M", nb_ventes: 18, prix_m2_median: 2200 },
    { annee: 2022, type_local: "M", nb_ventes: 20, prix_m2_median: 2400 },
    { annee: 2023, type_local: "M", nb_ventes: 16, prix_m2_median: 2550 },
    { annee: 2024, type_local: "M", nb_ventes: 17, prix_m2_median: 2600 },
    { annee: 2025, type_local: "M", nb_ventes: 15, prix_m2_median: 2764 },
    { annee: 2025, type_local: "A", nb_ventes: 2, prix_m2_median: 2000 },
  ],
  derniere_vente: "2025-12-31",
};

describe("briques", () => {
  it("tendance et volume", () => {
    expect(tendanceDe(null)).toBeNull();
    expect(tendanceDe(0.3)).toBe("stable");
    expect(tendanceDe(2)).toBe("hausse");
    expect(tendanceDe(-0.6)).toBe("baisse");
    expect(volumeDe(5)).toBe("faible");
    expect(volumeDe(20)).toBe("moyen");
    expect(volumeDe(100)).toBe("fort");
  });

  it("prix affichés selon la fenêtre", () => {
    expect(prixAffiches(calmette, "12m")).toEqual({ fenetre: "12m", ventes: 15, appart: null, maison: 2764 });
    expect(prixAffiches(calmette, "36m")).toEqual({ fenetre: "36m", ventes: 48, appart: null, maison: 2600 });
  });

  it("type de référence : le parc dominant s'il a un prix", () => {
    const deux = { fenetre: "12m" as const, ventes: 50, appart: 3000, maison: 2800 };
    expect(typeReferenceDe(deux, contexte.insee)).toBe("M");
    expect(typeReferenceDe(deux, { ...contexte.insee!, maisons: 100, appartements: 900 })).toBe("A");
    expect(typeReferenceDe(deux, null)).toBe("A");
    expect(typeReferenceDe({ ...deux, appart: null }, null)).toBe("M");
    expect(typeReferenceDe({ ...deux, appart: null, maison: null }, null)).toBeNull();
  });

  it("série annuelle et évolution longue", () => {
    const serie = serieAnnuelleDe(contexte.annuelles);
    expect(serie.map((l) => l.annee)).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(serie[4]).toEqual({ annee: 2025, appart: { nb: 2, prix: 2000 }, maison: { nb: 15, prix: 2764 } });
    expect(evolutionLongueDe(contexte.annuelles, "M")).toEqual({ depuis: 2021, jusqua: 2025, pct: 25.6 });
    // Appartements : une seule année fiable → rien.
    expect(evolutionLongueDe(contexte.annuelles, "A")).toBeNull();
    expect(evolutionLongueDe(contexte.annuelles.slice(3), "M")).toBeNull();
  });

  it("INSEE : parts arrondies, dominante, population de la géographie", () => {
    expect(inseeDe(contexte)).toEqual({
      millesime: 2022,
      population: 2300,
      logements: 1000,
      partProprietaires: 70,
      partMaisons: 85,
      partAppartements: 15,
      dominante: "maisons",
    });
    expect(inseeDe(null)).toBeNull();
    expect(inseeDe({ ...contexte, insee: { ...contexte.insee!, maisons: 500, appartements: 500 } })?.dominante).toBe("mixte");
  });
});

describe("prixVoisine : même exigence de fiabilité que la commune", () => {
  it("12 mois si ≥ 10 ventes/an, sinon 36 mois si ≥ 30 ventes, sinon rien", () => {
    const v = voisine("Dions", 1182, 2.2);
    expect(prixVoisine({ ...v, nb_ventes_12m: 20 }, "M", "12m")).toBe(1182);
    // 3 ventes sur l'année, 40 sur 3 ans : médiane 3 ans (1082)
    expect(prixVoisine({ ...v, nb_ventes_12m: 3, nb_ventes_36m: 40 }, "M", "12m")).toBe(1082);
    // 3 ventes sur l'année, 12 sur 3 ans : exclue de la comparaison
    expect(prixVoisine({ ...v, nb_ventes_12m: 3, nb_ventes_36m: 12 }, "M", "12m")).toBeNull();
    // Commune en fenêtre 36 mois : voisines sur 36 mois d'abord
    expect(prixVoisine({ ...v, nb_ventes_12m: 20, nb_ventes_36m: 60 }, "M", "36m")).toBe(1082);
    expect(prixVoisine({ ...v, nb_ventes_12m: 20, nb_ventes_36m: 12 }, "M", "36m")).toBe(1182);
  });
});

describe("analyserCommune", () => {
  it("La Calmette : maisons, hausse, volume faible, plus chère que ses voisines et que le Gard", () => {
    const f = analyserCommune(calmette, contexte, { fenetre: "12m" });
    expect(f.typeReference).toBe("M");
    expect(f.prixReference).toBe(2764);
    expect(f.tendance).toBe("hausse");
    expect(f.evolution1an).toBe(15.2);
    expect(f.volume).toBe("faible");
    // 5 voisines avec prix parmi les plus proches : Dions, Saint-Chaptes, Brignon, Moussac, Bourdic
    expect(f.nbVoisinesComparees).toBe(5);
    expect(f.medianeVoisines).toBe(2400);
    expect(f.ecartVoisinesPct).toBe(15.2);
    expect(f.positionVoisines).toBe("plusCher");
    expect(f.prixDepartement).toBe(2500);
    expect(f.ecartDepartementPct).toBe(10.6);
    expect(f.positionDepartement).toBe("plusCher");
    expect(f.evolutionLongue).toEqual({ depuis: 2021, jusqua: 2025, pct: 25.6 });
    expect(f.voisines).toHaveLength(7);
    expect(f.voisines[0].prix).toBe(2400);
  });

  it("fenêtre 36 mois : prix sur 3 ans, volume ramené à l'année, voisines sur 36 mois", () => {
    const f = analyserCommune({ ...calmette, nb_ventes_12m: 6, evolution_1an_pct: 30 }, contexte, {
      fenetre: "36m",
    });
    expect(f.prix).toEqual({ fenetre: "36m", ventes: 48, appart: null, maison: 2600 });
    expect(f.evolution1an).toBeNull();
    expect(f.tendance).toBeNull();
    expect(f.volume).toBe("faible");
    expect(f.voisines[0].prix).toBe(2300);
  });

  it("sans contexte : faits minimaux, rien d'inventé", () => {
    const f = analyserCommune(calmette, null);
    expect(f.prix.fenetre).toBe("12m");
    expect(f.typeReference).toBe("M");
    expect(f.positionVoisines).toBeNull();
    expect(f.medianeVoisines).toBeNull();
    expect(f.positionDepartement).toBeNull();
    expect(f.evolutionLongue).toBeNull();
    expect(f.serieAnnuelle).toEqual([]);
    expect(f.insee).toBeNull();
  });

  it("moins de 3 voisines avec prix : pas de comparaison", () => {
    const f = analyserCommune(calmette, { ...contexte, voisines: contexte.voisines.slice(0, 3) });
    expect(f.nbVoisinesComparees).toBe(2);
    expect(f.positionVoisines).toBeNull();
  });

  it("prix proche de la référence (moins de 5 %)", () => {
    const f = analyserCommune({ ...calmette, prix_m2_median_maison: 2450 }, contexte, { fenetre: "12m" });
    expect(f.positionVoisines).toBe("proche");
    expect(f.ecartVoisinesPct).toBe(2.1);
  });
});
