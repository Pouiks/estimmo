import { describe, expect, it } from "vitest";
import { jsonLdAgentImmobilier, jsonLdFilAriane, serialiserJsonLd } from "./json-ld";

describe("serialiserJsonLd", () => {
  it("échappe « < » : une valeur ne peut pas fermer la balise <script>", () => {
    const s = serialiserJsonLd({
      text: 'Fin </script><script>alert(1)</script> <!-- x',
    });
    expect(s).not.toContain("<");
    expect(s).toContain("\\u003c/script>");
  });

  it("reste du JSON valide, équivalent à l'objet d'origine", () => {
    const data = { "@type": "FAQPage", q: "<b>1 < 2</b>", n: 3, u: undefined };
    expect(JSON.parse(serialiserJsonLd(data))).toEqual({
      "@type": "FAQPage",
      q: "<b>1 < 2</b>",
      n: 3,
    });
  });

  it("accepte un tableau (plusieurs blocs dans une seule balise)", () => {
    const s = serialiserJsonLd([{ "@type": "Dataset" }, { "@type": "FAQPage" }]);
    expect(JSON.parse(s)).toHaveLength(2);
  });
});

describe("jsonLdFilAriane", () => {
  it("numérote les positions à partir de 1, dans l'ordre donné", () => {
    const fil = jsonLdFilAriane([
      { nom: "Accueil", url: "https://x.test/" },
      { nom: "Blog", url: "https://x.test/blog" },
      { nom: "Article", url: "https://x.test/blog/a" },
    ]);
    expect(fil["@type"]).toBe("BreadcrumbList");
    expect(fil.itemListElement.map((e) => e.position)).toEqual([1, 2, 3]);
    expect(fil.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Article",
      item: "https://x.test/blog/a",
    });
  });
});

describe("jsonLdAgentImmobilier", () => {
  const base = {
    marque: "ESTIMMO",
    url: "https://x.test/prix-immobilier/nice-06000",
    telephone: "+33611118469",
    email: "a@b.fr",
    priceRange: "Honoraires à partir de 3 % en mandat exclusif",
    agent: { nom: "Carenza Brown", jobTitle: "Conseillère immobilière" },
    service: "Estimation immobilière gratuite en ligne",
  };

  it("RealEstateAgent complet, zone France par défaut", () => {
    const agent = jsonLdAgentImmobilier(base);
    expect(agent["@type"]).toBe("RealEstateAgent");
    expect(agent.areaServed).toEqual({ "@type": "Country", name: "France" });
    expect(agent.employee).toEqual({ "@type": "Person", name: "Carenza Brown", jobTitle: "Conseillère immobilière" });
    expect(agent.makesOffer.itemOffered.name).toBe(base.service);
    expect(agent.makesOffer.price).toBe("0");
    // Champs exigés par Google pour un LocalBusiness : name, address ou url, telephone.
    for (const cle of ["name", "url", "telephone", "priceRange"]) expect(agent).toHaveProperty(cle);
  });

  it("zone : une commune (pages communes)", () => {
    expect(jsonLdAgentImmobilier({ ...base, zone: { type: "City", nom: "Nice" } }).areaServed).toEqual({
      "@type": "City",
      name: "Nice",
    });
  });
});
