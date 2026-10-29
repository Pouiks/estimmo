import { describe, expect, it } from "vitest";
import {
  dimensionsImage,
  imagesCorps,
  liensBlog,
  modifierImageCorps,
  normaliserHtmlEditeur,
  preparerHtml,
  problemesHtml,
  texteDepuisHtml,
} from "./html";

const tout = { articleEnLigne: () => true, resoudreImage: (src: string) => src };

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
    ['<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>', "balise interdite"],
    ['<base href="https://pirate.test/">', "balise interdite"],
    ['<img src="x" onerror="alert(1)">', "attribut d'événement"],
    ['<iframe srcdoc="&lt;script&gt;"></iframe>', "balise interdite"],
    ['<button formaction="javascript:alert(1)">x</button>', "attribut interdit"],
    ['<a href="javascript:alert(1)">x</a>', "javascript:"],
    ['<a href="java&#115;cript:alert(1)">x</a>', "javascript:"],
    ['<a href="javascript&colon;alert(1)">x</a>', "javascript:"],
    ['<a href="java\tscript:alert(1)">x</a>', "javascript:"],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', "data:"],
    ["<h1>Titre</h1>", "<h1>"],
  ])("refuse %s", (html, motif) => {
    expect(problemesHtml(html).join(" ")).toContain(motif);
  });

  it("ne confond pas une entité ordinaire avec une attaque", () => {
    expect(problemesHtml("<p>L&#x27;acheteur &amp; le vendeur : 300&nbsp;000 €</p>")).toEqual([]);
  });
});

describe("normaliserHtmlEditeur", () => {
  it("enveloppe les tableaux, retire colgroup, colspan/rowspan=1 et blocs vides", () => {
    const tiptap =
      '<p></p><table style="min-width: 50px"><colgroup><col><col></colgroup><tbody><tr><th colspan="1" rowspan="1">A</th><th colspan="2" rowspan="1">B</th></tr></tbody></table><figure class="article-image"><img src="/x.webp" alt="x" width="1200" height="800" loading="lazy"><figcaption></figcaption></figure>';
    expect(normaliserHtmlEditeur(tiptap)).toBe(
      '<div class="table-wrapper"><table><tbody><tr><th>A</th><th colspan="2">B</th></tr></tbody></table></div><figure class="article-image"><img src="/x.webp" alt="x" width="1200" height="800" loading="lazy"></figure>'
    );
  });

  it("est idempotente sur un HTML éditorial déjà conforme", () => {
    const html =
      '<h2>Titre</h2><div class="table-wrapper"><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></div><p>Texte</p>';
    expect(normaliserHtmlEditeur(html)).toBe(html);
    expect(normaliserHtmlEditeur(normaliserHtmlEditeur(html))).toBe(html);
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

  it("préfixe les liens internes dans la langue de la page, ancre conservée", () => {
    const html =
      '<p><a href="/blog/frais-de-notaire#calcul" class="x">guide</a> <a href="/blog/programme">autre</a></p>';
    expect(
      preparerHtml(html, {
        ...tout,
        articleEnLigne: (s) => s === "frais-de-notaire",
        cheminArticle: (s) => `/en/blog/${s}`,
      })
    ).toBe('<p><a href="/en/blog/frais-de-notaire#calcul" class="x">guide</a> autre</p>');
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

  it("remplace le chemin logique par l'URL Storage de l'image envoyée", () => {
    const html = '<img src="/images/blog/a/image-1.webp" alt="A" width="1200" height="800">';
    const url = "https://x.supabase.co/storage/v1/object/public/blog/visuels/a/image-1-abcd1234.webp";
    expect(preparerHtml(html, { ...tout, resoudreImage: () => url })).toBe(
      `<img decoding="async" src="${url}" alt="A" width="1200" height="800">`
    );
  });

  it("remplace une image manquante par un aplat aux mêmes proportions", () => {
    const html =
      '<figure class="article-image"><img src="/images/blog/a/image-1.webp" alt="Rue calme" width="1200" height="800" loading="lazy"><figcaption>Légende</figcaption></figure>';
    expect(preparerHtml(html, { ...tout, resoudreImage: () => null })).toBe(
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

describe("dimensionsImage", () => {
  it("lit width/height du <img> de la source, 1200×800 par défaut", () => {
    const html = '<img src="/a.webp" alt="" width="1200" height="630"><img src="/b.webp" alt="">';
    expect(dimensionsImage(html, "/a.webp")).toEqual({ largeur: 1200, hauteur: 630 });
    expect(dimensionsImage(html, "/b.webp")).toEqual({ largeur: 1200, hauteur: 800 });
    expect(dimensionsImage(html, "/absente.webp")).toEqual({ largeur: 1200, hauteur: 800 });
  });
});

describe("modifierImageCorps", () => {
  const html =
    '<p>Avant</p><figure class="article-image"><img src="/images/blog/a/image-1.webp" alt="Ancien alt" width="1200" height="800" loading="lazy"><figcaption>Ancienne légende</figcaption></figure><p>Après</p>';

  it("remplace l'alt et la légende de l'image visée, en échappant", () => {
    const r = modifierImageCorps(html, "/images/blog/a/image-1.webp", { alt: 'Rue "calme" & verte', legende: "Nouvelle <légende>" });
    expect(r).toBe(
      '<p>Avant</p><figure class="article-image"><img src="/images/blog/a/image-1.webp" alt="Rue &quot;calme&quot; &amp; verte" width="1200" height="800" loading="lazy"><figcaption>Nouvelle &lt;légende></figcaption></figure><p>Après</p>'
    );
  });

  it("retire la figcaption quand la légende est vidée, ajoute un alt absent", () => {
    const sansAlt = '<figure><img src="/x.webp" width="1200" height="800"></figure>';
    expect(modifierImageCorps(sansAlt, "/x.webp", { alt: "Alt", legende: "" })).toBe(
      '<figure><img src="/x.webp" width="1200" height="800" alt="Alt"></figure>'
    );
    expect(modifierImageCorps(html, "/images/blog/a/image-1.webp", { legende: null })).not.toContain("figcaption");
  });

  it("ne touche à rien si la source est absente ou si une autre figure la précède", () => {
    expect(modifierImageCorps(html, "/absente.webp", { alt: "x" })).toBe(html);
    const deux = '<figure><img src="/1.webp" alt="un"><figcaption>L1</figcaption></figure><figure><img src="/2.webp" alt="deux"><figcaption>L2</figcaption></figure>';
    const r = modifierImageCorps(deux, "/2.webp", { alt: "DEUX", legende: "L2 bis" });
    expect(r).toBe('<figure><img src="/1.webp" alt="un"><figcaption>L1</figcaption></figure><figure><img src="/2.webp" alt="DEUX"><figcaption>L2 bis</figcaption></figure>');
  });
});
