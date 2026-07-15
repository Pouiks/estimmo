/**
 * Gabarits de contenu des pages communes - plusieurs structures de phrases
 * choisies de façon déterministe (hash du code INSEE) pour éviter le
 * duplicate content massif entre les ~35 000 pages.
 */
import type { CommuneStats, LoyersCommuneRow } from "./communes";

export const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export function variante(codeInsee: string, nb: number): number {
  let hash = 0;
  for (const c of codeInsee) hash = (hash * 31 + c.charCodeAt(0)) % 997;
  return hash % nb;
}

export function introCommune(stats: CommuneStats): string {
  const { nom_commune: nom, nb_ventes_12m: ventes } = stats;
  const appart = stats.prix_m2_median_appartement;
  const maison = stats.prix_m2_median_maison;
  const v = variante(stats.code_insee, 3);

  if (!appart && !maison) {
    return (
      `À ${nom}, les transactions immobilières ne sont pas publiées dans la base DVF ` +
      `(régime du Livre foncier en Alsace-Moselle, ou volume de ventes insuffisant). ` +
      `Vous trouverez ci-dessous les loyers de référence observés, et notre équipe réalise ` +
      `gratuitement une estimation personnalisée de votre bien sur simple demande.`
    );
  }

  const prixTexte = [
    appart ? `${euro(appart)}/m² pour un appartement` : null,
    maison ? `${euro(maison)}/m² pour une maison` : null,
  ]
    .filter(Boolean)
    .join(" et ");

  if (v === 0) {
    return (
      `Le marché immobilier de ${nom} affiche un prix médian de ${prixTexte}, ` +
      `calculé à partir des ventes réellement enregistrées par les services de l'État (base DVF). ` +
      `Sur les douze derniers mois de données publiées, ${ventes.toLocaleString("fr-FR")} vente(s) ` +
      `ont été analysées sur la commune.`
    );
  }
  if (v === 1) {
    return (
      `Combien vaut un bien à ${nom} ? Les actes de vente enregistrés par la DGFiP (base DVF) ` +
      `font ressortir une valeur médiane de ${prixTexte}. ` +
      `Ce niveau de prix s'appuie sur ${ventes.toLocaleString("fr-FR")} transaction(s) ` +
      `observées en douze mois sur la commune.`
    );
  }
  return (
    `À ${nom}, les ventes immobilières officiellement enregistrées ces douze derniers mois - ` +
    `${ventes.toLocaleString("fr-FR")} au total - établissent le prix médian à ${prixTexte}. ` +
    `Ces chiffres proviennent des données publiques DVF, les mêmes que celles utilisées ` +
    `par les notaires et les professionnels.`
  );
}

export function evolutionTexte(stats: CommuneStats): string | null {
  const evo = stats.evolution_1an_pct;
  if (evo === null || stats.nb_ventes_12m < 10) return null;
  const nom = stats.nom_commune;
  const v = variante(stats.code_insee, 2);

  if (Math.abs(Number(evo)) < 0.5) {
    return v === 0
      ? `Les prix sont globalement stables à ${nom} sur un an (${formatEvo(evo)}).`
      : `Sur douze mois, le marché de ${nom} reste stable (${formatEvo(evo)}).`;
  }
  const hausse = Number(evo) > 0;
  return v === 0
    ? `Sur un an, les prix au m² ${hausse ? "progressent" : "reculent"} de ${formatEvo(evo)} à ${nom}.`
    : `La tendance annuelle est ${hausse ? "à la hausse" : "à la baisse"} : ${formatEvo(evo)} par rapport aux douze mois précédents.`;
}

export function formatEvo(evo: number | null): string {
  if (evo === null) return "n.d.";
  const n = Number(evo);
  return `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR")} %`;
}

export interface FaqEntry {
  question: string;
  reponse: string;
}

export function faqCommune(
  stats: CommuneStats,
  loyers: LoyersCommuneRow | null,
  annee: number
): FaqEntry[] {
  const nom = stats.nom_commune;
  const faq: FaqEntry[] = [];

  if (stats.prix_m2_median_appartement) {
    faq.push({
      question: `Quel est le prix au m² d'un appartement à ${nom} en ${annee} ?`,
      reponse:
        `Le prix médian d'un appartement à ${nom} est de ${euro(stats.prix_m2_median_appartement)}/m², ` +
        `d'après les ventes enregistrées dans la base DVF sur les douze derniers mois de données publiées. ` +
        `Selon l'état, l'étage et les prestations, la valeur réelle d'un bien peut s'écarter sensiblement de cette médiane.`,
    });
  }
  if (stats.prix_m2_median_maison) {
    faq.push({
      question: `Quel est le prix au m² d'une maison à ${nom} ?`,
      reponse:
        `Les maisons se vendent en médiane ${euro(stats.prix_m2_median_maison)}/m² à ${nom}. ` +
        `La surface du terrain, l'état général et la localisation précise font varier ce prix de façon importante.`,
    });
  }
  if (loyers?.loyer_m2_appartement) {
    faq.push({
      question: `Quel loyer pour un appartement à ${nom} ?`,
      reponse:
        `Le loyer d'annonce moyen constaté est d'environ ${loyers.loyer_m2_appartement.toLocaleString("fr-FR")} €/m² ` +
        `charges comprises (estimations ANIL ${loyers.millesime}, à partir des données du Groupe SeLoger et de leboncoin). ` +
        `Pour un T2 de 45 m², cela représente un loyer de l'ordre de ${euro(Math.round((loyers.loyer_m2_appt_t1_t2 ?? loyers.loyer_m2_appartement) * 45))} par mois.`,
    });
  }
  faq.push({
    question: `Comment obtenir une estimation précise de mon bien à ${nom} ?`,
    reponse:
      `Utilisez notre estimateur en ligne gratuit : il compare votre bien aux ventes réelles de votre quartier ` +
      `et vous donne une fourchette immédiate. Pour un avis de valeur précis, une visite reste indispensable - ` +
      `votre conseillère locale vous rappelle gratuitement.`,
  });

  return faq.slice(0, 4);
}
