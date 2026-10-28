/**
 * Corps HTML des articles éditoriaux (import JSON) : contrôle à l'entrée,
 * ajustements au rendu. Fonctions pures, testées.
 *
 * Le HTML est de confiance (rédigé par l'éditrice, saisi par un admin), mais
 * on refuse tout ce qui exécuterait du code ou casserait la structure SEO
 * de la page (un seul <h1>, porté par le titre).
 */

const INTERDITS: { motif: RegExp; message: string }[] = [
  {
    motif: /<\s*(script|iframe|object|embed|style|link|meta|form|base|svg|math|template)\b/i,
    message: "balise interdite (script, iframe, style, form, svg…)",
  },
  { motif: /\son[a-z]+\s*=/i, message: "attribut d'événement interdit (onclick, onerror…)" },
  { motif: /\s(srcdoc|formaction)\s*=/i, message: "attribut interdit (srcdoc, formaction)" },
  {
    motif: /(href|src|action|xlink:href|data)\s*=\s*["']?\s*(javascript|vbscript|data)\s*:/i,
    message: "URL javascript:/data: interdite",
  },
  { motif: /<\s*h1\b/i, message: "<h1> interdit dans le corps (le titre de la page est le seul h1)" },
];

const ENTITES: Record<string, string> = { colon: ":", tab: "\t", newline: "\n", lt: "<", gt: ">", quot: '"', amp: "&", sol: "/" };

/**
 * Forme sous laquelle le navigateur lira le HTML : entités décodées
 * (« java&#115;cript: », « &colon; ») et caractères de contrôle retirés
 * (« java\tscript: »). Sert uniquement aux contrôles, jamais au rendu.
 */
function formeNavigateur(html: string): string {
  return html
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, nom: string) => ENTITES[nom.toLowerCase()] ?? m)
    .replace(/[\x00-\x1f]/g, "");
}

/**
 * Problèmes bloquants d'un corps d'article ; tableau vide = accepté.
 * Le HTML est rédigé par un admin authentifié (contenu de confiance) : ce
 * filtre bloque ce qui exécuterait du code ou casserait la page, testé sur
 * la forme brute et sur la forme décodée.
 */
export function problemesHtml(html: string): string[] {
  const formes = [html, formeNavigateur(html)];
  return INTERDITS.filter(({ motif }) => formes.some((f) => motif.test(f))).map((i) => i.message);
}

/**
 * HTML produit par l'éditeur visuel (TipTap) → forme éditoriale : tableaux
 * enveloppés dans div.table-wrapper (défilement mobile), attributs
 * techniques et blocs vides retirés. Idempotent sur un HTML déjà conforme.
 */
export function normaliserHtmlEditeur(html: string): string {
  return html
    .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, "")
    .replace(/<table\s[^>]*>/g, "<table>")
    .replace(/\s(colspan|rowspan)="1"/g, "")
    .replace(/<div class="table-wrapper">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/g, "$1")
    .replace(/<table[\s\S]*?<\/table>/g, (table) => `<div class="table-wrapper">${table}</div>`)
    .replace(/<figcaption><\/figcaption>/g, "")
    .replace(/<p><\/p>/g, "")
    .trim();
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
  /**
   * Slug d'un article d'une autre langue → slug de sa version dans la langue
   * de la page (corps copié depuis l'original lors d'une traduction).
   */
  traduireSlug?: (slug: string) => string | undefined;
  /** Chemin public d'un article dans la langue de la page (« /en/blog/<slug> »). */
  cheminArticle?: (slug: string) => string;
  /**
   * URL à afficher pour un chemin d'image du corps (Storage, public/) ;
   * null = pas encore livrée → aplat neutre.
   */
  resoudreImage: (src: string) => string | null;
}

/**
 * Prépare le corps pour l'affichage :
 *  - un lien vers un article programmé (pas encore en ligne) devient du texte
 *    simple, sans quoi il mènerait à une 404 ; il redevient un lien quand sa
 *    cible est publiée (le cron revalide tous les articles) ;
 *  - un lien vers l'original français, dans une version traduite, pointe vers
 *    la traduction de sa cible quand elle est en ligne (sinon texte simple) ;
 *  - le chemin logique d'une image est remplacé par son URL (Storage ou
 *    public/) ; une image pas encore livrée devient un bloc neutre aux bonnes
 *    proportions (pas d'image cassée ni de décalage de mise en page).
 */
export function preparerHtml(html: string, options: OptionsRendu): string {
  const avecLiens = html.replace(
    /<a\s+href="\/blog\/([a-z0-9-]+)\/?(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g,
    (lien, slug: string, ancre: string | undefined, attributs: string, texte: string) => {
      const cible = options.articleEnLigne(slug) ? slug : options.traduireSlug?.(slug);
      if (!cible || !options.articleEnLigne(cible)) return texte;
      if (cible === slug && !options.cheminArticle) return lien;
      const chemin = options.cheminArticle?.(cible) ?? `/blog/${cible}`;
      return `<a href="${chemin}${ancre ?? ""}"${attributs}>${texte}</a>`;
    }
  );

  return avecLiens.replace(/<img\b[^>]*>/g, (balise) => {
    const src = attribut(balise, "src");
    const url = src ? options.resoudreImage(src) : null;
    if (url) {
      const resolue = balise.replace(/\ssrc="[^"]*"/, ` src="${url.replace(/"/g, "&quot;")}"`);
      return /\sdecoding=/.test(resolue)
        ? resolue
        : resolue.replace(/<img\b/, '<img decoding="async"');
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

/** Dimensions déclarées par le <img> d'une source dans le corps (défaut 1200×800). */
export function dimensionsImage(html: string, src: string): { largeur: number; hauteur: number } {
  const balise = [...html.matchAll(/<img\b[^>]*>/g)]
    .map((m) => m[0])
    .find((b) => attribut(b, "src") === src);
  return {
    largeur: Number(balise && attribut(balise, "width")) || 1200,
    hauteur: Number(balise && attribut(balise, "height")) || 800,
  };
}

function echapperAttribut(valeur: string): string {
  return valeur.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Met à jour l'alt du <img> d'une source et, si la balise est dans une
 * <figure>, le texte de sa <figcaption> (légende vide = figcaption retirée).
 * Renvoie le HTML inchangé si la source n'y figure pas.
 */
export function modifierImageCorps(
  html: string,
  src: string,
  champs: { alt?: string; legende?: string | null }
): string {
  const cible = [...html.matchAll(/<img\b[^>]*>/g)].find((m) => attribut(m[0], "src") === src);
  if (!cible) return html;
  const debut = cible.index;
  let balise = cible[0];

  if (champs.alt !== undefined) {
    const alt = ` alt="${echapperAttribut(champs.alt)}"`;
    balise = /\salt="[^"]*"/.test(balise)
      ? balise.replace(/\salt="[^"]*"/, alt)
      : balise.replace(/\s*\/?>$/, (fin) => `${alt}${fin}`);
  }
  let resultat = html.slice(0, debut) + balise + html.slice(debut + cible[0].length);

  if (champs.legende !== undefined) {
    // <figure> englobante : la dernière ouverte avant l'image, fermée après elle.
    const ouverture = resultat.lastIndexOf("<figure", debut);
    const fermeture = resultat.indexOf("</figure>", debut);
    const englobe =
      ouverture !== -1 && fermeture !== -1 && resultat.indexOf("</figure>", ouverture) === fermeture;
    if (englobe) {
      let figure = resultat.slice(ouverture, fermeture).replace(/<figcaption>[\s\S]*?<\/figcaption>/, "");
      if (champs.legende) figure += `<figcaption>${echapperAttribut(champs.legende)}</figcaption>`;
      resultat = resultat.slice(0, ouverture) + figure + resultat.slice(fermeture);
    }
  }
  return resultat;
}
