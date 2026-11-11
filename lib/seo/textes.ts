/**
 * Textes des pages communes - rédigés à partir des faits de la commune
 * (lib/seo/analyse.ts) : chaque phrase dépend des chiffres (hausse ou
 * baisse, peu ou beaucoup de ventes, plus chère ou moins chère que les
 * voisines…) et, à conditions égales, plusieurs structures de phrases sont
 * choisies de façon déterministe (hash du code INSEE) pour éviter le
 * duplicate content entre les ~35 000 pages. Les phrases vivent dans
 * messages/<locale>/commune.json (namespace `commune`) ; ce module ne fait
 * que choisir la variante et passer les valeurs.
 */
import type { useTranslations } from "next-intl";
import type { Faits, PrixAffiches, StatsCommune, TypeLocal } from "./analyse";
import { evolutionAffichable, SEUIL_EVOLUTION } from "./analyse";
import type { LoyersCommuneRow } from "./communes";

export { evolutionAffichable, SEUIL_EVOLUTION };

/** Traducteur du namespace `commune` (useTranslations / getTranslations). */
export type TraducteurCommune = ReturnType<typeof useTranslations<"commune">>;

export function variante(codeInsee: string, nb: number): number {
  let hash = 0;
  for (const c of codeInsee) hash = (hash * 31 + c.charCodeAt(0)) % 997;
  return hash % nb;
}

const INTROS = ["intro.v0", "intro.v1", "intro.v2"] as const;
const STABLES = ["evolution.stableV0", "evolution.stableV1"] as const;
const TENDANCES = ["evolution.tendanceV0", "evolution.tendanceV1"] as const;
const VOLUMES = {
  faible: ["marche.volumeFaibleV0", "marche.volumeFaibleV1"],
  moyen: ["marche.volumeMoyenV0", "marche.volumeMoyenV1"],
  fort: ["marche.volumeFortV0", "marche.volumeFortV1"],
} as const;
const LONGUES = ["marche.longueV0", "marche.longueV1"] as const;
const POSITIONS = ["voisines.positionV0", "voisines.positionV1"] as const;

/** « 4 500 €/m² pour un appartement et 6 200 €/m² pour une maison » */
export function prixTexte(
  prix: Pick<PrixAffiches, "appart" | "maison">,
  t: TraducteurCommune
): string | null {
  const { appart, maison } = prix;
  if (appart && maison) return t("prix.deux", { appart, maison });
  if (appart) return t("prix.appart", { appart });
  if (maison) return t("prix.maison", { maison });
  return null;
}

export function introCommune(
  stats: StatsCommune,
  prix: PrixAffiches,
  t: TraducteurCommune
): string {
  const nom = stats.nom_commune;
  const texte = prixTexte(prix, t);
  if (!texte) return t("intro.sansVentes", { nom });
  const cle = INTROS[variante(stats.code_insee, INTROS.length)];
  return t(cle, { nom, prix: texte, ventes: prix.ventes, fenetre: prix.fenetre });
}

/** « +3,2 % » ; `na` = libellé « n.d. » traduit (common.na). */
export function formatEvo(
  evo: number | null,
  t: TraducteurCommune,
  na: string
): string {
  if (evo === null) return na;
  return t("evolution.valeur", { evo: Number(evo) });
}

/** « 15,2 % » (écart sans signe). */
function pct(valeur: number, t: TraducteurCommune): string {
  return t("voisines.pct", { v: Math.abs(valeur) });
}

export function evolutionTexte(
  stats: StatsCommune,
  t: TraducteurCommune,
  na: string
): string | null {
  if (!evolutionAffichable(stats)) return null;
  const evoNum = Number(stats.evolution_1an_pct);
  const nom = stats.nom_commune;
  const evo = formatEvo(evoNum, t, na);
  const v = variante(stats.code_insee, 2);

  if (Math.abs(evoNum) < 0.5) return t(STABLES[v], { nom, evo });
  return t(TENDANCES[v], { nom, evo, hausse: String(evoNum > 0) });
}

/** Phrase sur le volume de ventes (faible, moyen, fort). */
export function volumeTexte(stats: StatsCommune, faits: Faits, t: TraducteurCommune): string | null {
  if (faits.prix.ventes === 0) return null;
  const cles = VOLUMES[faits.volume];
  const cle = cles[variante(stats.code_insee, cles.length)];
  return t(cle, { nom: stats.nom_commune, ventes: faits.prix.ventes, fenetre: faits.prix.fenetre });
}

/** Phrase sur l'évolution longue (séries annuelles). */
export function evolutionLongueTexte(
  stats: StatsCommune,
  faits: Faits,
  t: TraducteurCommune,
  na: string
): string | null {
  const longue = faits.evolutionLongue;
  if (!longue || !faits.typeReference) return null;
  const cle = LONGUES[(variante(stats.code_insee, 2) + 1) % LONGUES.length];
  return t(cle, {
    nom: stats.nom_commune,
    type: faits.typeReference,
    hausse: String(longue.pct > 0),
    evo: formatEvo(longue.pct, t, na),
    depuis: String(longue.depuis),
    jusqua: String(longue.jusqua),
  });
}

/** Phrase de comparaison avec les communes voisines. */
export function voisinesTexte(stats: StatsCommune, faits: Faits, t: TraducteurCommune): string | null {
  if (!faits.positionVoisines || !faits.prixReference || !faits.medianeVoisines || !faits.typeReference) {
    return null;
  }
  const cle = POSITIONS[variante(stats.code_insee, POSITIONS.length)];
  return t(cle, {
    nom: stats.nom_commune,
    position: faits.positionVoisines,
    prix: faits.prixReference,
    mediane: faits.medianeVoisines,
    n: faits.nbVoisinesComparees,
    ecart: pct(faits.ecartVoisinesPct ?? 0, t),
    type: faits.typeReference,
  });
}

/** Phrase de comparaison avec le département. */
export function departementTexte(
  stats: StatsCommune,
  faits: Faits,
  nomDepartement: string,
  t: TraducteurCommune
): string | null {
  if (!faits.positionDepartement || !faits.prixReference || !faits.prixDepartement || !faits.typeReference) {
    return null;
  }
  return t("voisines.departement", {
    nom: stats.nom_commune,
    departement: nomDepartement,
    position: faits.positionDepartement,
    prixDept: faits.prixDepartement,
    ecart: pct(faits.ecartDepartementPct ?? 0, t),
    type: faits.typeReference,
  });
}

/** Phrases « en bref » (INSEE) : population, logements, propriétaires, dominante. */
export function brefTextes(stats: StatsCommune, faits: Faits, t: TraducteurCommune): string[] {
  const i = faits.insee;
  if (!i) return [];
  const nom = stats.nom_commune;
  const phrases: string[] = [];
  if (i.population) phrases.push(t("bref.population", { nom, population: i.population }));
  if (i.logements && i.partMaisons !== null && i.partAppartements !== null) {
    phrases.push(
      t("bref.logements", {
        logements: i.logements,
        partMaisons: i.partMaisons,
        partAppartements: i.partAppartements,
      })
    );
  }
  if (i.partProprietaires !== null) {
    phrases.push(t("bref.proprietaires", { partProprietaires: i.partProprietaires }));
  }
  if (i.dominante) phrases.push(t("bref.dominante", { dominante: i.dominante }));
  return phrases;
}

export interface FaqEntry {
  question: string;
  reponse: string;
}

export const FAQ_MAX = 5;

/**
 * FAQ de 3 à 5 questions dont les réponses reprennent les chiffres de la
 * commune : prix appartement, prix maison, tendance, voisines, loyer, puis
 * comment estimer. Ordre de priorité fixe, plafond de 5.
 */
export function faqCommune(
  stats: StatsCommune,
  loyers: LoyersCommuneRow | null,
  annee: number,
  t: TraducteurCommune,
  faits?: Faits
): FaqEntry[] {
  const nom = stats.nom_commune;
  const prix: PrixAffiches = faits?.prix ?? {
    fenetre: "12m",
    ventes: stats.nb_ventes_12m,
    appart: stats.prix_m2_median_appartement,
    maison: stats.prix_m2_median_maison,
  };
  const faq: FaqEntry[] = [];

  if (prix.appart) {
    faq.push({
      question: t("faq.appart.question", { nom, annee: String(annee) }),
      reponse: t("faq.appart.reponse", { nom, prix: prix.appart, fenetre: prix.fenetre }),
    });
  }
  if (prix.maison) {
    faq.push({
      question: t("faq.maison.question", { nom }),
      reponse: t("faq.maison.reponse", { nom, prix: prix.maison, fenetre: prix.fenetre }),
    });
  }
  if (faits?.tendance && faits.evolution1an !== null) {
    const longue = faits.evolutionLongue;
    faq.push({
      question: t("faq.tendance.question", { nom }),
      reponse: t("faq.tendance.reponse", {
        nom,
        tendance: faits.tendance,
        evo: formatEvo(faits.evolution1an, t, ""),
        aLongue: String(Boolean(longue && faits.typeReference)),
        type: faits.typeReference ?? "M",
        depuis: String(longue?.depuis ?? ""),
        jusqua: String(longue?.jusqua ?? ""),
        evoLongue: longue ? formatEvo(longue.pct, t, "") : "",
      }),
    });
  }
  if (faits?.positionVoisines && faits.prixReference && faits.medianeVoisines && faits.typeReference) {
    faq.push({
      question: t("faq.voisines.question", { nom }),
      reponse: t("faq.voisines.reponse", {
        nom,
        position: faits.positionVoisines,
        prix: faits.prixReference,
        mediane: faits.medianeVoisines,
        n: faits.nbVoisinesComparees,
        ecart: pct(faits.ecartVoisinesPct ?? 0, t),
        type: faits.typeReference,
      }),
    });
  }
  if (loyers?.loyer_m2_appartement && faq.length < FAQ_MAX - 1) {
    const loyerT2 = Math.round(
      (loyers.loyer_m2_appt_t1_t2 ?? loyers.loyer_m2_appartement) * 45
    );
    faq.push({
      question: t("faq.loyer.question", { nom }),
      reponse: t("faq.loyer.reponse", {
        nom,
        loyerM2: loyers.loyer_m2_appartement,
        millesime: String(loyers.millesime),
        loyerT2,
      }),
    });
  }
  faq.push({
    question: t("faq.estimer.question", { nom }),
    reponse: t("faq.estimer.reponse"),
  });

  return faq.slice(0, FAQ_MAX);
}

/** Libellé du type de bien de référence, pour les tableaux. */
export function libelleType(type: TypeLocal, t: TraducteurCommune): string {
  return type === "A" ? t("annees.appart") : t("annees.maison");
}
