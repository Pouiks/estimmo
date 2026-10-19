import { describe, expect, it } from "vitest";
import { imagesCorps, liensBlog, preparerHtml, problemesHtml, texteDepuisHtml } from "./html";

const tout = { articleEnLigne: () => true, imageDisponible: () => true };

describe("problemesHtml", () => {
  it("accepte le HTML éditorial attendu", () => {
    const html =
      '<p>Texte <a href="/estimation">lien</a></p><aside class="a-retenir"><ul><li>x</li></ul></aside>' +
      '<figure class="article-image"><img src="/images/blog/a/image-1.webp" alt="A" width="1200" height="800" loading="lazy"></figure>' +
      '<div class="table-wrapper"><table><tr><td>1</td></tr></table></div>';
    expect(problemesHtml(html)).toEqual([]);
  });

  it.each([
    ["<script>alert(1)</script>", "balise interdite"],
    ['<iframe src="x"></iframe>', "balise interdite"],
    ['<img src="x" onerror="alert(1)">', "attribut d'événement"],
    ['<a href="javascript:alert(1)">x</a>', "javascript:"],
    ["<h1>Titre</h1>", "<h1>"],
  ])("refuse %s", (html, motif) => {
    expect(problemesHtml(html).join(" ")).toContain(motif);
  });
});

describe("liensBlog / imagesCorps", () => {
  it("extrait les slugs cités et les sources d'images", () => {
    const html =
      '<a href="/blog/frais-de-notaire-calcul">a</a> <a href="/blog/home-staging#x">b</a> <a href="/prix-immobilier">c</a>' +
      '<img src="/images/blog/s/image-1.webp" alt="x">';
    expect(liensBlog(html)).toEqual(["frais-de-notaire-calcul", "home-staging"]);
    expect(imagesCorps(html)).toEqual(["/images/blog/s/image-1.webp"]);
  });
});

describe("preparerHtml", () => {
  it("garde les liens vers les articles en ligne et les autres pages du site", () => {
    const html = '<p>Voir <a href="/blog/en-ligne">cet article</a> et <a href="/estimation">l\'estimation</a>.</p>';
    expect(preparerHtml(html, { ...tout, articleEnLigne: (s) => s === "en-ligne" })).toBe(html);
  });

  it("transforme en texte simple un lien vers un article programmé (pas de 404)", () => {
    const html = '<p>Voir <a href="/blog/futur">notre guide <strong>complet</strong></a>.</p>';
    expect(preparerHtml(html, { ...tout, articleEnLigne: () => false })).toBe(
      "<p>Voir notre guide <strong>complet</strong>.</p>"
    );
  });

  it("ajoute decoding=async aux images livrées", () => {
    const html = '<img src="/images/blog/a/image-1.webp" alt="A" width="1200" height="800" loading="lazy">';
    expect(preparerHtml(html, tout)).toBe(
      '<img decoding="async" src="/images/blog/a/image-1.webp" alt="A" width="1200" height="800" loading="lazy">'
    );
  });

  it("remplace une image manquante par un aplat aux mêmes proportions", () => {
    const html =
      '<figure class="article-image"><img src="/images/blog/a/image-1.webp" alt="Rue calme" width="1200" height="800" loading="lazy"><figcaption>Légende</figcaption></figure>';
    expect(preparerHtml(html, { ...tout, imageDisponible: () => false })).toBe(
      '<figure class="article-image"><span class="image-attente" role="img" aria-label="Rue calme" style="aspect-ratio:1200/800"></span><figcaption>Légende</figcaption></figure>'
    );
  });
});

describe("texteDepuisHtml", () => {
  it("retire balises, encadrés et figures, décode les entités et tronque", () => {
    const html =
      '<p>L&#x27;acheteur &amp; le vendeur</p><aside class="a-retenir"><p>À retenir</p></aside><figure><figcaption>Légende</figcaption></figure><p>Suite du texte.</p>';
    expect(texteDepuisHtml(html)).toBe("L'acheteur & le vendeur Suite du texte.");
    expect(texteDepuisHtml("<p>abcdefghij</p>", 6)).toBe("abcde…");
  });
});
