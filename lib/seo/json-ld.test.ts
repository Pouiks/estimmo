import { describe, expect, it } from "vitest";
import { jsonLdFilAriane, serialiserJsonLd } from "./json-ld";

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
