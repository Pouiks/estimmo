import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import fr from "@/messages/fr";
import { formats } from "@/lib/i18n/formats";
import type { CommuneStats, LoyersCommuneRow } from "./communes";
import {
  evolutionTexte,
  faqCommune,
  formatEvo,
  introCommune,
  prixTexte,
  variante,
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
};

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
    expect(nbsp(prixTexte(nice, tFr)!)).toBe(
      "4 500 €/m² pour un appartement et 6 200 €/m² pour une maison"
    );
  });
  it("appartement seul, en anglais", () => {
    expect(prixTexte({ ...nice, prix_m2_median_maison: null }, tEn)).toBe(
      "€4,500/m² for a flat"
    );
  });
  it("null sans aucun prix", () => {
    expect(
      prixTexte({ ...nice, prix_m2_median_appartement: null, prix_m2_median_maison: null }, tFr)
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
      return nbsp(introCommune({ ...nice, code_insee: code }, tFr));
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
    expect(introCommune({ ...nice, code_insee: code, nb_ventes_12m: 1 }, tFr)).toContain(
      "1 vente a été analysée"
    );
    expect(introCommune({ ...nice, code_insee: code, nb_ventes_12m: 0 }, tFr)).toContain(
      "aucune vente n'a été analysée"
    );
  });

  it("texte sans ventes (Alsace-Moselle) dans les deux langues", () => {
    const sansVentes = { ...nice, nom_commune: "Strasbourg", prix_m2_median_appartement: null, prix_m2_median_maison: null };
    expect(introCommune(sansVentes, tFr)).toContain("Livre foncier en Alsace-Moselle");
    expect(introCommune(sansVentes, tEn)).toContain("Livre foncier regime in Alsace-Moselle");
  });

  it("variante anglaise équivalente", () => {
    expect(introCommune(nice, tEn)).toMatch(/Nice/);
    expect(introCommune(nice, tEn)).toMatch(/1,234/);
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
