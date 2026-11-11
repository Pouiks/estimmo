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

export interface AgentImmobilierJsonLd {
  /** Nom de la marque (SITE.name). */
  marque: string;
  /** URL de la page ou du site. */
  url: string;
  telephone: string;
  email: string;
  /** Texte libre affiché comme fourchette d'honoraires. */
  priceRange: string;
  agent: { nom: string; jobTitle: string };
  /** Libellé du service gratuit proposé (estimation en ligne). */
  service: string;
  /** Zone desservie : la France par défaut, ou une commune précise. */
  zone?: { type: "Country" | "City"; nom: string };
}

/** `RealEstateAgent` schema.org : marque, conseillère, service d'estimation gratuit. */
export function jsonLdAgentImmobilier(p: AgentImmobilierJsonLd) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: p.marque,
    url: p.url,
    telephone: p.telephone,
    email: p.email,
    priceRange: p.priceRange,
    areaServed: { "@type": p.zone?.type ?? "Country", name: p.zone?.nom ?? "France" },
    employee: { "@type": "Person", name: p.agent.nom, jobTitle: p.agent.jobTitle },
    makesOffer: {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: p.service },
      price: "0",
      priceCurrency: "EUR",
    },
  };
}
