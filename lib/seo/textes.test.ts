import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import fr from "@/messages/fr";
import { formats } from "@/lib/i18n/formats";
import { analyserCommune, prixAffiches, type ContexteCommune } from "./analyse";
import type { CommuneStats, LoyersCommuneRow } from "./communes";
import {
  brefTextes,
  departementTexte,
  evolutionLongueTexte,
  evolutionTexte,
  faqCommune,
  formatEvo,
  introCommune,
  prixTexte,
  variante,
  voisinesTexte,
  volumeTexte,
  type TraducteurCommune,
} from "./textes";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

const tFr = createTranslator({
  locale: "fr",
  messages: fr,
  namespace: "commune",
  formats,
}) as unknown as TraducteurCommune;
const tEn = createTranslator({
  locale: "en",
  messages: en,
  namespace: "commune",
  formats,
}) as unknown as TraducteurCommune;

const nice: CommuneStats = {
  code_insee: "06088",
  nom_commune: "Nice",
  slug: "nice-06000",
  code_postal: "06000",
  departement: "06",
  prix_m2_median_appartement: 4500,
  prix_m2_median_maison: 6200,
  nb_ventes_12m: 1234,
  evolution_1an_pct: 3.26,
  updated_at: "2026-10-01T00:00:00Z",
  contenu_modifie_le: "2026-10-01T00:00:00Z",
  nb_ventes_36m: 3500,
  prix_m2_median_36m_appartement: 4400,
  prix_m2_median_36m_maison: 6000,
};
const prixNice = prixAffiches(nice, "12m");
const intro = (s: CommuneStats, t: TraducteurCommune) => introCommune(s, prixAffiches(s, "12m"), t);

const loyers: LoyersCommuneRow = {
  loyer_m2_appartement: 18.5,
  loyer_m2_appt_t1_t2: 21.2,
  loyer_m2_appt_t3_plus: 16.4,
  loyer_m2_maison: 15,
  millesime: 2025,
};

describe("variante", () => {
  it("est déterministe et bornée", () => {
    expect(variante("06088", 3)).toBe(variante("06088", 3));
    for (const code of ["75056", "13055", "2A004", "97411"]) {
      expect(variante(code, 3)).toBeGreaterThanOrEqual(0);
      expect(variante(code, 3)).toBeLessThan(3);
    }
  });
});

describe("prixTexte", () => {
  it("appartement et maison, en français", () => {
    expect(nbsp(prixTexte(prixNice, tFr)!)).toBe(
      "4 500 €/m² pour un appartement et 6 200 €/m² pour une maison"
    );
  });
  it("appartement seul, en anglais", () => {
    expect(prixTexte({ ...prixNice, maison: null }, tEn)).toBe(
      "€4,500/m² for a flat"
    );
  });
  it("null sans aucun prix", () => {
    expect(
      prixTexte({ appart: null, maison: null }, tFr)
    ).toBeNull();
  });
});

describe("introCommune", () => {
  it("rend les trois variantes françaises avec pluriel et montants", () => {
    const textes = [0, 1, 2].map((v) => {
      // Codes INSEE choisis pour couvrir chaque variante
      const code = ["06088", "75056", "13055", "69123", "31555", "44109"].find(
        (c) => variante(c, 3) === v
      )!;
      return nbsp(intro({ ...nice, code_insee: code }, tFr));
    });
    expect(textes[0]).toContain("Le marché immobilier de Nice affiche un prix médian de 4 500 €/m² pour un appartement");
    expect(textes[0]).toContain("1 234 ventes ont été analysées");
    expect(textes[1]).toContain("Combien vaut un bien à Nice ?");
    expect(textes[1]).toContain("1 234 transactions observées");
    expect(textes[2]).toContain("1 234 au total");
  });

  it("gère le singulier et l'absence de ventes", () => {
    const code = ["06088", "75056", "13055", "69123", "31555", "44109"].find(
      (c) => variante(c, 3) === 0
    )!;
    expect(intro({ ...nice, code_insee: code, nb_ventes_12m: 1 }, tFr)).toContain(
      "1 vente a été analysée"
    );
    expect(intro({ ...nice, code_insee: code, nb_ventes_12m: 0 }, tFr)).toContain(
      "aucune vente n'a été analysée"
    );
  });

  it("texte sans ventes (Alsace-Moselle) dans les deux langues", () => {
    const sansVentes = { ...nice, nom_commune: "Strasbourg", prix_m2_median_appartement: null, prix_m2_median_maison: null };
    expect(intro(sansVentes, tFr)).toContain("Livre foncier en Alsace-Moselle");
    expect(intro(sansVentes, tEn)).toContain("Livre foncier regime in Alsace-Moselle");
  });

  it("variante anglaise équivalente", () => {
    expect(intro(nice, tEn)).toMatch(/Nice/);
    expect(intro(nice, tEn)).toMatch(/1,234/);
  });
});

describe("formatEvo / evolutionTexte", () => {
  it("formate l'évolution avec signe et une décimale", () => {
    expect(nbsp(formatEvo(3.26, tFr, "n.d."))).toBe("+3,3 %");
    expect(nbsp(formatEvo(-1.4, tFr, "n.d."))).toBe("-1,4 %");
    expect(formatEvo(null, tFr, "n.d.")).toBe("n.d.");
    expect(formatEvo(3.26, tEn, "n/a")).toBe("+3.3%");
  });

  it("hausse, baisse, stabilité, et rien sous 10 ventes", () => {
    const hausse = evolutionTexte(nice, tFr, "n.d.")!;
    expect(nbsp(hausse)).toMatch(/progressent|à la hausse/);
    expect(nbsp(hausse)).toContain("+3,3 %");
    const baisse = evolutionTexte({ ...nice, evolution_1an_pct: -2 }, tFr, "n.d.")!;
    expect(baisse).toMatch(/reculent|à la baisse/);
    const stable = evolutionTexte({ ...nice, evolution_1an_pct: 0.2 }, tFr, "n.d.")!;
    expect(stable).toMatch(/stable/);
    expect(evolutionTexte({ ...nice, nb_ventes_12m: 5 }, tFr, "n.d.")).toBeNull();
    expect(evolutionTexte({ ...nice, evolution_1an_pct: null }, tFr, "n.d.")).toBeNull();
    expect(evolutionTexte({ ...nice, evolution_1an_pct: -2 }, tEn, "n/a")).toMatch(/fell|downward/);
  });
});

describe("faqCommune", () => {
  it("4 questions maximum, dans l'ordre, avec les montants", () => {
    const faq = faqCommune(nice, loyers, 2026, tFr);
    expect(faq).toHaveLength(4);
    expect(faq[0].question).toBe("Quel est le prix au m² d'un appartement à Nice en 2026 ?");
    expect(nbsp(faq[0].reponse)).toContain("4 500 €/m²");
    expect(faq[1].question).toBe("Quel est le prix au m² d'une maison à Nice ?");
    expect(nbsp(faq[2].reponse)).toContain("18,5 €/m²");
    expect(nbsp(faq[2].reponse)).toContain("954 €"); // 21,2 × 45 arrondi
    expect(faq[2].reponse).toContain("ANIL 2025");
    expect(faq[3].question).toContain("estimation précise");
  });

  it("sans maison ni loyers : 2 questions", () => {
    const faq = faqCommune({ ...nice, prix_m2_median_maison: null }, null, 2026, tFr);
    expect(faq.map((f) => f.question)).toHaveLength(2);
  });

  it("version anglaise", () => {
    const faq = faqCommune(nice, loyers, 2026, tEn);
    expect(faq[0].question).toBe("What is the price per m² of a flat in Nice in 2026?");
    expect(faq[2].reponse).toContain("€18.5/m²");
    expect(faq[2].reponse).toContain("€954");
  });
});

// ---------------------------------------------------------------------------
// Textes conditionnels (phase 2) : La Calmette, commune de maisons du Gard
// ---------------------------------------------------------------------------
const calmette: CommuneStats = {
  code_insee: "30061",
  nom_commune: "La Calmette",
  slug: "la-calmette-30190",
  code_postal: "30190",
  departement: "30",
  prix_m2_median_appartement: null,
  prix_m2_median_maison: 2764,
  nb_ventes_12m: 15,
  evolution_1an_pct: 15.2,
  updated_at: "2026-11-11T00:00:00Z",
  contenu_modifie_le: "2026-11-11T00:00:00Z",
  nb_ventes_36m: 48,
  prix_m2_median_36m_appartement: null,
  prix_m2_median_36m_maison: 2600,
};

const voisine = (nom: string, maison: number | null, distance: number) => ({
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
  prix_m2_median_36m_maison: maison,
  distance_km: distance,
});

const contexte: ContexteCommune = {
  geo: { lat: 43.927, lon: 4.26, population: 2300, code_region: "76" },
  insee: { millesime: 2022, logements: 1000, residences_principales: 900, rp_proprietaires: 630, maisons: 850, appartements: 150 },
  departement: { departement: "30", prix_m2_median_appartement: 2300, prix_m2_median_maison: 2500, nb_ventes_12m: 9000, evolution_1an_pct: 1.2 },
  voisines: [voisine("Dions", 2400, 3.1), voisine("Saint-Chaptes", 2500, 4.2), voisine("Brignon", 2300, 6), voisine("Moussac", 2450, 7.5), voisine("Bourdic", 2200, 8)],
  annuelles: [
    { annee: 2021, type_local: "M", nb_ventes: 18, prix_m2_median: 2200 },
    { annee: 2025, type_local: "M", nb_ventes: 15, prix_m2_median: 2764 },
  ],
  derniere_vente: "2025-12-31",
};
const faits = analyserCommune(calmette, contexte, { fenetre: "12m" });

describe("textes conditionnels", () => {
  it("volume faible, moyen, fort, dans la fenêtre", () => {
    expect(nbsp(volumeTexte(calmette, faits, tFr)!)).toMatch(/15 ventes (sur douze mois|en douze mois)/);
    const moyen = analyserCommune({ ...calmette, nb_ventes_12m: 50 }, contexte, { fenetre: "12m" });
    expect(volumeTexte(calmette, moyen, tFr)).toMatch(/50 (ventes|transactions)/);
    const fort = analyserCommune({ ...calmette, nb_ventes_12m: 500 }, contexte, { fenetre: "12m" });
    expect(volumeTexte(calmette, fort, tFr)).toMatch(/profond|très actif/);
    const trois = analyserCommune({ ...calmette, nb_ventes_12m: 6 }, contexte, { fenetre: "36m" });
    expect(volumeTexte(calmette, trois, tFr)).toMatch(/48 ventes.*(trois|3)/);
    expect(volumeTexte(calmette, { ...faits, prix: { ...faits.prix, ventes: 0 } }, tFr)).toBeNull();
    expect(volumeTexte(calmette, faits, tEn)).toMatch(/15 sales/);
  });

  it("évolution longue depuis la première année fiable", () => {
    const texte = nbsp(evolutionLongueTexte(calmette, faits, tFr, "n.d.")!);
    expect(texte).toContain("2021");
    expect(texte).toContain("2025");
    expect(texte).toContain("+25,6 %");
    expect(texte).toMatch(/maisons/);
    expect(evolutionLongueTexte(calmette, analyserCommune(calmette, null), tFr, "n.d.")).toBeNull();
  });

  it("comparaison avec les voisines et le département, selon la position", () => {
    const voisines = nbsp(voisinesTexte(calmette, faits, tFr)!);
    expect(voisines).toContain("2 764 €/m²");
    expect(voisines).toContain("2 400 €/m²");
    expect(voisines).toContain("15,2 %");
    expect(voisines).toMatch(/au-dessus|plus cher/);
    const dept = nbsp(departementTexte(calmette, faits, "Gard", tFr)!);
    expect(dept).toContain("Gard");
    expect(dept).toContain("2 500 €/m²");
    expect(dept).toContain("10,6 % plus chère");

    const moinsCher = analyserCommune({ ...calmette, prix_m2_median_maison: 2000 }, contexte, { fenetre: "12m" });
    expect(voisinesTexte(calmette, moinsCher, tFr)).toMatch(/en dessous|abordables/);
    expect(departementTexte(calmette, moinsCher, "Gard", tFr)).toContain("moins chère");
    const proche = analyserCommune({ ...calmette, prix_m2_median_maison: 2450 }, contexte, { fenetre: "12m" });
    expect(voisinesTexte(calmette, proche, tFr)).toMatch(/dans la moyenne|même niveau/);
    expect(voisinesTexte(calmette, analyserCommune(calmette, null), tFr)).toBeNull();
    expect(voisinesTexte(calmette, faits, tEn)).toMatch(/nearest|neighbouring/);
  });

  it("en bref : population, logements, propriétaires, dominante", () => {
    const phrases = brefTextes(calmette, faits, tFr).map(nbsp);
    expect(phrases).toHaveLength(4);
    expect(phrases[0]).toContain("2 300 habitants");
    expect(phrases[1]).toContain("85 % de maisons");
    expect(phrases[2]).toContain("70 %");
    expect(phrases[3]).toMatch(/maison individuelle/);
    expect(brefTextes(calmette, analyserCommune(calmette, null), tFr)).toEqual([]);
  });

  it("FAQ enrichie : 5 questions au plus, chiffrées, tendance et voisines", () => {
    const faq = faqCommune(calmette, loyers, 2026, tFr, faits);
    expect(faq).toHaveLength(5);
    expect(faq.map((f) => f.question)).toEqual([
      "Quel est le prix au m² d'une maison à La Calmette ?",
      "Les prix immobiliers montent-ils à La Calmette ?",
      "La Calmette est-elle plus chère que les communes voisines ?",
      "Quel loyer pour un appartement à La Calmette ?",
      "Comment obtenir une estimation précise de mon bien à La Calmette ?",
    ]);
    expect(nbsp(faq[1].reponse)).toContain("+15,2 %");
    expect(nbsp(faq[1].reponse)).toContain("entre 2021 et 2025");
    expect(nbsp(faq[2].reponse)).toMatch(/^Oui : 2 764 €\/m²/);
    // Avec aussi un prix appartement, le loyer saute (plafond 5) et l'estimation reste.
    const avecAppart = analyserCommune({ ...calmette, prix_m2_median_appartement: 2100 }, contexte, { fenetre: "12m" });
    const faq2 = faqCommune({ ...calmette, prix_m2_median_appartement: 2100 }, loyers, 2026, tFr, avecAppart);
    expect(faq2).toHaveLength(5);
    expect(faq2[0].question).toContain("appartement");
    expect(faq2[4].question).toContain("estimation précise");
    expect(faq2.some((f) => f.question.includes("loyer"))).toBe(false);
  });

  it("fenêtre 36 mois : les réponses le disent", () => {
    const trois = analyserCommune({ ...calmette, nb_ventes_12m: 6 }, contexte, { fenetre: "36m" });
    const faq = faqCommune({ ...calmette, nb_ventes_12m: 6 }, null, 2026, tFr, trois);
    expect(nbsp(faq[0].reponse)).toContain("2 600 €/m²");
    expect(faq[0].reponse).toContain("trois dernières années");
    expect(nbsp(intro({ ...calmette, nb_ventes_12m: 6 }, tFr))).toMatch(/6 (ventes|transactions)/);
    expect(nbsp(introCommune({ ...calmette, nb_ventes_12m: 6 }, trois.prix, tFr))).toMatch(/48 (ventes|transactions)/);
  });
});
