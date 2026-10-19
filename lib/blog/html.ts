/**
 * Corps HTML des articles éditoriaux (import JSON) : contrôle à l'entrée,
 * ajustements au rendu. Fonctions pures, testées.
 *
 * Le HTML est de confiance (rédigé par l'éditrice, saisi par un admin), mais
 * on refuse tout ce qui exécuterait du code ou casserait la structure SEO
 * de la page (un seul <h1>, porté par le titre).
 */

const INTERDITS: { motif: RegExp; message: string }[] = [
  { motif: /<\s*(script|iframe|object|embed|style|link|meta|form)\b/i, message: "balise interdite (script, iframe, style, form…)" },
  { motif: /\son[a-z]+\s*=/i, message: "attribut d'événement interdit (onclick, onerror…)" },
  { motif: /(href|src)\s*=\s*["']?\s*javascript:/i, message: "URL javascript: interdite" },
  { motif: /<\s*h1\b/i, message: "<h1> interdit dans le corps (le titre de la page est le seul h1)" },
];

/** Problèmes bloquants d'un corps d'article ; tableau vide = accepté. */
export function problemesHtml(html: string): string[] {
  return INTERDITS.filter(({ motif }) => motif.test(html)).map((i) => i.message);
}

/** Slugs des articles du blog cités dans les liens internes du corps. */
export function liensBlog(html: string): string[] {
  const slugs = new Set<string>();
  for (const m of html.matchAll(/href="\/blog\/([a-z0-9-]+)\/?(?:#[^"]*)?"/g)) {
    slugs.add(m[1]);
  }
  return [...slugs];
}

/** Sources des images du corps (<img src>). */
export function imagesCorps(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
}

function attribut(balise: string, nom: string): string | undefined {
  return balise.match(new RegExp(`\\s${nom}="([^"]*)"`))?.[1];
}

export interface OptionsRendu {
  /** Un lien vers /blog/<slug> n'est gardé que si l'article est en ligne. */
  articleEnLigne: (slug: string) => boolean;
  /** Les images pas encore livrées sont remplacées par un aplat neutre. */
  imageDisponible: (src: string) => boolean;
}

/**
 * Prépare le corps pour l'affichage :
 *  - un lien vers un article programmé (pas encore en ligne) devient du texte
 *    simple, sans quoi il mènerait à une 404 ; il redevient un lien quand sa
 *    cible est publiée (le cron revalide tous les articles) ;
 *  - une image absente de public/ devient un bloc neutre aux bonnes
 *    proportions (pas d'image cassée ni de décalage de mise en page).
 */
export function preparerHtml(html: string, options: OptionsRendu): string {
  const avecLiens = html.replace(
    /<a\s+href="\/blog\/([a-z0-9-]+)\/?(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g,
    (lien, slug: string, texte: string) =>
      options.articleEnLigne(slug) ? lien : texte
  );

  return avecLiens.replace(/<img\b[^>]*>/g, (balise) => {
    const src = attribut(balise, "src");
    if (src && options.imageDisponible(src)) {
      return /\sdecoding=/.test(balise)
        ? balise
        : balise.replace(/<img\b/, '<img decoding="async"');
    }
    const largeur = Number(attribut(balise, "width")) || 3;
    const hauteur = Number(attribut(balise, "height")) || 2;
    const alt = attribut(balise, "alt") ?? "";
    return `<span class="image-attente" role="img" aria-label="${alt}" style="aspect-ratio:${largeur}/${hauteur}"></span>`;
  });
}

/** Texte brut d'un fragment HTML (extraits, descriptions de secours). */
export function texteDepuisHtml(html: string, max = 160): string {
  const texte = html
    .replace(/<aside[\s\S]*?<\/aside>/g, " ")
    .replace(/<figure[\s\S]*?<\/figure>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return texte.length <= max ? texte : `${texte.slice(0, max - 1).trimEnd()}…`;
}
