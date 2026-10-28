/**
 * JSON-LD : sérialisation sûre et constructeurs partagés par les pages du site.
 *
 * `JSON.stringify` n'échappe pas « < » : une valeur contenant `</script>`
 * (réponse de FAQ saisie dans l'admin, surcharge de traduction, titre
 * d'article…) fermerait la balise et casserait la page. On remplace donc
 * chaque « < » par son équivalent Unicode, que tout parseur JSON décode
 * (recommandation du guide Next.js « JSON-LD »).
 */
export function serialiserJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type ElementFilAriane = {
  /** Libellé affiché, identique à celui du fil d'Ariane visible. */
  nom: string;
  /** URL absolue de l'élément (`urlAbsolue`). */
  url: string;
};

/** `BreadcrumbList` schema.org : doit refléter le fil d'Ariane visible. */
export function jsonLdFilAriane(elements: ElementFilAriane[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: e.url,
    })),
  };
}
