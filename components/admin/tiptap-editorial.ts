import { Node } from "@tiptap/core";
import { Image, type ImageOptions } from "@tiptap/extension-image";

/**
 * Nœuds TipTap des blocs éditoriaux du blog (content/blog/articles.json).
 * Chaque nœud lit et réécrit exactement le HTML attendu par le site
 * (classes a-retenir, cta-estimation, article-image), pour que le passage
 * par l'éditeur visuel ne change pas le rendu.
 */

/** Encadré « À retenir » (aside.a-retenir) : plusieurs blocs à l'intérieur. */
export const ARetenir = Node.create({
  name: "aRetenir",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "aside.a-retenir" }],
  renderHTML: () => ["aside", { class: "a-retenir" }, 0],
});

/** Appel à l'action de fin d'article (div.cta-estimation). */
export const CtaEstimation = Node.create({
  name: "ctaEstimation",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "div.cta-estimation" }],
  renderHTML: () => ["div", { class: "cta-estimation" }, 0],
});

/** Légende d'une figure (texte avec gras/italique/lien). */
export const Figcaption = Node.create({
  name: "figcaption",
  content: "inline*",
  parseHTML: () => [{ tag: "figcaption" }],
  renderHTML: () => ["figcaption", 0],
});

/** Image du corps avec sa légende (figure.article-image). */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "image figcaption?",
  draggable: true,
  isolating: true,
  parseHTML: () => [{ tag: "figure" }],
  renderHTML: () => ["figure", { class: "article-image" }, 0],
});

export interface ImageEditorialeOptions extends ImageOptions {
  /**
   * Chemin logique (/images/blog/…) → URL affichable, ou null si l'image
   * n'est pas encore fournie. Sert à l'affichage dans l'éditeur seulement :
   * le HTML enregistré garde le chemin logique.
   */
  resoudre: (src: string) => string | null;
}

/**
 * <img> avec width/height/loading conservés. Dans l'éditeur, une image non
 * fournie s'affiche comme sur le site (aplat aux bonnes proportions).
 */
export const ImageEditoriale = Image.extend<ImageEditorialeOptions>({
  addOptions() {
    const base = this.parent?.() as ImageOptions;
    return { ...base, resoudre: (src: string) => src };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      loading: { default: "lazy" },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const { src, alt, width, height } = node.attrs as {
        src: string;
        alt: string | null;
        width: number | null;
        height: number | null;
      };
      const url = this.options.resoudre(src);
      if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = alt ?? "";
        if (width) img.width = width;
        if (height) img.height = height;
        return { dom: img };
      }
      const aplat = document.createElement("span");
      aplat.className = "image-attente";
      aplat.style.aspectRatio = `${width || 3} / ${height || 2}`;
      aplat.title = `Image à fournir : ${alt ?? src}`;
      return { dom: aplat };
    };
  },
});
