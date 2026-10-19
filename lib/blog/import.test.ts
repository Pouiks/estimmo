import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { controlerArticles, versLigne } from "./import";

const fichier = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../../content/blog/articles.json"), "utf8")
) as Record<string, unknown>[];

describe("content/blog/articles.json", () => {
  it("passe tous les contrôles d'import (schéma, slugs, liens, HTML)", () => {
    const { articles, erreurs, avertissements } = controlerArticles(fichier);
    expect(erreurs).toEqual([]);
    expect(avertissements).toEqual([]);
    expect(articles).toHaveLength(fichier.length);
  });

  it("respecte la structure commune : encadré, appel à l'action, FAQ, 3 articles liés", () => {
    const { articles } = controlerArticles(fichier);
    for (const a of articles) {
      expect(a.contentHtml, a.slug).toContain('<aside class="a-retenir">');
      expect(a.contentHtml, a.slug).toContain('<div class="cta-estimation">');
      expect(a.faq.length, a.slug).toBeGreaterThan(0);
      expect(a.relatedSlugs, a.slug).toHaveLength(3);
    }
  });
});

describe("controlerArticles", () => {
  const base = fichier[0];

  it("refuse un fichier qui n'est pas un tableau", () => {
    expect(controlerArticles({}).erreurs).toHaveLength(1);
  });

  it("signale slug en double, HTML interdit et champ manquant", () => {
    const { erreurs } = controlerArticles([
      base,
      base,
      { ...base, slug: "autre", contentHtml: `${base.contentHtml as string}<script>x</script>` },
      { ...base, slug: "sans-titre", title: undefined },
    ]);
    expect(erreurs.join("\n")).toMatch(/slug en double/);
    expect(erreurs.join("\n")).toMatch(/autre : balise interdite/);
    expect(erreurs.join("\n")).toMatch(/sans-titre : title/);
  });

  it("avertit d'un lien interne vers un article inconnu", () => {
    const { avertissements } = controlerArticles([base]);
    expect(avertissements.some((a) => a.includes("article inconnu du fichier"))).toBe(true);
  });
});

describe("versLigne", () => {
  it("projette le format JSON sur les colonnes de la table articles", () => {
    const { articles } = controlerArticles(fichier);
    const ligne = versLigne(articles[0]);
    expect(ligne).toMatchObject({
      slug: "criteres-valeur-bien-immobilier",
      lang: "fr",
      categorie: "estimation",
      auteur: "Carenza Brown",
      image_cover: "/images/blog/criteres-valeur-bien-immobilier/cover.webp",
      image_cover_largeur: 1200,
      image_cover_hauteur: 630,
    });
    expect(ligne.articles_lies).toHaveLength(3);
  });
});
